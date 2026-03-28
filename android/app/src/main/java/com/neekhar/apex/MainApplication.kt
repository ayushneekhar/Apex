package com.neekhar.apex

import android.app.Application
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import java.io.File

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.margelo.nitro.nitroota.utils.CrashHandler
import com.margelo.nitro.nitroota.utils.PreferencesUtils
import org.json.JSONObject

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {
  private val nitroOtaPreferencesSuiteName = "NitroOtaPrefs"
  private val nitroOtaBinaryFingerprintKey = "apex_nitro_ota_last_seen_binary_fingerprint"

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override fun getJSBundleFile(): String? = getSafeNitroOtaBundlePath()

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }

  private fun getSafeNitroOtaBundlePath(): String? {
    CrashHandler.install(this)

    val sharedPreferences = getSharedPreferences(nitroOtaPreferencesSuiteName, MODE_PRIVATE)
    resetNitroOtaForBinaryChangeIfNeeded(sharedPreferences)

    val preferences = PreferencesUtils.create(this)
    val storedPath = preferences.getOtaUnzippedPath()

    if (storedPath.isNullOrEmpty()) {
      return null
    }

    val bundleFile = File(storedPath)
    if (bundleFile.isFile) {
      return storedPath
    }

    clearNitroOtaCacheAfterMissingBundle(preferences, storedPath)
    return null
  }

  private fun resetNitroOtaForBinaryChangeIfNeeded(sharedPreferences: SharedPreferences) {
    val currentFingerprint = getCurrentBinaryFingerprint()
    val previousFingerprint = sharedPreferences.getString(nitroOtaBinaryFingerprintKey, null)

    if (previousFingerprint == currentFingerprint) {
      return
    }

    clearNitroOtaCache(sharedPreferences)
    sharedPreferences.edit().putString(nitroOtaBinaryFingerprintKey, currentFingerprint).apply()
  }

  private fun getCurrentBinaryFingerprint(): String {
    return try {
      val packageInfo = packageManager.getPackageInfo(packageName, 0)
      val versionName = packageInfo.versionName ?: "unknown"
      val versionCode =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          packageInfo.longVersionCode
        } else {
          @Suppress("DEPRECATION")
          packageInfo.versionCode.toLong()
        }
      val lastUpdateTime = packageInfo.lastUpdateTime

      "$versionName|$versionCode|$lastUpdateTime"
    } catch (_: PackageManager.NameNotFoundException) {
      "unknown"
    }
  }

  private fun clearNitroOtaCache(sharedPreferences: SharedPreferences) {
    clearNitroOtaPreferenceKeys(sharedPreferences)

    try {
      val otaDirs = filesDir.listFiles { file ->
        file.isDirectory && file.name.startsWith("ota_unzipped_")
      } ?: emptyArray()

      otaDirs.forEach { dir ->
        runCatching { dir.deleteRecursively() }
      }
    } catch (_: Exception) {
      // Continue startup even if cleanup is partial.
    }
  }

  private fun clearNitroOtaPreferenceKeys(sharedPreferences: SharedPreferences) {
    val otaKeyPrefixes = listOf(
      "ota_unzipped_path_",
      "ota_version_",
      "ota_update_download_url_",
      "ota_update_version_check_url_",
      "ota_bundle_name_",
      "ota_previous_unzipped_path_",
      "ota_previous_version_",
      "ota_rollback_count_",
      "ota_blacklisted_versions_",
      "ota_rollback_history_",
      "ota_pending_validation_",
      "ota_notified_rollback_count_"
    )

    val editor = sharedPreferences.edit()
    sharedPreferences.all.keys
      .filter { key -> otaKeyPrefixes.any(key::startsWith) }
      .forEach(editor::remove)
    editor.apply()
  }

  private fun clearNitroOtaCacheAfterMissingBundle(
    preferences: PreferencesUtils,
    missingBundlePath: String
  ) {
    val otaVersion = preferences.getOtaVersion()
    val previousOtaVersion = preferences.getPreviousVersion()
    val bundleName = try {
      File(missingBundlePath).name
    } catch (_: Exception) {
      null
    }

    try {
      writeNitroOtaStartupRecoveryStatus(
        reason = "missing_bundle_file",
        otaVersion = otaVersion,
        previousOtaVersion = previousOtaVersion,
        missingBundlePath = missingBundlePath,
        bundleName = bundleName
      )
    } catch (_: Exception) {
      // Never block startup recovery on status reporting.
    }

    try {
      preferences.clearOtaData()
    } catch (_: Exception) {
      // Continue deleting files even if prefs cleanup fails.
    }

    try {
      val otaDirs = filesDir.listFiles { file ->
        file.isDirectory && file.name.startsWith("ota_unzipped_")
      } ?: emptyArray()

      otaDirs.forEach { dir ->
        runCatching { dir.deleteRecursively() }
      }
    } catch (_: Exception) {
      // Fallback to embedded bundle even if cleanup is partial.
    }
  }

  private fun writeNitroOtaStartupRecoveryStatus(
    reason: String,
    otaVersion: String?,
    previousOtaVersion: String?,
    missingBundlePath: String,
    bundleName: String?
  ) {
    val statusFile = File(filesDir, "nitro-ota-startup-recovery.json")
    val payload = JSONObject()
      .put("reason", reason)
      .put("otaVersion", otaVersion ?: JSONObject.NULL)
      .put("previousOtaVersion", previousOtaVersion ?: JSONObject.NULL)
      .put("missingBundlePath", missingBundlePath)
      .put("bundleName", bundleName ?: JSONObject.NULL)
      .put("detectedAtMs", System.currentTimeMillis())
      .put(
        "message",
        "A downloaded OTA update could not be loaded. Nitro OTA cache was cleared and the app fell back to the embedded bundle."
      )

    statusFile.writeText(payload.toString())
  }
}
