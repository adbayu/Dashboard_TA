import { iotRequestGovernor } from '../../services/iotRequestGovernor.js';

export async function pilotApi(path, { method = 'GET', body, signal, priority = method === 'GET' ? 'latest' : 'user' } = {}) {
  return iotRequestGovernor.run(async requestSignal => {
    let response;
    try {
      response = await fetch('/api' + path, {
        method, credentials: 'same-origin',
        signal: requestSignal ? AbortSignal.any([requestSignal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
    }
    iotRequestGovernor.observeResponse(response);
    if (response.status === 204) return undefined;
    let data;
    try { data = await response.json(); }
    catch {
      // B-9 (audit-002): dulu semua badan non-JSON disebut "periksa routing /api",
      // padahal sebabnya bisa lain (endpoint salah, halaman HTML dari proxy, atau
      // backend bukan API). Sebut kenyataannya, jangan menebak penyebabnya.
      throw new Error('Balasan /api tidak berupa JSON. Server tidak menjawab sebagai API.');
    }
    if (!response.ok) {
      const error = Object.assign(new Error(data.error?.message ?? 'Permintaan gagal.'), { status: response.status });
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')?.trim();
        const seconds = Number(retryAfter);
        const retryAt = Date.parse(retryAfter || '');
        error.retryAfterMs = Number.isFinite(seconds) && seconds >= 0
          ? seconds * 1_000
          : Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 0;
      }
      throw error;
    }
    return data;
  }, { signal, priority });
}
