export async function pilotApi(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method, credentials: 'same-origin', signal: signal ?? AbortSignal.timeout(15000),
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
  }
  let data;
  try { data = await response.json(); }
  catch {
    // B-9 (audit-002): dulu semua badan non-JSON disebut "periksa routing /api",
    // padahal sebabnya bisa lain (endpoint salah, halaman HTML dari proxy, atau
    // backend bukan API). Sebut kenyataannya, jangan menebak penyebabnya.
    throw new Error('Balasan /api tidak berupa JSON. Server tidak menjawab sebagai API.');
  }
  if (!response.ok) throw Object.assign(new Error(data.error?.message ?? 'Permintaan gagal.'), { status: response.status });
  return data;
}
