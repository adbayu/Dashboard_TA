const FAILURE_LIMIT = 20;
const WINDOW_MS = 60_000;

type FailureWindow = {
  failures: number;
  resetAt: number;
};

export class ApiKeyFailureLimit {
  private readonly windows = new Map<string, FailureWindow>();

  lockoutFor(ip: string, now = Date.now()) {
    const window = this.windows.get(ip);
    if (!window) return null;
    if (window.resetAt <= now) {
      this.windows.delete(ip);
      return null;
    }
    if (window.failures < FAILURE_LIMIT) return null;
    return {
      resetAt: window.resetAt,
      retryAfter: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  recordFailure(ip: string, now = Date.now()) {
    this.cleanupExpired(now);
    let window = this.windows.get(ip);
    if (!window || window.resetAt <= now) {
      window = { failures: 0, resetAt: now + WINDOW_MS };
      this.windows.set(ip, window);
    }
    window.failures = Math.min(FAILURE_LIMIT, window.failures + 1);
  }

  cleanupExpired(now = Date.now()) {
    for (const [ip, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(ip);
    }
  }
}
