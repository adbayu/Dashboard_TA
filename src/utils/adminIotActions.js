export function performActivationLabelAction(action, device, { onConfirmationChange, renewActivationCode }) {
  if (action === 'request') {
    onConfirmationChange(device);
    return undefined;
  }

  onConfirmationChange(null);
  if (action !== 'confirm' || !device) return undefined;
  return renewActivationCode(device);
}
