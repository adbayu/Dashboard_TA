/**
 * Lockout login per alamat email.
 *
 * Rate limit @fastify/rate-limit hanya menghitung per IP, sehingga brute force
 * dari banyak IP tidak pernah kena. Hitungan per email menutup celah itu dan
 * sekaligus menghemat CPU karena permintaan yang terkunci tidak menjalankan scrypt.
 */
const FAILURE_LIMIT = 8;
const WINDOW_MS = 15 * 60_000;

type LoginWindow = { failures: number; resetAt: number };

export class LoginFailureLimit {
  private readonly windows = new Map<string, LoginWindow>();

  /** Kembalikan sisa percobaan, atau null bila email sedang terkunci. */
  lockoutFor(email: string, now = Date.now()): { resetAt: number; retryAfter: number } | null {
    const window = this.windows.get(email);
    if (!window) return null;
    if (window.resetAt <= now) {
      this.windows.delete(email);
      return null;
    }
    if (window.failures < FAILURE_LIMIT) return null;
    return { resetAt: window.resetAt, retryAfter: Math.max(1, Math.ceil((window.resetAt - now) / 1000)) };
  }

  recordFailure(email: string, now = Date.now()) {
    this.cleanupExpired(now);
    let window = this.windows.get(email);
    if (!window || window.resetAt <= now) {
      window = { failures: 0, resetAt: now + WINDOW_MS };
      this.windows.set(email, window);
    }
    window.failures = Math.min(FAILURE_LIMIT, window.failures + 1);
  }

  clear(email: string) {
    this.windows.delete(email);
  }

  cleanupExpired(now = Date.now()) {
    for (const [email, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(email);
    }
  }
}
