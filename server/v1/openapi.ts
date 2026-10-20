type ErrorExample = { status: number; code: string; description: string; message: string };
type Access = { scope?: string; sessionOnly?: boolean; publicPreview?: boolean; deviceCredential?: boolean; sandboxOnly?: boolean };
type SuccessExample = {
  status: number;
  description: string;
  contentType?: string;
  example?: unknown;
  representations?: Array<{ contentType: string; example: unknown }>;
  alternatives?: Array<{ summary: string; value: unknown }>;
};
type OperationDocs = {
  summary: string;
  description: string;
  access: Access;
  requestPath: string;
  requestNote: string;
  requestExamples?: Record<string, { summary: string; description?: string; value: unknown }>;
  parameterExamples?: Record<string, unknown>;
  success: SuccessExample;
  validation?: boolean;
  errors?: ErrorExample[];
  replaceErrors?: boolean;
  tryItAlternatives?: Array<{ summary: string; url: string }>;
};
type OpenApiDocument = Record<string, any>;

const exampleId = '00000000-0000-4000-8000-000000000001';
const exampleMessageId = '00000000-0000-4000-8000-000000000002';
const exampleDate = '2026-10-10T08:00:00.000Z';
const exampleError = (status: number, code: string, description: string, message: string): ErrorExample => ({ status, code, description, message });

const ambiguousAuth = exampleError(400, 'AMBIGUOUS_AUTH', 'Cookie sesi dan API key dikirim bersamaan.', 'Kirim cookie sesi atau API key, bukan keduanya.');
const validationError = exampleError(400, 'VALIDATION_FAILED', 'Body, query, parameter, atau header tidak sesuai kontrak.', 'Payload tidak valid.');
const unauthenticated = exampleError(401, 'UNAUTHENTICATED', 'Kredensial tidak ada, salah, atau sudah dicabut.', 'Silakan masuk.');
const forbiddenScope = exampleError(403, 'FORBIDDEN_SCOPE', 'Kredensial valid tetapi scope atau peran tidak mencukupi.', 'Scope kredensial tidak mencukupi.');
const originRejected = exampleError(403, 'ORIGIN_REJECTED', 'Request ber-cookie memakai Origin yang tidak sama dengan APP_ORIGIN.', 'Origin tidak diizinkan.');
const notFound = exampleError(404, 'NOT_FOUND', 'Resource tidak ditemukan atau tidak terlihat oleh actor.', 'Resource tidak ditemukan.');
const conflict = exampleError(409, 'CONFLICT', 'Operasi bertentangan dengan state resource atau idempotensi.', 'Operasi tidak dapat dilakukan pada state saat ini.');
const rateLimited = exampleError(429, 'RATE_LIMITED', 'Batas request atau koneksi tercapai; periksa header Retry-After.', 'Batas permintaan API tercapai. Coba lagi setelah beberapa saat.');
const unavailable = exampleError(503, 'UNAVAILABLE', 'Database atau layanan internal tidak tersedia.', 'Layanan tidak tersedia. Coba lagi.');
const pilotUnauthorized = exampleError(401, 'REQUEST_REJECTED', 'Credential ingest v1 salah; endpoint pilot lama memakai kode error REQUEST_REJECTED.', 'Kredensial perangkat salah.');
const pilotConflict = exampleError(409, 'REQUEST_REJECTED', 'Payload ingest v1 bertentangan dengan kiriman yang sudah tersimpan.', 'Request ditolak.');
const pilotRateLimited = exampleError(429, 'REQUEST_REJECTED', 'Rate limit ingest v1 memakai bentuk error pilot lama.', 'Request ditolak.');

function protectedErrors(validation = false): ErrorExample[] {
  return [ambiguousAuth, ...(validation ? [validationError] : []), unauthenticated, forbiddenScope, rateLimited, unavailable];
}

function sessionErrors(validation = false): ErrorExample[] {
  return [ambiguousAuth, ...(validation ? [validationError] : []), unauthenticated, rateLimited, unavailable];
}

function scoped(
  summary: string,
  description: string,
  scope: string,
  requestPath: string,
  requestNote: string,
  success: SuccessExample,
  options: Partial<Pick<OperationDocs, 'requestExamples' | 'parameterExamples' | 'validation' | 'errors' | 'tryItAlternatives'>> = {},
): OperationDocs {
  return { summary, description, access: { scope }, requestPath, requestNote, success, ...options };
}

function sessionOnly(
  summary: string,
  description: string,
  requestPath: string,
  requestNote: string,
  success: SuccessExample,
  options: Partial<Pick<OperationDocs, 'requestExamples' | 'parameterExamples' | 'validation' | 'errors'>> = {},
): OperationDocs {
  return { summary, description, access: { sessionOnly: true }, requestPath, requestNote, success, ...options };
}

