/*
 * Tes sensor JagoFarm, kalibrasi manual. Tanpa WiFi, tanpa backend, tanpa input Serial.
 * Nilai sensor ditampilkan di Serial Monitor (115200 baud) tiap sekitar 2 detik.
 *
 * Pin dan rumus sama dengan firmware (firmware/src/main.cpp, include/hardware_config.h):
 *   pH     : GPIO34 (ADC1)
 *   TDS    : GPIO35 (ADC1)
 *   DS18B20: GPIO4 + pull-up 4,7 kOhm ke 3,3 V
 *   Daya TDS (varian paket): GPIO25
 *
 * Persiapan: board "ESP32 Dev Module" (core esp32 3.x), library OneWire dan DallasTemperature.
 * Folder dan nama file sketch ini harus sama (sensor_test_manual).
 *
 * Cara kalibrasi pH manual:
 *   1. Upload sketch ini. pH langsung tampil memakai nilai bawaan di bawah, tetapi nilai itu
 *      hanya titik awal dan hampir pasti belum cocok dengan probe dan modulmu.
 *   2. Celup probe ke buffer 7,00, tunggu angka tegangan (V) stabil 1 sampai 2 menit, catat angkanya.
 *   3. Bilas dengan air suling, celup ke buffer 4,00, tunggu stabil, catat angkanya.
 *   4. Isi PH_V7 dan PH_V4 di bawah dengan dua angka itu, upload ulang, lalu cek lagi di kedua buffer.
 *      Hasilnya harus mendekati 7,00 dan 4,00. Ulangi kalau masih meleset.
 *   5. Angka PH_V7 dan PH_V4 yang sama diisi di portal provisioning firmware utama.
 *
 * Ukur dulu keluaran modul dengan multimeter. Jangan sambung ke pin ESP32 kalau lebih dari 3,3 V.
 */

#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <algorithm>
#include <array>
#include <cmath>

// ============================ PENGATURAN ============================
// Sensor yang terpasang (1 = ada, 0 = tidak ada).
#define HAS_PH 1
#define HAS_TDS 1
#define HAS_TEMP 1

// 1 kalau daya modul TDS disambung lewat GPIO25 (varian paket). 0 kalau modul TDS selalu menyala.
#define TDS_POWER_SWITCH 0

// Kalibrasi pH dalam volt. Ubah dua angka ini sesuai hasil pembacaan di buffer.
//   PH_V7 = tegangan di buffer pH 7,00
//   PH_V4 = tegangan di buffer pH 4,00
// Angka bawaan di bawah adalah perkiraan umum modul pH analog 5V, bukan hasil kalibrasi probe kamu.
const float PH_V7 = 2.50F;
const float PH_V4 = 3.04F;

// Faktor kalibrasi TDS (k = nilai larutan standar / nilai terbaca). Bawaan 1.0.
const float TDS_K = 1.0F;

// Offset suhu DS18B20 dalam derajat Celsius. Bawaan 0.0.
const float TEMP_OFFSET_C = 0.0F;
// ====================================================================

constexpr int kPhPin = 34;
constexpr int kTdsPin = 35;
constexpr int kTemperaturePin = 4;
constexpr int kTdsPowerPin = 25;
constexpr uint32_t kLoopDelayMs = 500;
constexpr float kAdcWarnHighV = 3.0F;
constexpr float kAdcWarnLowV = 0.05F;
constexpr float kTdsMaxPpm = 1000.0F;
constexpr float kReferenceTempC = 25.0F;
constexpr float kDefaultPhV7 = 2.50F;
constexpr float kDefaultPhV4 = 3.04F;

#if HAS_TEMP
OneWire oneWire(kTemperaturePin);
DallasTemperature temperatureSensor(&oneWire);
#endif

// Median dari 15 pembacaan dengan jeda 20 ms, sama seperti firmware.
float medianVoltage(int pin) {
  std::array<uint32_t, 15> readings{};
  for (uint32_t& reading : readings) {
    reading = analogReadMilliVolts(pin);
    delay(20);
  }
  std::sort(readings.begin(), readings.end());
  return static_cast<float>(readings[readings.size() / 2]) / 1000.0F;
}

void printVoltageNote(float volts) {
  if (volts > kAdcWarnHighV) Serial.print(" [dekat batas ADC, cek tegangan modul]");
  else if (volts < kAdcWarnLowV) Serial.print(" [hampir 0 V, cek kabel dan catu daya]");
}

