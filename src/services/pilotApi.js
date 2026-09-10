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
  catch { throw new Error('Respons API tidak valid. Periksa routing /api.'); }
  if (!response.ok) throw Object.assign(new Error(data.error?.message ?? 'Permintaan gagal.'), { status: response.status });
  return data;
}
