#include <Arduino.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <OneWire.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <algorithm>
#include <climits>
#include <cstddef>
#include <array>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <sys/time.h>
#include <time.h>
#include <vector>
#include <esp_system.h>
#include "hardware_config.h"
#include "root_ca.h"

#ifndef JF_TYPE
#error JF_TYPE harus diatur oleh environment PlatformIO
#endif
#ifndef JF_HAS_PH
#error JF_HAS_PH harus diatur oleh environment PlatformIO
#endif
#ifndef JF_HAS_TDS
#error JF_HAS_TDS harus diatur oleh environment PlatformIO
#endif
#ifndef JF_HAS_TEMP
#error JF_HAS_TEMP harus diatur oleh environment PlatformIO
#endif
#ifndef JF_HAS_TDS_POWER_SWITCH
#define JF_HAS_TDS_POWER_SWITCH 0
#endif

namespace {
constexpr int kPhPin = HardwareConfig::kPhPin;
constexpr int kTdsPin = HardwareConfig::kTdsPin;
constexpr int kTemperaturePin = HardwareConfig::kTemperaturePin;
constexpr int kTdsPowerPin = HardwareConfig::kTdsPowerPin;
constexpr int kLedPin = HardwareConfig::kLedPin;
constexpr int kProvisionPin = HardwareConfig::kProvisionPin;
constexpr uint32_t kSampleIntervalMs = 30000;
constexpr uint32_t kSendIntervalMs = 30000;
constexpr uint32_t kMaxRetryMs = 300000;
constexpr uint32_t kInitialRetryMs = 5000;
constexpr uint32_t kSuccessLedPulseMs = 120;
constexpr size_t kMaxMessagesPerSendCycle = 2;  // 20 devices × 4 requests/min stays below the 120/min IP limit.
constexpr size_t kMaxQueueRecords = 5760;
constexpr char kFirmwareVersion[] = "0.4.0";
constexpr char kQueueDirectory[] = "/queue";
constexpr int8_t kRssiUnknown = INT8_MIN;
constexpr size_t kLegacyRecordBytes = 36;

#if JF_HAS_TEMP
OneWire oneWire(kTemperaturePin);
DallasTemperature temperatureSensor(&oneWire);
#endif

#pragma pack(push, 1)
struct StoredSample {
  uint8_t messageId[16];
  uint64_t measuredAtMs;
  float values[3];
  // RSSI disimpan saat sampel diukur supaya setiap retry mengirim meta yang sama persis (ADR-0012).
  int8_t rssi;
  uint8_t reserved[3];
};
#pragma pack(pop)
static_assert(sizeof(StoredSample) == 40, "Record LittleFS harus tetap 40 byte");
static_assert(offsetof(StoredSample, rssi) == kLegacyRecordBytes, "Record lama 36 byte harus tetap terbaca");

struct DeviceConfig {
  String apiUrl;
  String deviceId;
  String credential;
  float phV7{0.0F};
  float phV4{0.0F};
  float tdsFactor{1.0F};
  float temperatureOffsetC{HardwareConfig::kDefaultTemperatureOffsetC};
};

enum class DeviceState : uint8_t { provisioning, connecting, waitingForTime, running, halted, error };
DeviceConfig config;
DeviceState state = DeviceState::connecting;
uint32_t lastSampleAt = 0;
uint32_t lastSendAt = 0;
uint32_t nextRetryAt = 0;
uint32_t retryDelayMs = kInitialRetryMs;
uint32_t lastReconnectAt = 0;
uint32_t lastNtpSyncAt = 0;
uint32_t ledChangedAt = 0;
uint32_t lastSuccessAt = 0;
uint8_t ledStep = 0;
bool ledOn = false;

bool isHexSecret(const String& value) {
  if (value.length() != 64) return false;
  for (size_t index = 0; index < value.length(); ++index) {
    const char ch = value[index];
    if (!((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f'))) return false;
  }
  return true;
}

bool isUuid(const String& value) {
  if (value.length() != 36) return false;
  for (size_t index = 0; index < value.length(); ++index) {
    const char ch = value[index];
    if (index == 8 || index == 13 || index == 18 || index == 23) {
      if (ch != '-') return false;
    } else if (!((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F'))) {
      return false;
    }
  }
  return true;
}

String normalizedUrl(String value) {
  value.trim();
  while (value.endsWith("/")) value.remove(value.length() - 1);
  return value;
}

bool isLoopbackHost(String authority) {
  if (authority.indexOf('@') >= 0) return false;
  if (authority.startsWith("[")) {
    const int close = authority.indexOf(']');
    return close > 0 && authority.substring(0, close + 1) == "[::1]";
  }
  const int colon = authority.indexOf(':');
  if (colon >= 0) authority = authority.substring(0, colon);
  return authority == "localhost" || authority == "127.0.0.1";
}

bool validApiUrl(const String& input) {
  const String value = normalizedUrl(input);
  if (value.indexOf('?') >= 0 || value.indexOf('#') >= 0) return false;
  if (value.startsWith("https://")) {
    const String authority = value.substring(8).substring(0, value.substring(8).indexOf('/') < 0 ? value.length() - 8 : value.substring(8).indexOf('/'));
    return authority.length() > 0 && authority.indexOf('@') < 0;
  }
  if (!value.startsWith("http://")) return false;
  const String rest = value.substring(7);
  const int slash = rest.indexOf('/');
  const String authority = slash < 0 ? rest : rest.substring(0, slash);
  return isLoopbackHost(authority);
}

bool hasProvisioning(const DeviceConfig& value) {
  return validApiUrl(value.apiUrl) && isUuid(value.deviceId) && isHexSecret(value.credential);
}

DeviceConfig loadConfig() {
  DeviceConfig result;
  Preferences preferences;
  preferences.begin("jagofarm", true);
  result.apiUrl = preferences.getString("api_url", "");
  result.deviceId = preferences.getString("device_id", "");
  result.credential = preferences.getString("credential", "");
  result.phV7 = preferences.getFloat("ph_v7", 0.0F);
  result.phV4 = preferences.getFloat("ph_v4", 0.0F);
  result.tdsFactor = preferences.getFloat("tds_factor", 1.0F);
  result.temperatureOffsetC = preferences.getFloat("temp_offset_c", HardwareConfig::kDefaultTemperatureOffsetC);
  preferences.end();
  if (!std::isfinite(result.temperatureOffsetC)) {
    result.temperatureOffsetC = HardwareConfig::kDefaultTemperatureOffsetC;
  }
  return result;
}

void saveConfig(const DeviceConfig& value) {
  Preferences preferences;
  preferences.begin("jagofarm", false);
  preferences.putString("api_url", normalizedUrl(value.apiUrl));
  preferences.putString("device_id", value.deviceId);
  preferences.putString("credential", value.credential);
  preferences.putFloat("ph_v7", value.phV7);
  preferences.putFloat("ph_v4", value.phV4);
  preferences.putFloat("tds_factor", value.tdsFactor);
  preferences.putFloat("temp_offset_c", value.temperatureOffsetC);
  preferences.end();
}

String setupApName() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return "JagoFarm-Setup-" + mac.substring(mac.length() > 4 ? mac.length() - 4 : 0);
}

bool runProvisioning(DeviceConfig& value) {
  state = DeviceState::provisioning;
  WiFi.mode(WIFI_STA);
  WiFiManager manager;
  manager.setDebugOutput(false);
  manager.setConfigPortalTimeout(300);
  String apiUrl = value.apiUrl;
  String deviceId = value.deviceId;
  String phV7 = value.phV7 > 0 ? String(value.phV7, 4) : "";
  String phV4 = value.phV4 > 0 ? String(value.phV4, 4) : "";
  String tdsFactor = String(value.tdsFactor, 4);
  String temperatureOffsetC = String(value.temperatureOffsetC, 2);
  WiFiManagerParameter apiUrlParameter("api_url", "URL API", apiUrl.c_str(), 128);
  WiFiManagerParameter deviceIdParameter("device_id", "ID device", deviceId.c_str(), 37);
  WiFiManagerParameter credentialParameter("credential", "Credential device 64 hex", "", 65, "type='password'");
  WiFiManagerParameter phV7Parameter("ph_v7", "Kalibrasi pH buffer 7,00 V7 volt", phV7.c_str(), 16);
  WiFiManagerParameter phV4Parameter("ph_v4", "Kalibrasi pH buffer 4,00 V4 volt", phV4.c_str(), 16);
  WiFiManagerParameter tdsFactorParameter("tds_k", "Faktor kalibrasi TDS k", tdsFactor.c_str(), 16);
  WiFiManagerParameter temperatureOffsetParameter("temp_offset_c", "Offset suhu DS18B20 (C)", temperatureOffsetC.c_str(), 16);
  manager.addParameter(&apiUrlParameter);
  manager.addParameter(&deviceIdParameter);
  manager.addParameter(&credentialParameter);
  manager.addParameter(&phV7Parameter);
  manager.addParameter(&phV4Parameter);
  manager.addParameter(&tdsFactorParameter);
  manager.addParameter(&temperatureOffsetParameter);
  const String apName = setupApName();
  Serial.printf("Provisioning starts. Setup AP: %s\n", apName.c_str());
  if (!manager.startConfigPortal(apName.c_str())) return false;

  const String submittedApiUrl = apiUrlParameter.getValue();
  const String submittedDeviceId = deviceIdParameter.getValue();
  const String submittedCredential = credentialParameter.getValue();
  value.apiUrl = submittedApiUrl.length() ? normalizedUrl(submittedApiUrl) : value.apiUrl;
  value.deviceId = submittedDeviceId.length() ? submittedDeviceId : value.deviceId;
  value.credential = submittedCredential.length() ? submittedCredential : value.credential;
  if (phV7Parameter.getValue()[0] != '\0') value.phV7 = strtof(phV7Parameter.getValue(), nullptr);
  if (phV4Parameter.getValue()[0] != '\0') value.phV4 = strtof(phV4Parameter.getValue(), nullptr);
  if (tdsFactorParameter.getValue()[0] != '\0') value.tdsFactor = strtof(tdsFactorParameter.getValue(), nullptr);
  if (temperatureOffsetParameter.getValue()[0] != '\0') {
    const float submittedOffset = strtof(temperatureOffsetParameter.getValue(), nullptr);
    if (!std::isfinite(submittedOffset)) {
      Serial.println("Offset suhu tidak valid.");
      return false;
    }
    value.temperatureOffsetC = submittedOffset;
  }
  if (!hasProvisioning(value)) {
    Serial.println("Konfigurasi belum lengkap atau URL API tidak diizinkan.");
    return false;
  }
  saveConfig(value);
  return true;
}

bool provisionButtonHeld() {
  if (digitalRead(kProvisionPin) != LOW) return false;
  const uint32_t started = millis();
  while (digitalRead(kProvisionPin) == LOW && millis() - started < 5200) delay(10);
  return millis() - started >= 5000;
}

bool clockReady() {
  return time(nullptr) > 1735689600;
}

bool synchronizeClock() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  const uint32_t started = millis();
  while (!clockReady() && millis() - started < 15000) delay(200);
  if (clockReady()) {
    lastNtpSyncAt = millis();
    return true;
  }
  return false;
}

uint64_t currentTimeMs() {
  timeval now{};
  gettimeofday(&now, nullptr);
  return static_cast<uint64_t>(now.tv_sec) * 1000ULL + static_cast<uint64_t>(now.tv_usec / 1000);
}

String isoUtc(uint64_t milliseconds) {
  const time_t seconds = static_cast<time_t>(milliseconds / 1000ULL);
  tm utc{};
  gmtime_r(&seconds, &utc);
  char base[20]{};
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &utc);
  char result[32]{};
  snprintf(result, sizeof(result), "%s.%03uZ", base, static_cast<unsigned>(milliseconds % 1000ULL));
  return String(result);
}

float medianVoltage(int pin) {
  std::array<uint32_t, 15> readings{};
  for (uint32_t& reading : readings) {
    reading = analogReadMilliVolts(pin);
    delay(20);
  }
  std::sort(readings.begin(), readings.end());
  return static_cast<float>(readings[readings.size() / 2]) / 1000.0F;
}

bool readWaterTemperature(float& value) {
#if JF_HAS_TEMP
  temperatureSensor.requestTemperatures();
  const float measured = temperatureSensor.getTempCByIndex(0);
  const float corrected = measured + config.temperatureOffsetC;
  Serial.printf("DS18B20 raw=%.3f C offset=%+.3f C corrected=%.3f C\n", measured, config.temperatureOffsetC, corrected);
  if (!std::isfinite(measured) || measured == DEVICE_DISCONNECTED_C || measured == 85.0F || !std::isfinite(corrected)) return false;
  value = corrected;
  return true;
#else
  value = HardwareConfig::kQ6ProvisionalTdsTempReferenceC;
  return true;
#endif
}

bool readPh(float& value) {
#if JF_HAS_PH
  if (!std::isfinite(config.phV7) || !std::isfinite(config.phV4) || config.phV7 <= 0.0F || config.phV4 <= 0.0F || config.phV7 == config.phV4) return false;
  const float voltage = medianVoltage(kPhPin);
  const float measured = 7.0F + (voltage - config.phV7) * (4.0F - 7.0F) / (config.phV4 - config.phV7);
  if (!std::isfinite(measured) || measured < 0.0F || measured > 14.0F) return false;
  value = measured;
  return true;
#else
  value = 0.0F;
  return true;
#endif
}

bool readTds(float temperature, float& value) {
#if JF_HAS_TDS
  if (!std::isfinite(config.tdsFactor) || config.tdsFactor <= 0.0F) return false;
  const float voltage = medianVoltage(kTdsPin);
  const float compensation = 1.0F + HardwareConfig::kQ6ProvisionalTdsTempCompensationCoefficient *
      (temperature - HardwareConfig::kQ6ProvisionalTdsTempReferenceC);
  if (compensation <= 0.0F) return false;
  const float corrected = voltage / compensation;
  const float measured = (HardwareConfig::kQ6ProvisionalTdsCubicCoefficient * corrected * corrected * corrected +
      HardwareConfig::kQ6ProvisionalTdsQuadraticCoefficient * corrected * corrected +
      HardwareConfig::kQ6ProvisionalTdsLinearCoefficient * corrected) *
      HardwareConfig::kQ6ProvisionalTdsOutputScale * config.tdsFactor;
  if (!std::isfinite(measured) || measured < 0.0F || measured > HardwareConfig::kQ6ProvisionalTemporaryTdsMaxPpm) return false;
  value = measured;
  return true;
#else
  value = 0.0F;
  return true;
#endif
}

void makeMessageId(uint8_t* output) {
  for (size_t index = 0; index < 16; ++index) output[index] = static_cast<uint8_t>(esp_random() & 0xffU);
  output[6] = static_cast<uint8_t>((output[6] & 0x0fU) | 0x40U);
  output[8] = static_cast<uint8_t>((output[8] & 0x3fU) | 0x80U);
}

String uuidText(const uint8_t* value) {
  char result[37]{};
  snprintf(result, sizeof(result), "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    value[0], value[1], value[2], value[3], value[4], value[5], value[6], value[7],
    value[8], value[9], value[10], value[11], value[12], value[13], value[14], value[15]);
  return String(result);
}

String sampleFilename(const StoredSample& sample) {
  char timestamp[16]{};
  snprintf(timestamp, sizeof(timestamp), "%013llu", static_cast<unsigned long long>(sample.measuredAtMs));
  return String(kQueueDirectory) + "/" + timestamp + "_" + uuidText(sample.messageId) + ".bin";
}

String oldestQueueFile(size_t* count = nullptr) {
  if (count) *count = 0;
  File directory = LittleFS.open(kQueueDirectory);
  if (!directory || !directory.isDirectory()) return "";
  String oldest;
  File file = directory.openNextFile();
  while (file) {
    const String name = file.name();
    if (name.endsWith(".bin")) {
      if (count) ++*count;
      if (!oldest.length() || name < oldest) oldest = name;
    }
    file.close();
    file = directory.openNextFile();
  }
  directory.close();
  return oldest;
}

bool readOldestSample(String& path, StoredSample& sample) {
  path = oldestQueueFile();
  if (!path.length()) return false;
  File file = LittleFS.open(path, "r");
  const size_t expected = file ? file.size() : 0;
  if (!file || (expected != sizeof(sample) && expected != kLegacyRecordBytes)) {
    if (file) file.close();
    LittleFS.remove(path);
    Serial.println("Record LittleFS rusak, dilewati.");
    return false;
  }
  sample = StoredSample{};
  sample.rssi = kRssiUnknown;
  const size_t bytes = file.read(reinterpret_cast<uint8_t*>(&sample), expected);
  file.close();
  if (bytes != expected) {
    LittleFS.remove(path);
    Serial.println("Record LittleFS tidak lengkap, dilewati.");
    return false;
  }
  return true;
}

bool appendSample(const StoredSample& sample) {
  if (!LittleFS.exists(kQueueDirectory) && !LittleFS.mkdir(kQueueDirectory)) return false;
  size_t count = 0;
  const String oldest = oldestQueueFile(&count);
  if (count >= kMaxQueueRecords && oldest.length()) {
    LittleFS.remove(oldest);
    Serial.println("Buffer penuh, sampel terlama dibuang.");
  }
  const String destination = sampleFilename(sample);
  const char* temporary = "/queue/pending.tmp";
  LittleFS.remove(temporary);
  File file = LittleFS.open(temporary, "w");
  if (!file) return false;
  const size_t written = file.write(reinterpret_cast<const uint8_t*>(&sample), sizeof(sample));
  file.flush();
  file.close();
  if (written != sizeof(sample)) {
    LittleFS.remove(temporary);
    return false;
  }
  if (!LittleFS.rename(temporary, destination)) {
    LittleFS.remove(temporary);
    return false;
  }
  return true;
}

bool sampleSensors(StoredSample& sample) {
  float temperature = HardwareConfig::kQ6ProvisionalTdsTempReferenceC;
#if JF_HAS_TEMP
  if (!readWaterTemperature(temperature)) return false;
#endif
  sample.values[0] = 0.0F;
  sample.values[1] = 0.0F;
  sample.values[2] = 0.0F;
#if JF_HAS_TDS && JF_HAS_TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, LOW);
#endif
#if JF_HAS_PH
  if (!readPh(sample.values[0])) return false;
#endif
#if JF_HAS_TDS
#if JF_HAS_TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, HIGH);
  delay(500);
#endif
  if (!readTds(temperature, sample.values[1])) {
#if JF_HAS_TDS_POWER_SWITCH
    digitalWrite(kTdsPowerPin, LOW);
#endif
    return false;
  }
#if JF_HAS_TDS_POWER_SWITCH
  digitalWrite(kTdsPowerPin, LOW);
#endif
#endif
#if JF_HAS_TEMP
  sample.values[2] = temperature;
#endif
  sample.measuredAtMs = currentTimeMs();
  sample.rssi = WiFi.status() == WL_CONNECTED ? static_cast<int8_t>(std::max<int>(WiFi.RSSI(), -127)) : kRssiUnknown;
  makeMessageId(sample.messageId);
  return true;
}

String payloadFor(const StoredSample& sample) {
  JsonDocument document;
  document["version"] = 2;
  document["deviceId"] = config.deviceId;
  document["type"] = JF_TYPE;
  document["messageId"] = uuidText(sample.messageId);
  document["measuredAt"] = isoUtc(sample.measuredAtMs);
  JsonObject readings = document["readings"].to<JsonObject>();
#if JF_HAS_PH
  readings["ph"] = sample.values[0];
#endif
#if JF_HAS_TDS
  readings["tds"] = sample.values[1];
#endif
#if JF_HAS_TEMP
  readings["water_temperature"] = sample.values[2];
#endif
  JsonObject meta = document["meta"].to<JsonObject>();
  if (sample.rssi != kRssiUnknown) meta["rssi"] = sample.rssi;
  meta["fw"] = kFirmwareVersion;
  String payload;
  serializeJson(document, payload);
  return payload;
}

int postPayload(WiFiClient& client, const String& url, const String& payload) {
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  if (!http.begin(client, url)) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + config.credential);
  const int statusCode = http.POST(payload);
  http.end();
  return statusCode;
}

void scheduleRetry() {
  nextRetryAt = millis() + retryDelayMs;
  retryDelayMs = std::min(retryDelayMs * 2U, kMaxRetryMs);
}

void sendQueuedBatch() {
  if (state == DeviceState::halted || WiFi.status() != WL_CONNECTED) return;
  if (static_cast<int32_t>(millis() - nextRetryAt) < 0) return;
  const String url = normalizedUrl(config.apiUrl) + "/api/ingest";
  for (size_t message = 0; message < kMaxMessagesPerSendCycle; ++message) {
    String path;
    StoredSample sample{};
    if (!readOldestSample(path, sample)) return;
    const String payload = payloadFor(sample);
    int statusCode = -1;
    if (url.startsWith("https://")) {
      WiFiClientSecure client;
      client.setCACert(JF_ROOT_CA);
      statusCode = postPayload(client, url, payload);
    } else {
      WiFiClient client;
      statusCode = postPayload(client, url, payload);
    }
    if (statusCode >= 200 && statusCode < 300) {
      if (!LittleFS.remove(path)) {
        Serial.println("Sampel diterima tetapi record tidak dapat dihapus; batch dihentikan.");
        return;
      }
      retryDelayMs = kInitialRetryMs;
      nextRetryAt = 0;
      lastSuccessAt = millis();
      Serial.println("Sampel diterima backend.");
      continue;
    }
    if (statusCode == 401) {
      state = DeviceState::halted;
      Serial.println("Credential ditolak. Tahan BOOT 5 detik untuk provisioning ulang.");
      return;
    }
    if (statusCode == 400 || statusCode == 409) {
      if (!LittleFS.remove(path)) {
        Serial.printf("Sampel ditolak permanen: HTTP %d, tetapi record tidak dapat dihapus; batch dihentikan.\n", statusCode);
        return;
      }
      Serial.printf("Sampel ditolak permanen: HTTP %d. Record dilewati.\n", statusCode);
      continue;
    }
    Serial.printf("Pengiriman tertunda: HTTP %d. Record tetap di buffer.\n", statusCode);
    scheduleRetry();
    return;
  }
}

void updateLed() {
  const uint32_t now = millis();
  if (state == DeviceState::halted) {
    digitalWrite(kLedPin, HIGH);
    return;
  }
  if (state == DeviceState::provisioning) {
    if (now - ledChangedAt >= 150) {
      ledChangedAt = now;
      ledOn = !ledOn;
      digitalWrite(kLedPin, ledOn ? HIGH : LOW);
    }
    return;
  }
  if (state == DeviceState::connecting || state == DeviceState::waitingForTime) {
    if (now - ledChangedAt >= 700) {
      ledChangedAt = now;
      ledOn = !ledOn;
      digitalWrite(kLedPin, ledOn ? HIGH : LOW);
    }
    return;
  }
  if (WiFi.status() != WL_CONNECTED || oldestQueueFile().length()) {
    const uint32_t phase = now % 30000U;
    const bool blink = phase < 120 || (phase >= 320 && phase < 440);
    digitalWrite(kLedPin, blink ? HIGH : LOW);
    return;
  }
  const bool successPulse = lastSuccessAt && now - lastSuccessAt < kSuccessLedPulseMs;
  digitalWrite(kLedPin, successPulse ? HIGH : LOW);
}

bool reconnectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  state = DeviceState::connecting;
  if (millis() - lastReconnectAt >= 10000) {
    lastReconnectAt = millis();
    WiFi.reconnect();
  }
  return false;
}

}