const operationDocs: Record<string, OperationDocs> = {
  'GET /api/v1/sensor-types': scoped(
    'Daftar jenis sensor', 'Mengembalikan katalog jenis sensor yang tersimpan, termasuk satuan, rentang ukur, dan ambang.', 'devices:read',
    '/api/v1/sensor-types', 'Tidak memerlukan parameter. Sesi pengguna atau API key dengan scope devices:read.',
    { status: 200, description: 'Katalog sensor.', example: { sensorTypes: [
      { code: 'ph', name: 'pH Air', unit: 'pH', min: 0, max: 14, decimals: 2, warnLow: 6.2, warnHigh: 7.6 },
      { code: 'tds', name: 'TDS', unit: 'ppm', min: 0, max: 1000, decimals: 0, warnLow: 400, warnHigh: 900 },
    ] } },
  ),
  'POST /api/v1/sensor-types': scoped(
    'Buat jenis sensor', 'Membuat satu jenis sensor. Nilai decimals yang tidak dikirim mengikuti default aktual server; endpoint ini tidak mengubah seed.', 'admin',
    '/api/v1/sensor-types', 'Kirim body JSON satu jenis sensor. Hanya sesi admin atau API key actor admin dengan scope admin.',
    { status: 201, description: 'Jenis sensor dibuat.', example: { sensorType: { code: 'demo_sensor', name: 'Sensor demo', unit: 'unit', min: 0, max: 100, decimals: 2, warnLow: null, warnHigh: null } } },
    { validation: true, requestExamples: { create: { summary: 'Jenis sensor baru', value: { code: 'demo_sensor', name: 'Sensor demo', unit: 'unit', min: 0, max: 100 } } }, errors: [conflict] },
  ),
  'PATCH /api/v1/sensor-types/:code': scoped(
    'Ubah jenis sensor', 'Mengubah name, decimals, warnLow, atau warnHigh pada jenis sensor yang ada.', 'admin',
    `/api/v1/sensor-types/${'${code}'}`, 'Ganti parameter code dan kirim hanya field yang ingin diubah.',
    { status: 200, description: 'Jenis sensor setelah perubahan.', example: { sensorType: { code: 'ph', name: 'pH Air', unit: 'pH', min: 0, max: 14, decimals: 2, warnLow: 6.2, warnHigh: 7.6 } } },
    { validation: true, parameterExamples: { code: 'ph' }, requestExamples: { patch: { summary: 'Ubah nama dan ambang', value: { name: 'pH Air', warnLow: 6.2, warnHigh: 7.6 } } }, errors: [notFound] },
  ),
  'DELETE /api/v1/sensor-types/:code': scoped(
    'Hapus jenis sensor', 'Menghapus jenis sensor jika belum dipakai oleh tipe device mana pun.', 'admin',
    `/api/v1/sensor-types/${'${code}'}`, 'Ganti parameter code dengan kode sensor yang akan dihapus.',
    { status: 204, description: 'Jenis sensor dihapus tanpa response body.' },
    { validation: true, parameterExamples: { code: 'demo_sensor' }, errors: [notFound, conflict] },
  ),
  'GET /api/v1/device-types': scoped(
    'Daftar tipe device', 'Mengembalikan tipe satuan dan paket beserta sensor yang dikaitkan. Filter kind bersifat opsional.', 'devices:read',
    '/api/v1/device-types?kind=paket', 'Gunakan kind=satuan atau kind=paket, atau hapus query untuk seluruh tipe.',
    { status: 200, description: 'Daftar tipe device.', example: { deviceTypes: [
      { id: exampleId, code: 'AQ-PH', name: 'Sensor pH', kind: 'satuan', description: '', active: true, sensors: [{ code: 'ph', label: 'Probe pH' }] },
      { id: '00000000-0000-4000-8000-000000000003', code: 'AQ-WATER-01', name: 'Paket Kualitas Air', kind: 'paket', description: '', active: true, sensors: [{ code: 'ph', label: 'Probe pH' }, { code: 'tds', label: 'Probe TDS' }, { code: 'water_temperature', label: 'DS18B20' }] },
    ] } },
    { validation: true, parameterExamples: { kind: 'paket' } },
  ),
  'POST /api/v1/device-types': scoped(
    'Buat tipe device', 'Membuat tipe satuan dengan tepat satu sensor atau tipe paket dengan sedikitnya dua sensor unik.', 'admin',
    '/api/v1/device-types', 'Kirim body JSON tipe dan daftar sensor. Kode sensor harus sudah ada di katalog.',
    { status: 201, description: 'Tipe device dibuat.', example: { deviceType: { id: exampleId, code: 'AQ-DEMO-01', name: 'Paket demo', kind: 'paket', description: '', active: true, sensors: [{ code: 'ph', label: 'Probe pH' }, { code: 'tds', label: 'Probe TDS' }] } } },
    { validation: true, requestExamples: { create: { summary: 'Tipe paket dua sensor', value: { code: 'AQ-DEMO-01', name: 'Paket demo', kind: 'paket', description: '', sensors: [{ code: 'ph', label: 'Probe pH' }, { code: 'tds', label: 'Probe TDS' }] } } }, errors: [conflict] },
  ),
  'PATCH /api/v1/device-types/:id': scoped(
    'Ubah tipe device', 'Mengubah name, description, active, dan/atau sensors. Daftar sensor hanya dapat diubah sebelum tipe dipakai device.', 'admin',
    `/api/v1/device-types/${'${id}'}`, 'Ganti parameter id dengan UUID tipe dan kirim field yang akan diubah.',
    { status: 200, description: 'Tipe device setelah perubahan.', example: { deviceType: { id: exampleId, code: 'AQ-DEMO-01', name: 'Paket demo', kind: 'paket', description: 'Tipe contoh', active: true, sensors: [{ code: 'ph', label: 'Probe pH' }, { code: 'tds', label: 'Probe TDS' }] } } },
    { validation: true, parameterExamples: { id: exampleId }, requestExamples: { patch: { summary: 'Ubah deskripsi', value: { description: 'Tipe contoh' } } }, errors: [notFound, conflict] },
  ),
  'GET /api/v1/devices': {
    ...scoped(
      'Daftar device', 'Mengembalikan maksimal 100 device yang boleh dilihat actor. Filter type, area, dan legacyId bersifat opsional. Query code memilih pratinjau QR publik dengan response terbatas; cursor saat ini diterima schema tetapi response nextCursor selalu null.', 'devices:read',
      '/api/v1/devices?type=AQ-WATER-01&area=AR-01', 'Contoh daftar memakai filter opsional. Pratinjau QR publik menggunakan ?code=AQ-PH-001 dan opsional ?c=<PLACEHOLDER_KODE_AKTIVASI_TIDAK_VALID>.',
      { status: 200, description: 'Daftar device. Pratinjau QR publik hanya mengembalikan identitas dasar, areaRef, sensor, dan status klaim; tidak memuat pembacaan, identitas pemilik, credential, atau kode aktivasi.', example: { devices: [{ id: exampleId, code: 'AQ-PH-001', isSandbox: false, credentialProvisioned: false, legacyId: 'IOT-001', name: 'Sensor pH contoh', type: { code: 'AQ-PH', kind: 'satuan' }, areaRef: 'AR-01', status: 'offline', lastMeasuredAt: null, lastReceivedAt: null, firmware: null, rssi: null, calibratedAt: null }], nextCursor: null }, alternatives: [{ summary: 'Pratinjau QR publik', value: { device: { code: 'AQ-PH-001', name: 'Sensor pH contoh', type: { code: 'AQ-PH', kind: 'satuan' }, areaRef: 'AR-01', sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', label: 'Probe pH' }], claimed: false, activationValid: false } } }] },
      { validation: true, parameterExamples: { type: 'AQ-WATER-01', area: 'AR-01', legacyId: 'IOT-001' }, errors: [notFound] },
    ),
    access: { scope: 'devices:read', publicPreview: true },
    tryItAlternatives: [{ summary: 'Pratinjau QR publik tanpa autentikasi', url: '/api/v1/devices?code=AQ-PH-001' }],
  },
  'GET /api/v1/devices/:id': scoped(
    'Detail device', 'Mengembalikan satu device yang terlihat oleh actor beserta katalog sensor dan ambang efektif.', 'devices:read',
    `/api/v1/devices/${'${id}'}`, 'Ganti parameter id dengan UUID device milik actor atau yang berada pada environment API key.',
    { status: 200, description: 'Detail device dan sensor.', example: { device: { id: exampleId, code: 'AQ-PH-001', isSandbox: false, credentialProvisioned: true, legacyId: 'IOT-001', name: 'Sensor pH contoh', type: { code: 'AQ-PH', kind: 'satuan' }, areaRef: 'AR-01', status: 'online', lastMeasuredAt: exampleDate, lastReceivedAt: exampleDate, firmware: '0.3.0', rssi: -58, calibratedAt: null, sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2, label: 'Probe pH', threshold: { low: 6.2, high: 7.6, source: 'default' } }] } } },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound] },
  ),
  'POST /api/v1/devices': scoped(
    'Buat device dan credential', 'Membuat device sesuai environment actor (sesi/key live membuat device live, key test membuat sandbox) dan mengembalikan credential serta activationCode satu kali. Nilai sensitif pada contoh adalah placeholder yang tidak valid.', 'admin',
    '/api/v1/devices', 'Kirim typeCode dan name; areaRef dan allocatedTo opsional. Credential hanya dikembalikan sekali oleh server.',
    { status: 201, description: 'Device dibuat; simpan credential dan activationCode secara aman. Nilai contoh bukan credential valid.', example: { device: { id: exampleId, code: 'AQ-PH-004' }, credential: '<PLACEHOLDER_CREDENTIAL_TIDAK_VALID>', activationCode: '<PLACEHOLDER_KODE_AKTIVASI_TIDAK_VALID>' } },
    { validation: true, requestExamples: { create: { summary: 'Buat device pH', value: { typeCode: 'AQ-PH', name: 'Sensor pH contoh', areaRef: 'AR-01', allocatedTo: null } } }, errors: [conflict] },
  ),
  'POST /api/v1/devices/:id/activation': scoped(
    'Terbitkan kode aktivasi', 'Menerbitkan kode aktivasi baru berlaku 24 jam dan langsung membatalkan kode lama.', 'admin',
    `/api/v1/devices/${'${id}'}/activation`, 'Ganti parameter id dengan UUID device live yang belum diklaim.',
    { status: 200, description: 'Kode aktivasi satu kali dan waktu kedaluwarsa. Contoh kode adalah placeholder tidak valid.', example: { activationCode: '<PLACEHOLDER_KODE_AKTIVASI_TIDAK_VALID>', expiresAt: '2026-10-11T08:00:00.000Z' } },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound, conflict] },
  ),
  'POST /api/v1/devices/:id/credentials/rotate': scoped(
    'Rotasi credential device live', 'Merotasi credential device live yang sudah diprovisikan. Credential lama langsung ditolak setelah transaksi commit; kiriman buffer sebelum credentialSince ditolak.', 'admin',
    `/api/v1/devices/${'${id}'}/credentials/rotate`, 'Ganti parameter id dengan UUID device live yang sudah memiliki credential. Jangan jalankan pada device live saat memakai Try it.',
    { status: 200, description: 'Credential baru hanya ditampilkan sekali. String contoh bukan credential valid.', example: { credential: '<PLACEHOLDER_CREDENTIAL_TIDAK_VALID>', credentialSince: exampleDate } },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound, conflict] },
  ),
  'POST /api/v1/devices/:id/qr': scoped(
    'Buat gambar QR', 'Membuat SVG atau PNG dari URL klaim setelah mencocokkan activationCode aktif. Kode dikirim hanya di body dan tidak disimpan mentah.', 'admin',
    `/api/v1/devices/${'${id}'}/qr?format=svg`, 'Ganti UUID dan format. Body memerlukan activationCode valid dari alur provisioning; placeholder di bawah bukan kode valid.',
    { status: 200, description: 'Gambar QR SVG atau PNG; contoh hanya placeholder, bukan QR klaim yang dapat digunakan.', contentType: 'image/svg+xml', example: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><!-- placeholder --></svg>', representations: [{ contentType: 'image/png', example: '<PLACEHOLDER_BYTE_PNG_TIDAK_VALID>' }] },
    { validation: true, parameterExamples: { id: exampleId, format: 'svg' }, requestExamples: { qr: { summary: 'Permintaan gambar QR', value: { activationCode: '<PLACEHOLDER_KODE_AKTIVASI_TIDAK_VALID>' } } }, errors: [notFound, conflict] },
  ),
  'POST /api/v1/devices/claim': scoped(
    'Klaim device', 'Mengklaim device menggunakan code dan activationCode yang masih aktif serta dialokasikan untuk actor jika allocation ditentukan.', 'devices:write',
    '/api/v1/devices/claim', 'Kirim code device dan kode aktivasi yang valid. Nilai contoh kode aktivasi bukan credential valid.',
    { status: 200, description: 'Kepemilikan berhasil dibuat.', example: { deviceId: exampleId } },
    { validation: true, requestExamples: { claim: { summary: 'Permintaan klaim', value: { code: 'AQ-PH-001', activationCode: '<PLACEHOLDER_KODE_AKTIVASI_TIDAK_VALID>' } } }, errors: [notFound, conflict] },
  ),
  'PATCH /api/v1/devices/:id': scoped(
    'Ubah metadata device', 'Pemilik dapat mengubah name dan areaRef. Actor dengan scope admin juga dapat mengubah firmware dan calibratedAt.', 'devices:write',
    `/api/v1/devices/${'${id}'}`, 'Ganti UUID device dan kirim satu atau lebih field yang diizinkan.',
    { status: 200, description: 'Perubahan diterapkan.', example: { ok: true } },
    { validation: true, parameterExamples: { id: exampleId }, requestExamples: { patch: { summary: 'Ubah nama dan area', value: { name: 'Sensor pH contoh', areaRef: 'AR-01' } } }, errors: [notFound] },
  ),
  'POST /api/v1/devices/:id/release': scoped(
    'Lepas device', 'Mengakhiri ownership device milik actor. Riwayat masa kepemilikan tetap tersimpan.', 'devices:write',
    `/api/v1/devices/${'${id}'}/release`, 'Ganti parameter id dengan UUID device live milik actor.',
    { status: 200, description: 'Device berhasil dilepas.', example: { ok: true } },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound] },
  ),
  'GET /api/v1/devices/:id/latest': scoped(
    'Pembacaan terbaru device', 'Mengembalikan waktu ukur dan nilai terbaru untuk setiap sensor device. Jika belum ada data, measuredAt dan nilai sensor bernilai null.', 'readings:read',
    `/api/v1/devices/${'${id}'}/latest`, 'Ganti parameter id dengan UUID device yang dapat dibaca actor.',
    { status: 200, description: 'Nilai terbaru dan state per sensor.', example: { measuredAt: exampleDate, readings: [{ sensor: 'ph', value: 7.02, unit: 'pH', state: 'normal', threshold: { low: 6.2, high: 7.6, source: 'default' } }] } },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound] },
  ),
  'GET /api/v1/devices/:id/readings': scoped(
    'Riwayat pembacaan device', 'Mengembalikan agregasi 1m/5m/1h atau halaman raw. from dan to wajib; bucket raw mendukung sensor opsional, cursor, dan limit sampai 100.', 'readings:read',
    `/api/v1/devices/${'${id}'}/readings?sensor=ph&from=2026-10-10T07:00:00.000Z&to=2026-10-10T08:00:00.000Z&bucket=5m`, 'Ganti UUID dan rentang UTC (maksimal 31 hari). Untuk bucket agregasi, sensor wajib.',
    { status: 200, description: 'Contoh response agregat; bucket raw mengembalikan messageId, readings, metadata halaman pertama, dan nextCursor.', example: { sensor: 'ph', bucket: '5m', points: [{ t: exampleDate, avg: 7.01, min: 6.98, max: 7.04, n: 10 }], threshold: { low: 6.2, high: 7.6, source: 'default' } }, alternatives: [{ summary: 'Bucket raw halaman pertama', value: { sensor: 'ph', bucket: 'raw', points: [{ messageId: exampleMessageId, measuredAt: exampleDate, receivedAt: exampleDate, readings: [{ sensor: 'ph', value: 7.02, unit: 'pH', state: 'normal' }], value: 7.02, unit: 'pH' }], threshold: { low: 6.2, high: 7.6, source: 'default' }, total: 1, thresholds: [{ sensor: 'ph', low: 6.2, high: 7.6, source: 'default' }], device: { name: 'Sensor pH contoh', code: 'AQ-PH-001', type: { code: 'AQ-PH', kind: 'satuan' }, status: 'online', hasReadings: true, areaRef: 'AR-01', sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2 }] }, nextCursor: null } }] },
    { validation: true, parameterExamples: { id: exampleId, sensor: 'ph', from: '2026-10-10T07:00:00.000Z', to: exampleDate, bucket: '5m' }, errors: [notFound] },
  ),
  'GET /api/v1/devices/:id/readings/export': scoped(
    'Ekspor riwayat ke Excel', 'Mengalirkan workbook XLSX dengan sheet Log sensor dan Ringkasan. Rentang positif maksimal 31 hari, to masa depan dipotong ke waktu request; batas 5 request per menit dan 2 ekspor aktif per actor.', 'readings:read',
    `/api/v1/devices/${'${id}'}/readings/export?from=2026-10-09T08:00:00.000Z&to=${exampleDate}&tz=Asia%2FJakarta`, 'Ganti UUID dan waktu. Response sukses adalah attachment XLSX, bukan JSON.',
    { status: 200, description: 'Workbook attachment berisi dua sheet; file contoh tidak dilampirkan.', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', example: '<konten XLSX biner>' },
    { validation: true, parameterExamples: { id: exampleId, from: '2026-10-09T08:00:00.000Z', to: exampleDate, tz: 'Asia/Jakarta' }, errors: [notFound, rateLimited] },
  ),
  'GET /api/v1/sensors/:code/overview': scoped(
    'Overview satu jenis sensor', 'Mengembalikan nilai terbaru sensor pada seluruh device yang boleh dilihat actor. Device tanpa readings tetap muncul dengan value dan measuredAt null.', 'readings:read',
    `/api/v1/sensors/${'${code}'}/overview`, 'Ganti code dengan kode sensor, misalnya ph.',
    { status: 200, description: 'Overview sensor dan pembacaan per device.', example: { sensor: 'ph', name: 'pH Air', unit: 'pH', items: [{ deviceId: exampleId, deviceCode: 'AQ-PH-001', areaRef: 'AR-01', value: 6.8, unit: 'pH', state: 'normal', threshold: { low: 6.2, high: 7.6, source: 'default' }, measuredAt: exampleDate }] } },
    { validation: true, parameterExamples: { code: 'ph' }, errors: [notFound] },
  ),
  'PUT /api/v1/areas/:ref/thresholds': scoped(
    'Atur ambang area', 'Mengatur override ambang sensor per areaRef. Nilai null mewarisi ambang default; low dan high yang keduanya null menghapus override.', 'admin',
    `/api/v1/areas/${'${ref}'}/thresholds`, 'Ganti ref area dan kirim daftar thresholds dengan sensor yang tidak berulang.',
    { status: 200, description: 'Nilai ambang efektif setelah perubahan.', example: { areaRef: 'AR-01', thresholds: [{ sensor: 'ph', low: 6.5, high: 7.5, source: 'area' }] } },
    { validation: true, parameterExamples: { ref: 'AR-01' }, requestExamples: { thresholds: { summary: 'Ambang pH area', value: { thresholds: [{ sensor: 'ph', low: 6.5, high: 7.5 }] } } } },
  ),
  'GET /api/v1/events': scoped(
    'Daftar log kejadian', 'Mengembalikan kejadian yang terlihat oleh actor, urut id DESC. Cursor Base64URL berisi ID terakhir; limit bawaan 50 dan maksimum 100.', 'readings:read',
    '/api/v1/events?deviceId=00000000-0000-4000-8000-000000000001&type=threshold_low&limit=50', 'Filter deviceId, type, cursor, dan limit bersifat opsional.',
    { status: 200, description: 'Halaman kejadian dan cursor berikutnya.', example: { events: [{ id: '812', deviceId: exampleId, type: 'threshold_low', sensor: 'ph', value: 6.1, at: exampleDate }], nextCursor: null } },
    { validation: true, parameterExamples: { deviceId: exampleId, type: 'threshold_low', limit: '50' }, errors: [notFound] },
  ),
  'GET /api/v1/stream': scoped(
    'Buka stream SSE', 'Membuka event stream live. Header Accept harus memuat text/event-stream; Last-Event-ID opsional untuk replay device_event. Reading tidak memiliki ID dan tidak direplay. Maksimal lima koneksi per actor.', 'readings:read',
    '/api/v1/stream', 'Kirim Accept: text/event-stream. Saat reconnect, kirim Last-Event-ID dari frame device_event terakhir.',
    { status: 200, description: 'Stream text/event-stream; : connected dikirim sebelum replay.', contentType: 'text/event-stream', example: ': connected\n\nevent: reading\ndata: {"deviceId":"00000000-0000-4000-8000-000000000001","measuredAt":"2026-10-10T08:00:00.000Z","readings":{"ph":7.02}}\n\n' },
    { validation: true, parameterExamples: { accept: 'text/event-stream', 'last-event-id': '812' }, errors: [rateLimited] },
  ),
  'GET /api/v1/keys': sessionOnly(
    'Daftar API key akun', 'Mengembalikan metadata key milik akun tanpa secret. Route key hanya menerima cookie sesi dan menolak autentikasi API key.',
    '/api/v1/keys', 'Gunakan cookie pilot_session dari sesi login; API key tidak dapat memanggil route pengelolaan key.',
    { status: 200, description: 'Daftar metadata key tanpa secret.', example: { keys: [{ id: exampleId, name: 'Key sandbox', prefix: 'jf_test_<xx>', scopes: ['devices:read'], environment: 'test', createdAt: exampleDate, lastUsedAt: null, revokedAt: null }] } },
  ),
  'POST /api/v1/keys': sessionOnly(
    'Buat API key', 'Membuat API key dan menampilkan secret hanya sekali. Membuat key test memastikan sandbox actor tersedia; akun user hanya dapat membuat key test dan tidak dapat memberi scope admin.',
    '/api/v1/keys', 'Gunakan cookie pilot_session dan kirim environment serta minimal satu scope. Jangan menyimpan atau menyalin secret contoh.',
    { status: 201, description: 'Key dibuat. Placeholder secret berikut bukan API key valid dan bukan untuk Try it.', example: { key: { id: exampleId, name: 'Key sandbox', prefix: 'jf_test_<xx>', scopes: ['devices:read'], environment: 'test', createdAt: exampleDate, lastUsedAt: null, revokedAt: null }, secret: '<PLACEHOLDER_SECRET_TIDAK_VALID>' } },
    { validation: true, requestExamples: { create: { summary: 'Buat key test sandbox', value: { name: 'Key sandbox', environment: 'test', scopes: ['devices:read', 'devices:write'] } } }, errors: [forbiddenScope] },
  ),
  'DELETE /api/v1/keys/:id': sessionOnly(
    'Cabut API key', 'Mencabut key milik akun sesi. Pencabutan berlaku langsung dan tidak dapat dilakukan menggunakan API key.',
    `/api/v1/keys/${'${id}'}`, 'Ganti parameter id dengan UUID key milik sesi.',
    { status: 204, description: 'Key dicabut tanpa response body.' },
    { validation: true, parameterExamples: { id: exampleId }, errors: [notFound] },
  ),
  'GET /api/v1/keys/:id/usage': sessionOnly(
    'Ringkasan penggunaan API key', 'Mengembalikan jumlah request, error, rate limit, rekap harian, dan maksimal lima route terbanyak untuk rentang 1 sampai 30 hari.',
    `/api/v1/keys/${'${id}'}/usage?days=7`, 'Ganti UUID key milik sesi. Query days opsional, bawaan 7.',
    { status: 200, description: 'Ringkasan penggunaan key.', example: { usage: { days: 7, totalRequests: 12, errorPercent: 0, rateLimitedRequests: 0, daily: [{ date: '2026-10-10', requests: 12, errors: 0, rateLimitedRequests: 0 }], topRoutes: [{ route: 'GET /api/v1/devices', requests: 12 }] } } },
    { validation: true, parameterExamples: { id: exampleId, days: '7' }, errors: [notFound] },
  ),
  'GET /api/v1/sandbox/devices': {
    ...scoped(
      'Daftar device sandbox', 'Memastikan satu device virtual milik actor tersedia lalu mengembalikan skenario, area, dan pembacaan terakhir. API key live sengaja mendapat 404.', 'devices:read',
      '/api/v1/sandbox/devices', 'Gunakan sesi atau API key jf_test_ dengan scope devices:read. Pilih device sandbox milik akun.',
      { status: 200, description: 'Device sandbox actor.', example: { devices: [{ id: exampleId, code: 'AQ-SBX-000', name: 'Sandbox contoh', scenario: 'normal', areaRef: null, measuredAt: null, readings: null }] } },
    ),
    access: { scope: 'devices:read', sandboxOnly: true },
    requestNote: 'Sesi atau API key test dengan scope devices:read; API key live mendapat 404 NOT_FOUND.',
    errors: [...protectedErrors(), notFound],
  },
  'PUT /api/v1/sandbox/devices/:id/scenario': {
    ...scoped(
      'Ubah skenario sandbox', 'Mengubah skenario device sandbox milik actor. Pilihan: normal, ph_turun, suhu_naik, offline. Device di luar sandbox actor mendapat 404.', 'devices:write',
      `/api/v1/sandbox/devices/${'${id}'}/scenario`, 'Gunakan sesi atau API key jf_test_ dengan scope devices:write.',
      { status: 200, description: 'Skenario sandbox setelah perubahan.', example: { deviceId: exampleId, scenario: 'ph_turun' } },
      { validation: true, parameterExamples: { id: exampleId }, requestExamples: { scenario: { summary: 'Skenario pH turun', value: { scenario: 'ph_turun' } } }, errors: [notFound] },
    ),
    access: { scope: 'devices:write', sandboxOnly: true },
    requestNote: 'Sesi atau API key test dengan scope devices:write; API key live mendapat 404 NOT_FOUND.',
  },
  'POST /api/ingest': {
    summary: 'Kirim telemetry device',
    description: 'Menerima payload ingest v1 pilot dan v2 satuan/paket. Berbeda dari API key, autentikasi route ini hanya credential device Bearer dan tidak memakai scope API. Retry v2 dengan deviceId/messageId dan seluruh payload identik memberi duplicate=true; perubahan payload menghasilkan 409. Try it hanya untuk perangkat uji terisolasi; jangan gunakan credential perangkat live.',
    access: { deviceCredential: true },
    requestPath: '/api/ingest',
    requestNote: 'Gunakan credential device khusus endpoint ini untuk perangkat uji terisolasi. API key jf_test_ bukan credential ingest, dan jf_live_ dilarang untuk Try it.',
    requestExamples: {
      v1_pilot: { summary: 'Payload pilot v1 legacy', description: 'Format lama tetap diterima; identifier di bawah adalah placeholder.', value: { version: 1, deviceId: exampleId, model: 'water-v1', messageId: exampleMessageId, measuredAt: exampleDate, readings: { water_temperature: 27.4, ph: 7.02, ec: 1.2 } } },
      v2_satuan: { summary: 'Payload v2 satuan, satu sensor', description: 'Contoh tipe AQ-PH dengan satu nilai sensor.', value: { version: 2, deviceId: exampleId, type: 'AQ-PH', messageId: exampleMessageId, measuredAt: exampleDate, readings: { ph: 7.02 }, meta: { rssi: -61, fw: '0.3.0' } } },
      v2_paket: { summary: 'Payload v2 paket, tiga sensor', description: 'Contoh tipe AQ-WATER-01 dengan seluruh sensor paket.', value: { version: 2, deviceId: exampleId, type: 'AQ-WATER-01', messageId: exampleMessageId, measuredAt: exampleDate, readings: { ph: 7.02, tds: 612, water_temperature: 27.4 }, meta: { rssi: -61, fw: '0.3.0' } } },
    },
    success: { status: 200, description: 'Payload baru atau retry identik diterima.', example: { accepted: true, duplicate: false }, alternatives: [{ summary: 'Retry identik sudah tersimpan', value: { accepted: true, duplicate: true } }] },
    validation: true,
      replaceErrors: true,
      errors: [
      validationError,
      exampleError(400, 'REQUEST_REJECTED', 'Ingest v1 menggunakan kode error pilot lama untuk semua response 4xx.', 'Request ditolak.'),
      unauthenticated,
      pilotUnauthorized,
      exampleError(403, 'REQUEST_REJECTED', 'Origin ber-cookie yang tidak diizinkan memakai kode error pilot lama.', 'Origin tidak diizinkan.'),
      conflict,
      pilotConflict,
      rateLimited,
      pilotRateLimited,
      unavailable,
    ],
  },
};

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' } },
      required: ['code', 'message', 'requestId'],
    },
  },
  required: ['error'],
};

