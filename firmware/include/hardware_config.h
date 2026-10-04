#pragma once

// Provisional, unconfirmed Q6 assumptions. Replace these only after the
// assembled board and sensor module models have been verified.
// Assumed board: classic ESP32 DevKit.
// All module/formula/range values below are Q6/TDS provisional assumptions.
namespace HardwareConfig {

constexpr char kQ6ProvisionalPhModule[] = "Analog pH module (exact model unconfirmed)";
constexpr char kQ6ProvisionalTdsModule[] = "Analog TDS module (exact model and range unconfirmed)";
constexpr char kQ6ProvisionalTdsFormula[] = "Gravity-style polynomial (unconfirmed)";
constexpr char kQ6ProvisionalTemperatureSensor[] = "DS18B20 (exact probe/model unconfirmed)";

constexpr int kPhPin = 34;
constexpr int kTdsPin = 35;
constexpr int kTemperaturePin = 4;
constexpr int kTdsPowerPin = 25;
constexpr int kLedPin = 2;
constexpr int kProvisionPin = 0;
constexpr float kQ6ProvisionalTdsCubicCoefficient = 133.42F;
constexpr float kQ6ProvisionalTdsQuadraticCoefficient = -255.86F;
constexpr float kQ6ProvisionalTdsLinearCoefficient = 857.39F;
constexpr float kQ6ProvisionalTdsOutputScale = 0.5F;
constexpr float kQ6ProvisionalTdsTempCompensationCoefficient = 0.02F;
constexpr float kQ6ProvisionalTdsTempReferenceC = 25.0F;
constexpr float kQ6ProvisionalTemporaryTdsMaxPpm = 5000.0F;
constexpr float kDefaultTemperatureOffsetC = 0.0F;

}
