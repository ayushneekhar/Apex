package com.anonymous.Apex

import android.app.Application
import android.content.res.Configuration
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