function securityFor(access: Access): unknown[] {
  if (access.deviceCredential) return [{ DeviceCredentialBearer: [] }];
  if (access.sessionOnly) return [{ PilotSessionCookie: [] }];
  if (access.publicPreview) return [{ ApiKeyBearer: [] }, { PilotSessionCookie: [] }, {}];
  return [{ ApiKeyBearer: [] }, { PilotSessionCookie: [] }];
}

function accessNotes(access: Access): string {
  if (access.deviceCredential) return 'Credential device Bearer khusus POST /api/ingest; bukan API key dan bukan scope API.';
  if (access.sessionOnly) return 'Sesi cookie pilot_session saja. API key ditolak dengan 401 UNAUTHENTICATED.';
  if (access.publicPreview) return 'Scope devices:read untuk daftar normal. Pengecualian pratinjau QR publik hanya GET /api/v1/devices?code=... dengan response terbatas.';
  if (access.sandboxOnly) return `Hanya untuk resource sandbox milik actor; sesi atau API key jf_test_ dengan scope ${access.scope}. API key live mendapat 404 NOT_FOUND.`;
  if (access.scope === 'admin') return 'Hanya actor role admin pada sesi atau API key dengan scope admin. Environment API key membatasi akses device dan telemetry sesuai route.';
  return `Sesi cookie pilot_session atau API key jf_live_/jf_test_ dengan scope ${access.scope}. Batas environment test/live berlaku untuk resource device dan telemetry sesuai route; katalog tetap mengikuti scope.`;
}

