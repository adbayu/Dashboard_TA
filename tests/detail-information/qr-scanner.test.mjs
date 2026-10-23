import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';

test('allows opening the camera when mediaDevices exists without BarcodeDetector', async () => {
  const { canOpenQrCamera } = await import('../../src/detail-information/model/qrScanner.js');
  assert.equal(canOpenQrCamera({ mediaDevices: { getUserMedia() {} } }), true);
  assert.equal(canOpenQrCamera({ mediaDevices: {} }), false);
  assert.equal(canOpenQrCamera({}), false);
});

test('software decoder reads QR data from a camera frame', async () => {
  const { decodeQrFrame } = await import('../../src/detail-information/model/qrScanner.js');
  const expected = 'JAGOFARM|AQ-PH-001|IOT-001';
  const modules = QRCode.create(expected, { errorCorrectionLevel: 'M' }).modules;
  const quietZone = 4;
  const scale = 6;
  const width = (modules.size + quietZone * 2) * scale;
  const data = new Uint8ClampedArray(width * width * 4);

  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const qrY = Math.floor(y / scale) - quietZone;
      const qrX = Math.floor(x / scale) - quietZone;
      const dark = qrY >= 0 && qrY < modules.size && qrX >= 0 && qrX < modules.size
        && modules.data[qrY * modules.size + qrX] === 1;
      const offset = (y * width + x) * 4;
      const color = dark ? 0 : 255;
      data[offset] = color;
      data[offset + 1] = color;
      data[offset + 2] = color;
      data[offset + 3] = 255;
    }
  }

  assert.equal(decodeQrFrame({ data, width, height: width }), expected);
});

test('offers the camera toggle only on mobile devices with front and back cameras', async () => {
  const { supportsQrCameraSwitch } = await import('../../src/detail-information/model/qrScanner.js');
  assert.equal(supportsQrCameraSwitch({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' }, 2), true);
  assert.equal(supportsQrCameraSwitch({ userAgentData: { mobile: true } }, 2), true);
  assert.equal(supportsQrCameraSwitch({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, 2), false);
  assert.equal(supportsQrCameraSwitch({ userAgentData: { mobile: true } }, 1), false);
});

test('switches QR camera direction between back and front', async () => {
  const { nextQrCameraFacingMode } = await import('../../src/detail-information/model/qrScanner.js');
  assert.equal(nextQrCameraFacingMode('environment'), 'user');
  assert.equal(nextQrCameraFacingMode('user'), 'environment');
});
