export const ACTIVATION_CODE_TTL_MS = 10 * 60_000;

export function createActivationCodeMemory({
  nowImpl = () => Date.now(),
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  let value = null;
  let timer = null;
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) listener();
  }

  function clear() {
    if (timer !== null) clearTimeoutImpl(timer);
    timer = null;
    value = null;
    notify();
  }

  function get(deviceCode) {
    if (!value) return '';
    if (nowImpl() >= value.expiresAt) {
      clear();
      return '';
    }
    return value.deviceCode === deviceCode ? value.activationCode : '';
  }

  function peek(deviceCode) {
    if (!value || nowImpl() >= value.expiresAt) return '';
    return value.deviceCode === deviceCode ? value.activationCode : '';
  }

  return {
    set(deviceCode, activationCode) {
      if (timer !== null) clearTimeoutImpl(timer);
      value = { deviceCode, activationCode, expiresAt: nowImpl() + ACTIVATION_CODE_TTL_MS };
      timer = setTimeoutImpl(() => clear(), ACTIVATION_CODE_TTL_MS);
      notify();
    },
    get,
    peek,
    clear,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const activationCodeMemory = createActivationCodeMemory();

export async function claimAndForgetActivationCode(memory, claimRequest) {
  const result = await claimRequest();
  memory.clear();
  return result;
}

export function beginActivationCodeLogout(memory = activationCodeMemory) {
  memory.clear();
}
