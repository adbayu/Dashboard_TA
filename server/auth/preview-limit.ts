/**
 * Batas kuota pratinjau QR anonim.
 *
 * `GET /api/v1/devices?code=` memang publik supaya halaman /d/:code bisa dibuka
 * sebelum login, tetapi kode device berurutan (AQ-001, AQ-002, ...). Tanpa batas,
 * satu klien bisa memanen nama/area seluruh unit hanya dengan menaikkan nomor.
 * Batas ini per IP dan hanya berlaku untuk permintaan tanpa kredensial apa pun.
 */
const PREVIEW_LIMIT = 20;
const PREVIEW_WINDOW_MS = 10 * 60_000;

type PreviewWindow = { count: number; resetAt: number };

export class AnonymousPreviewLimit {
  private readonly windows = new Map<string, PreviewWindow>();

  /** Catat satu permintaan pratinjau anonim dan kembalikan status kuotanya. */
  consume(ip: string, now = Date.now()): { allowed: boolean; remaining: number; resetAt: number } {
    this.cleanupExpired(now);
    let window = this.windows.get(ip);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + PREVIEW_WINDOW_MS };
      this.windows.set(ip, window);
    }
    if (window.count >= PREVIEW_LIMIT) return { allowed: false, remaining: 0, resetAt: window.resetAt };
    window.count += 1;
    return { allowed: true, remaining: PREVIEW_LIMIT - window.count, resetAt: window.resetAt };
  }

  cleanupExpired(now = Date.now()) {
    for (const [ip, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(ip);
    }
  }
}
