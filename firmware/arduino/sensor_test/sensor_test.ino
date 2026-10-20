/*
 * Tes sensor JagoFarm untuk Arduino IDE. Tanpa WiFi, tanpa backend.
 * Nilai sensor ditampilkan di Serial Monitor (115200 baud) tiap sekitar 2 detik.
 *
 * Pin dan rumus sama dengan firmware (firmware/src/main.cpp, include/hardware_config.h):
 *   pH     : GPIO34 (ADC1)
 *   TDS    : GPIO35 (ADC1)
 *   DS18B20: GPIO4 + pull-up 4,7 kOhm ke 3,3 V
 *   Daya TDS (varian paket): GPIO25
 *
 * Persiapan: board "ESP32 Dev Module" (core esp32 3.x), library OneWire dan DallasTemperature.
 * Folder dan nama file sketch ini harus sama (sensor_test).
 *
 * Kalibrasi pH dari Serial Monitor (tanpa edit kode dan tanpa upload ulang):
 *   1. Ukur dulu keluaran modul pH dengan multimeter. Jangan sambung ke pin ESP32 kalau lebih dari 3,3 V.
 *   2. Celup probe ke buffer 7,00, tunggu angka V stabil (1 sampai 2 menit), ketik 7 lalu Enter.
 *   3. Bilas probe dengan air suling, celup ke buffer 4,00, tunggu stabil, ketik 4 lalu Enter.
 *   4. Setelah dua titik tersimpan, pH tampil langsung. Angka V7 dan V4 yang dicetak itu
 *      diisi juga di portal provisioning firmware utama.
 *   Kalibrasi disimpan di flash ESP32 (namespace "sensortest", terpisah dari firmware utama)
 *   dan tetap ada setelah dicabut. Ketik r untuk menghapusnya.
 */

#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <Preferences.h>
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

// Nilai awal kalibrasi pH dalam volt, dipakai hanya kalau flash belum berisi kalibrasi.
// Biarkan 0.0 dan kalibrasi lewat Serial Monitor.
const float PH_V7 = 0.0F;
const float PH_V4 = 0.0F;

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
constexpr int kCaptureSamples = 15;
constexpr float kMinBufferGapV = 0.05F;
constexpr float kUnstableSpreadV = 0.03F;

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

#if HAS_PH
float phV7 = PH_V7;
float phV4 = PH_V4;
Preferences calibrationStore;

bool phCalibrated() {
  return std::isfinite(phV7) && std::isfinite(phV4) && phV7 > 0.0F && phV4 > 0.0F && phV7 != phV4;
}

void loadPhCalibration() {
  calibrationStore.begin("sensortest", false);
  const float storedV7 = calibrationStore.getFloat("ph_v7", 0.0F);
  const float storedV4 = calibrationStore.getFloat("ph_v4", 0.0F);
  calibrationStore.end();
  if (storedV7 > 0.0F) phV7 = storedV7;
  if (storedV4 > 0.0F) phV4 = storedV4;
}

void savePhCalibration() {
  calibrationStore.begin("sensortest", false);
  calibrationStore.putFloat("ph_v7", phV7);
  calibrationStore.putFloat("ph_v4", phV4);
  calibrationStore.end();
}

void clearPhCalibration() {
  calibrationStore.begin("sensortest", false);
  calibrationStore.clear();
  calibrationStore.end();
  phV7 = PH_V7;
  phV4 = PH_V4;
}

void printCalibrationHelp() {
  Serial.println("Perintah pH (ketik di kolom atas Serial Monitor lalu Enter):");
  Serial.println("  7 = simpan tegangan sekarang sebagai buffer pH 7,00");
  Serial.println("  4 = simpan tegangan sekarang sebagai buffer pH 4,00");
  Serial.println("  r = hapus kalibrasi pH");
  Serial.println("  ? = tampilkan bantuan ini");
}

// Rata-rata beberapa median supaya angka kalibrasi tidak ikut noise sesaat.
void captureVoltage(float& average, float& spread) {
#if HAS_TDS && TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, LOW);
#endif
  float sum = 0.0F;
  float low = 99.0F;
  float high = 0.0F;
  for (int index = 0; index < kCaptureSamples; ++index) {
    const float volts = medianVoltage(kPhPin);
    sum += volts;
    low = std::min(low, volts);
    high = std::max(high, volts);
  }
  average = sum / static_cast<float>(kCaptureSamples);
  spread = high - low;
}

void captureBuffer(float& target, const char* label, float otherValue) {
  Serial.printf("Mengambil sampel buffer %s (sekitar 5 detik). Jangan gerakkan probe.\n", label);
  float average = 0.0F;
  float spread = 0.0F;
  captureVoltage(average, spread);
  if (average < kAdcWarnLowV) {
    Serial.println("Tegangan hampir 0 V. Kalibrasi dibatalkan, cek kabel dan probe.");
    return;
  }
  if (otherValue > 0.0F && std::fabs(average - otherValue) < kMinBufferGapV) {
    Serial.println("Selisih V7 dan V4 kurang dari 0,05 V. Kalibrasi dibatalkan. Pastikan probe sudah pindah ke buffer yang lain.");
    return;
  }
  target = average;
  savePhCalibration();
  Serial.printf("Tersimpan: buffer %s = %.4f V (selisih min-max %.4f V)\n", label, average, spread);
  if (spread > kUnstableSpreadV) {
    Serial.println("Angka belum stabil. Tunggu probe lebih lama di buffer, lalu ketik perintah yang sama lagi.");
  }
  if (phCalibrated()) {
    Serial.printf("Kalibrasi lengkap. Isi di portal firmware: V7=%.4f dan V4=%.4f\n", phV7, phV4);
  } else {
    Serial.println("Tinggal satu buffer lagi.");
  }
}

void handleSerial() {
  while (Serial.available()) {
    const char command = static_cast<char>(Serial.read());
    if (command == '7') {
      captureBuffer(phV7, "7,00", phV4);
    } else if (command == '4') {
      captureBuffer(phV4, "4,00", phV7);
    } else if (command == 'r' || command == 'R') {
      clearPhCalibration();
      Serial.println("Kalibrasi pH dihapus.");
    } else if (command == '?') {
      printCalibrationHelp();
    }
  }
}

void readPh() {
  const float volts = medianVoltage(kPhPin);
  Serial.printf("pH   : %.3f V", volts);
  printVoltageNote(volts);
  if (phCalibrated()) {
    const float ph = 7.0F + (volts - phV7) * (4.0F - 7.0F) / (phV4 - phV7);
    if (std::isfinite(ph) && ph >= 0.0F && ph <= 14.0F) Serial.printf("  ->  pH %.2f", ph);
    else Serial.printf("  ->  pH %.2f (di luar 0 sampai 14, firmware akan menolak sampel ini)", ph);
  } else {
    Serial.print("  ->  belum dikalibrasi (ketik 7 di buffer 7,00, lalu 4 di buffer 4,00)");
  }
  Serial.println();
}
#else
void handleSerial() {}
#endif

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
  Serial.println("=== Tes sensor JagoFarm ===");
#if HAS_PH
  analogSetPinAttenuation(kPhPin, ADC_11db);
  loadPhCalibration();
  if (phCalibrated()) Serial.printf("Kalibrasi pH tersimpan: V7=%.4f V, V4=%.4f V\n", phV7, phV4);
  else Serial.println("Kalibrasi pH belum ada.");
  printCalibrationHelp();
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
  handleSerial();
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
  const uint32_t waitUntil = millis() + kLoopDelayMs;
  while (millis() < waitUntil) {
    handleSerial();
    delay(10);
  }
}