void setup() {
  Serial.begin(115200);
  Serial.printf("Q6 provisional: pH=%s; TDS=%s; formula=%s; temperature=%s; TDS max=%.0f ppm.\n",
    HardwareConfig::kQ6ProvisionalPhModule,
    HardwareConfig::kQ6ProvisionalTdsModule,
    HardwareConfig::kQ6ProvisionalTdsFormula,
    HardwareConfig::kQ6ProvisionalTemperatureSensor,
    HardwareConfig::kQ6ProvisionalTemporaryTdsMaxPpm);
  pinMode(kLedPin, OUTPUT);
  pinMode(kProvisionPin, INPUT_PULLUP);
#if JF_HAS_TDS_POWER_SWITCH
  pinMode(kTdsPowerPin, OUTPUT);
  digitalWrite(kTdsPowerPin, LOW);
#endif
#if JF_HAS_PH
  analogSetPinAttenuation(kPhPin, ADC_11db);
#endif
#if JF_HAS_TDS
  analogSetPinAttenuation(kTdsPin, ADC_11db);
#endif
#if JF_HAS_TEMP
  temperatureSensor.begin();
  temperatureSensor.setResolution(12);
#endif

  if (!LittleFS.begin(false)) {
    Serial.println("LittleFS gagal dimuat; buffer tidak dihapus. Lihat firmware/README.md untuk uploadfs flash pertama.");
    state = DeviceState::error;
    return;
  }
  config = loadConfig();
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  if (provisionButtonHeld() || !hasProvisioning(config)) {
    if (!runProvisioning(config)) {
      state = DeviceState::error;
      return;
    }
  } else if (WiFi.status() != WL_CONNECTED) {
    state = DeviceState::connecting;
    WiFi.begin();
    const uint32_t started = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) delay(200);
    if (WiFi.status() != WL_CONNECTED && !runProvisioning(config)) {
      state = DeviceState::error;
      return;
    }
  }
  if (WiFi.status() == WL_CONNECTED && !clockReady()) {
    state = DeviceState::waitingForTime;
    synchronizeClock();
  }
  state = DeviceState::running;
  lastSampleAt = millis();
  lastSendAt = millis() - kSendIntervalMs;
  Serial.println("Firmware IoT siap. Credential tidak dicetak ke serial.");
}