function mergeErrors(existing: ErrorExample[], additions: ErrorExample[] = []): ErrorExample[] {
  const unique = new Map<string, ErrorExample>();
  for (const error of [...existing, ...additions]) unique.set(`${error.status}:${error.code}`, error);
  return [...unique.values()];
}

function addSuccessResponse(operation: Record<string, any>, success: SuccessExample): void {
  const status = String(success.status);
  if (success.status !== 200 && operation.responses['200']?.description === 'Default Response') {
    delete operation.responses['200'];
  }
  const response = operation.responses[status] ?? { description: success.description };
  response.description = success.description;
  if ((success.contentType || success.representations?.length) && success.status !== 204) {
    const content = response.content ?? {};
    const representations = [
      ...(success.contentType ? [{ contentType: success.contentType, example: success.example }] : []),
      ...(success.representations ?? []),
    ];
    for (const representation of representations) {
      const media = content[representation.contentType] ?? {};
      if (!media.schema) media.schema = representation.contentType === 'text/event-stream'
        ? { type: 'string' }
        : representation.contentType.startsWith('image/')
          ? { type: 'string' }
          : { type: 'string', format: 'binary' };
      media.examples = {
        ...(media.examples ?? {}),
        ...(representation.example === undefined ? {} : { success: { summary: 'Contoh response sukses', value: representation.example } }),
      };
      content[representation.contentType] = media;
    }
    if (success.contentType) {
      const media = content[success.contentType];
      media.examples = {
        ...(media.examples ?? {}),
        ...(success.alternatives ?? []).reduce<Record<string, unknown>>((all, alternative, index) => {
          all[`success_alternative_${index + 1}`] = { summary: alternative.summary, value: alternative.value };
          return all;
        }, {}),
      };
    }
    response.content = content;
  } else if (success.example !== undefined && success.status !== 204) {
    const content = response.content ?? {};
    const media = content['application/json'] ?? {};
    media.examples = {
      ...(media.examples ?? {}),
      success: { summary: 'Contoh response sukses', value: success.example },
      ...(success.alternatives ?? []).reduce<Record<string, unknown>>((all, alternative, index) => {
        all[`success_alternative_${index + 1}`] = { summary: alternative.summary, value: alternative.value };
        return all;
      }, {}),
    };
    content['application/json'] = media;
    response.content = content;
  }
  operation.responses[status] = response;
  operation['x-success-example'] = {
    status: success.status,
    description: success.description,
    ...(success.example === undefined ? {} : { value: success.example }),
    ...(success.alternatives ? { alternatives: success.alternatives } : {}),
  };
}

