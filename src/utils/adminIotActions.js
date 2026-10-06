export function performActivationLabelAction(action, device, { onConfirmationChange, renewActivationCode }) {
  if (action === 'request') {
    onConfirmationChange(device);
    return undefined;
  }

  onConfirmationChange(null);
  if (action !== 'confirm' || !device) return undefined;
  return renewActivationCode(device);
}

export function credentialRevealCanClose({ credential, copied, saved }) {
  return !credential || Boolean(copied || saved);
}

export function canRotateDeviceCredential(device) {
  return Boolean(device && device.isSandbox === false && device.credentialProvisioned === true);
}