void loop() {
  if (state == DeviceState::error) {
    digitalWrite(kLedPin, LOW);
    delay(1000);
    return;
  }
  if (provisionButtonHeld()) {
    if (runProvisioning(config)) {
      state = DeviceState::connecting;
      synchronizeClock();
      state = DeviceState::running;
    }
  }
  if (state == DeviceState::halted) {
    updateLed();
    delay(50);
    return;
  }
  reconnectWiFi();
  if (WiFi.status() == WL_CONNECTED && state == DeviceState::connecting && clockReady()) {
    state = DeviceState::running;
  }
  if (WiFi.status() == WL_CONNECTED && (!clockReady() || millis() - lastNtpSyncAt >= 21600000U)) {
    state = DeviceState::waitingForTime;
    synchronizeClock();
    state = DeviceState::running;
  }
  const uint32_t now = millis();
  if (clockReady() && now - lastSampleAt >= kSampleIntervalMs) {
    lastSampleAt = now;
    StoredSample sample{};
    if (sampleSensors(sample) && appendSample(sample)) {
      Serial.println("Sampel disimpan di LittleFS.");
    } else {
      Serial.println("Sampel tidak disimpan. Periksa waktu, kalibrasi, atau sensor.");
    }
  }
  if (now - lastSendAt >= kSendIntervalMs) {
    lastSendAt = now;
    sendQueuedBatch();
  }
  updateLed();
  delay(10);
}
