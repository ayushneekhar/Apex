package expo.modules.crisphaptics

import android.content.Context
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Short, sharp haptics using the actuator's calibrated effects: Composition
 * primitives on API 30+ (closest to iOS Taptic feedback), predefined effects on
 * API 29. Unlike long waveforms, these don't feel like an old buzzing motor.
 */
class CrispHapticsModule : Module() {
  private data class Primitive(val id: Int, val scale: Float, val delayMs: Int = 0)

  private data class Effect(val primitives: List<Primitive>, val predefinedFallback: Int)

  private val effects = mapOf(
    "tick" to Effect(
      listOf(Primitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.6f)),
      VibrationEffect.EFFECT_TICK
    ),
    "click" to Effect(
      listOf(Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.6f)),
      VibrationEffect.EFFECT_CLICK
    ),
    "heavy-click" to Effect(
      listOf(Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1.0f)),
      VibrationEffect.EFFECT_HEAVY_CLICK
    ),
    "double-click" to Effect(
      listOf(
        Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.5f),
        Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1.0f, 90)
      ),
      VibrationEffect.EFFECT_DOUBLE_CLICK
    ),
    "error" to Effect(
      listOf(
        Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.8f),
        Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.8f, 70),
        Primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1.0f, 70)
      ),
      VibrationEffect.EFFECT_HEAVY_CLICK
    )
  )

  private val vibrator: Vibrator?
    get() {
      val context = appContext.reactContext ?: return null
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      }
    }

  override fun definition() = ModuleDefinition {
    Name("CrispHaptics")

    Function("play") { effectName: String ->
      play(effectName)
    }
  }

  private fun play(effectName: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
    val effect = effects[effectName] ?: return false

    return try {
      val vibrator = vibrator ?: return false
      if (!vibrator.hasVibrator()) return false

      val primitiveIds = effect.primitives.map { it.id }.distinct().toIntArray()
      val vibrationEffect =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && vibrator.areAllPrimitivesSupported(*primitiveIds)) {
          val composition = VibrationEffect.startComposition()
          effect.primitives.forEach { composition.addPrimitive(it.id, it.scale, it.delayMs) }
          composition.compose()
        } else {
          VibrationEffect.createPredefined(effect.predefinedFallback)
        }

      // Touch usage follows the system "touch feedback" intensity setting.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        vibrator.vibrate(vibrationEffect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH))
      } else {
        vibrator.vibrate(vibrationEffect)
      }
      true
    } catch (e: Exception) {
      Log.w("CrispHaptics", "Failed to play '$effectName'", e)
      false
    }
  }
}