function addErrorResponses(operation: Record<string, any>, errors: ErrorExample[]): void {
  const byStatus = new Map<number, ErrorExample[]>();
  for (const error of errors) byStatus.set(error.status, [...(byStatus.get(error.status) ?? []), error]);
  for (const [status, errorsForStatus] of byStatus) {
    const key = String(status);
    const response = operation.responses[key] ?? { description: errorsForStatus.map(error => error.description).join(' ') };
    response.description = errorsForStatus.map(error => `${error.code}: ${error.description}`).join(' ');
    const content = response.content ?? {};
    const media = content['application/json'] ?? { schema: errorSchema };
    media.examples = {
      ...(media.examples ?? {}),
      ...errorsForStatus.reduce<Record<string, unknown>>((all, error) => {
        all[error.code] = {
          summary: error.code,
          description: error.description,
          value: { error: { code: error.code, message: error.message, requestId: '<request-id>' } },
        };
        return all;
      }, {}),
    };
    content['application/json'] = media;
    response.content = content;
    operation.responses[key] = response;
  }
}

export function enrichOpenApiDocument(input: unknown): OpenApiDocument {
  const document = input as OpenApiDocument;
  document.components ??= {};
  document.components.securitySchemes = {
    ...document.components.securitySchemes,
    ApiKeyBearer: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'jf_live_... atau jf_test_... diikuti secret 64 hex',
      description: 'API key untuk route /api/v1 sesuai scope dan environment. Key Live hanya diterbitkan pengelola (admin); key untuk mitra tidak boleh diberi scope admin. Gunakan hanya key jf_test_ untuk sandbox; jangan masukkan jf_live_ ke Try it. Tidak ada key valid pada contoh.',
    },
    PilotSessionCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'pilot_session',
      description: 'Cookie sesi pilot dari POST /api/session/login. Request mutasi ber-cookie wajib memiliki Origin yang sama dengan APP_ORIGIN.',
    },
    DeviceCredentialBearer: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: '64 hex',
      description: 'Credential device khusus POST /api/ingest. Bukan API key jf_test_ atau jf_live_; jangan gunakan credential perangkat live dalam Try it.',
    },
  };
  document.info ??= {};
  document.info.description = [
    'Autentikasi: route /api/v1 menerima cookie pilot_session atau API key Bearer jf_live_/jf_test_ sesuai scope. Route /api/v1/keys hanya menerima sesi. POST /api/ingest memakai credential device Bearer khusus. Key Live hanya diterbitkan pengelola (admin); key untuk mitra tidak boleh diberi scope admin.',
    'Server aktif tercantum pada Servers dan mengikuti APP_ORIGIN backend. Spec ini dibuat dari schema route aktif Fastify; JSON tetap tersedia pada /docs/openapi.json.',
    'Try it: gunakan hanya API key jf_test_ dengan scope yang diperlukan dan resource device sandbox. Jangan pernah memasukkan atau menguji key jf_live_. POST /api/ingest bukan route API key; gunakan hanya credential device sandbox/uji yang terisolasi, jangan credential perangkat live.',
    'Cookie sesi pada request mutasi harus berasal dari origin APP_ORIGIN. Contoh credential dan kode aktivasi yang ditandai PLACEHOLDER bukan credential valid.',
  ].join('\n\n');

  for (const [routeKey, docs] of Object.entries(operationDocs)) {
    const [method, registeredPath] = routeKey.split(' ', 2);
    const path = registeredPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
    const operation = document.paths?.[path]?.[method.toLowerCase()];
    if (!operation) continue;
    operation.summary = docs.summary;
    operation.description = `${docs.description}\n\nAkses: ${accessNotes(docs.access)}`;
    operation.security = securityFor(docs.access);
    if (docs.access.scope) operation['x-required-scope'] = docs.access.scope;
    operation['x-access-notes'] = accessNotes(docs.access);
    const requestPath = docs.requestPath
      .replace('${id}', exampleId)
      .replace('${code}', 'ph')
      .replace('${ref}', 'AR-01');
    operation['x-try-it-example'] = {
      method,
      url: requestPath,
      note: docs.requestNote,
      ...(docs.requestExamples ? { body: Object.values(docs.requestExamples)[0].value } : {}),
      ...(docs.tryItAlternatives ? { alternatives: docs.tryItAlternatives } : {}),
    };

    if (docs.parameterExamples && Array.isArray(operation.parameters)) {
      for (const parameter of operation.parameters) {
        if (Object.hasOwn(docs.parameterExamples, parameter.name)) parameter.example = docs.parameterExamples[parameter.name];
      }
    }
    if (docs.requestExamples) {
      operation.requestBody ??= { content: {} };
      operation.requestBody.content ??= {};
      const media = operation.requestBody.content['application/json'] ?? {};
      media.examples = {
        ...(media.examples ?? {}),
        ...Object.fromEntries(Object.entries(docs.requestExamples).map(([name, example]) => [name, example])),
      };
      operation.requestBody.content['application/json'] = media;
    }

    operation.responses ??= {};
    addSuccessResponse(operation, docs.success);
    let errors = docs.replaceErrors
      ? docs.errors ?? []
      : docs.access.publicPreview
      ? mergeErrors(protectedErrors(Boolean(docs.validation)), [notFound])
      : docs.access.sessionOnly
        ? sessionErrors(Boolean(docs.validation))
        : docs.access.deviceCredential
          ? [validationError, unauthenticated, conflict, rateLimited, unavailable]
          : protectedErrors(Boolean(docs.validation));
    if (!docs.replaceErrors && method !== 'GET' && !docs.access.deviceCredential) {
      errors = mergeErrors(errors, [originRejected]);
    }
    addErrorResponses(operation, docs.replaceErrors ? errors : mergeErrors(errors, docs.errors));
  }
  return document;
}
