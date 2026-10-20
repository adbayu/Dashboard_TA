#pragma once

// Current assembled inventory: ESP32 DevKit V1, PH-4502C, DS18B20, and TDS Meter V1.0.
// The TDS conversion coefficients remain provisional pending calibration on the assembled module.
namespace HardwareConfig {

constexpr char kConfirmedPhModule[] = "pH Meter Module PH-4502C with probe";
constexpr char kConfirmedTdsModule[] = "TDS Meter V1.0";
constexpr char kQ6ProvisionalTdsFormula[] = "Gravity-style polynomial (unconfirmed)";
constexpr char kConfirmedTemperatureSensor[] = "DS18B20 water-temperature sensor";

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
constexpr float kTdsMaximumPpm = 1000.0F;
constexpr float kDefaultTemperatureOffsetC = 0.0F;
// Nilai pH buffer untuk kalibrasi dua titik. Kolom V7 di portal menyimpan tegangan pada titik
// netral (6,86) dan kolom V4 pada titik asam (4,00). Nama V7 dipertahankan supaya NVS lama tetap terbaca.
constexpr float kPhNeutralBufferPh = 6.86F;
constexpr float kPhAcidBufferPh = 4.00F;
constexpr float kQ6ProvisionalPhFallbackV7 = 2.5F;
constexpr float kQ6ProvisionalPhFallbackV4 = 3.04F;

}
