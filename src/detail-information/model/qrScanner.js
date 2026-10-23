import jsQR from 'jsqr';

export function canOpenQrCamera(navigatorObject) {
  return typeof navigatorObject?.mediaDevices?.getUserMedia === 'function';
}

export function supportsQrCameraSwitch(navigatorObject, videoInputCount) {
  const userAgent = String(navigatorObject?.userAgent || '');
  const isMobile = navigatorObject?.userAgentData?.mobile === true
    || /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  return isMobile && Number(videoInputCount) >= 2;
}

export function nextQrCameraFacingMode(current) {
  return current === 'environment' ? 'user' : 'environment';
}

export function decodeQrFrame(imageData) {
  if (!imageData?.data || !imageData.width || !imageData.height) return null;
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });
  return result?.data || null;
}