#if HAS_TEMP
bool readTemperature(float& value) {
  temperatureSensor.requestTemperatures();
  const float raw = temperatureSensor.getTempCByIndex(0);
  if (!std::isfinite(raw) || raw == DEVICE_DISCONNECTED_C) {
    Serial.println("Suhu : DS18B20 tidak terbaca (-127). Cek kabel data GPIO4 dan resistor pull-up 4,7 kOhm.");
    return false;
  }
  if (raw == 85.0F) {
    Serial.println("Suhu : 85.00 C adalah nilai awal saat menyala, bukan suhu air. Pembacaan dilewati.");
    return false;
  }
  value = raw + TEMP_OFFSET_C;
  Serial.printf("Suhu : raw=%.2f C, offset=%+.2f C, hasil=%.2f C\n", raw, TEMP_OFFSET_C, value);
  return true;
}
#endif

#if HAS_PH
void readPh() {
  const float volts = medianVoltage(kPhPin);
  Serial.printf("pH   : %.3f V", volts);
  printVoltageNote(volts);
  if (!(PH_V7 > 0.0F && PH_V4 > 0.0F && PH_V7 != PH_V4)) {
    Serial.println("  ->  PH_V7 dan PH_V4 harus lebih dari 0 dan tidak sama");
    return;
  }
  const float ph = 7.0F + (volts - PH_V7) * (4.0F - 7.0F) / (PH_V4 - PH_V7);
  Serial.printf("  ->  pH %.2f", ph);
  if (!std::isfinite(ph) || ph < 0.0F || ph > 14.0F) Serial.print(" [di luar 0 sampai 14, firmware akan menolak sampel ini]");
  Serial.printf("  (V7=%.3f, V4=%.3f)", PH_V7, PH_V4);
  if (PH_V7 == kDefaultPhV7 && PH_V4 == kDefaultPhV4) Serial.print(" [nilai bawaan, belum dikalibrasi]");
  Serial.println();
}
#endif

#if HAS_TDS
void readTds(float temperatureC) {
  const float volts = medianVoltage(kTdsPin);
  Serial.printf("TDS  : %.3f V", volts);
  printVoltageNote(volts);
  const float compensation = 1.0F + 0.02F * (temperatureC - kReferenceTempC);
  if (compensation <= 0.0F || TDS_K <= 0.0F) {
    Serial.println("  ->  suhu atau faktor k tidak valid");
    return;
  }
  const float v = volts / compensation;
  const float ppm = (133.42F * v * v * v - 255.86F * v * v + 857.39F * v) * 0.5F * TDS_K;
  Serial.printf("  ->  %.0f ppm (suhu kompensasi %.1f C", ppm, temperatureC);
#if !HAS_TEMP
  Serial.print(", tanpa sensor suhu");
#endif
  Serial.print(")");
  if (!std::isfinite(ppm) || ppm < 0.0F || ppm > kTdsMaxPpm) Serial.print("  [di luar 0 sampai 1000 ppm, firmware akan menolak sampel ini]");
  Serial.println();
}
#endif

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Tes sensor JagoFarm (kalibrasi manual) ===");
#if HAS_PH
  analogSetPinAttenuation(kPhPin, ADC_11db);
  Serial.printf("Kalibrasi pH di kode: PH_V7=%.3f V, PH_V4=%.3f V\n", PH_V7, PH_V4);
#endif
#if HAS_TDS
  analogSetPinAttenuation(kTdsPin, ADC_11db);
#endif
#if HAS_TDS && TDS_POWER_SWITCH
  pinMode(kTdsPowerPin, OUTPUT);
  digitalWrite(kTdsPowerPin, LOW);
#endif
#if HAS_TEMP
  temperatureSensor.begin();
  temperatureSensor.setResolution(12);
  Serial.printf("DS18B20 ditemukan: %d\n", temperatureSensor.getDeviceCount());
#endif
  Serial.println("Nilai tampil tiap sekitar 2 detik.");
  Serial.println();
}

void loop() {
  Serial.printf("--- %lu detik ---\n", static_cast<unsigned long>(millis() / 1000UL));
  float temperature = kReferenceTempC;
#if HAS_TEMP
  if (!readTemperature(temperature)) temperature = kReferenceTempC;
#endif
#if HAS_TDS && TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, LOW);
#endif
#if HAS_PH
  readPh();
#endif
#if HAS_TDS
#if TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, HIGH);
  delay(500);
#endif
  readTds(temperature);
#if TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, LOW);
#endif
#endif
  Serial.println();
  delay(kLoopDelayMs);
}
