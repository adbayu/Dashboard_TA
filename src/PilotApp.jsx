import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { pilotApi } from './services/pilotApi';
import './pilot.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const date = value => value ? new Date(value).toLocaleString('id-ID') : 'Belum ada data';
const statusNames = { online: 'Terhubung', stale: 'Data terlambat', offline: 'Tidak terhubung' };

function usePolling(path) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const active = useRef(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    try {
      const result = await pilotApi(path, { signal: controller.signal });
      if (active.current !== controller) return;
      setSnapshot({ path, data: result, updatedAt: new Date().toISOString() }); setError('');
    } catch (failure) {
      if (active.current !== controller) return;
      if (failure.status === 401) { window.location.assign('/'); return; }
      setError(controller.signal.aborted ? 'Waktu tunggu backend habis. Silakan Segarkan.' : failure.message);
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh(); };
    const initial = setTimeout(visibleRefresh, 0);
    const visibility = () => {
      if (document.visibilityState === 'visible') void refresh();
      else { active.current?.abort(); active.current = null; }
    };
    const timer = setInterval(visibleRefresh, 30000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', visibleRefresh);
    return () => {
      clearTimeout(initial); clearInterval(timer); active.current?.abort(); active.current = null;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', visibleRefresh);
    };
  }, [refresh]);
  return { data: snapshot?.path === path ? snapshot.data : null, error, loading, updatedAt: snapshot?.path === path ? snapshot.updatedAt : null, refresh };
}

function ErrorNotice({ error }) { return error ? <p className="pilot-error" role="alert">{error}</p> : null; }
function Field({ label, ...props }) { return <label className="pilot-field">{label}<input {...props} /></label>; }
function ActionForm({ children, action, button, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true); setError('');
    try { const result = await action(values); form.reset(); await onSuccess?.(result); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy}>{children}<button type="submit" className="pilot-button">{busy ? 'Memproses…' : button}</button></fieldset>
    <ErrorNotice error={error} />
  </form>;
}

function Login({ onLogin, invitation, onAccepted }) {
  const [message, setMessage] = useState('');
  return <div className="pilot-auth-layout"><aside className="pilot-auth-story">
    <p className="pilot-eyebrow">JAGOFARM / RUANG PANTAU</p>
    <h2>Kebun terpantau.<br />Data tetap milik Anda.</h2>
    <p>Satu ruang untuk melihat kondisi setiap unit, dari pengukuran terakhir hingga riwayatnya.</p>
    <svg className="pilot-field-art" viewBox="0 0 440 180" fill="none" aria-hidden="true"><path d="M-20 180C80 15 195 10 300 180M50 190C130 65 215 60 270 190M145 190C185 130 210 130 225 190M200 10C275 10 350 85 465 95M225 35C300 35 345 110 465 120M260 65C330 65 360 140 465 150" stroke="currentColor" strokeWidth="2" /><circle cx="110" cy="28" r="12" fill="currentColor" /></svg>
    <ol className="pilot-steps"><li><span>01</span><div><strong>Akun pribadi</strong><p>Aktivasi melalui undangan Admin Pilot.</p></div></li><li><span>02</span><div><strong>Perangkat terhubung</strong><p>Pasangkan unit dengan kode sekali pakai.</p></div></li><li><span>03</span><div><strong>Data dalam konteks</strong><p>Sensor, satuan, dan waktu pengukuran yang jelas.</p></div></li></ol>
    <p className="pilot-story-note">Tahap pilot software · Belum menggunakan hardware fisik</p>
  </aside><section className="pilot-login pilot-panel">
    <p className="pilot-eyebrow">PILOT SOFTWARE / SIMULATOR</p>
    <h1>{invitation ? 'Aktifkan akun pilot' : 'Selamat datang kembali'}</h1>
    <p>Akun melalui undangan Admin Pilot. Tidak ada pembayaran atau perangkat fisik dalam pengujian ini.</p>
    <ActionForm key={invitation || 'login'} button={invitation ? 'Verifikasi email & buat password' : 'Masuk'}
      action={values => pilotApi(invitation ? '/invitations/accept' : '/session/login', { method: 'POST', body: invitation ? { token: invitation, password: values.password } : values })}
      onSuccess={result => { if (invitation) { setMessage(result.message); onAccepted(); } else onLogin(result.user); }}>
      {!invitation && <Field label="Email" name="email" type="email" autoComplete="username" required maxLength={254} />}
      <Field label="Password (12–128 karakter)" name="password" type="password" minLength={12} maxLength={128} autoComplete={invitation ? 'new-password' : 'current-password'} required />
    </ActionForm>
    {message && <p role="status">{message}</p>}
    <a className="pilot-link" href="/demo/">Lihat UI lama — Data contoh / Demo</a>
  </section></div>;
}

function RefreshBar({ state }) {
  return <div className="pilot-refresh"><span aria-live="polite">{state.loading ? 'Memuat…' : 'Diperbarui: ' + date(state.updatedAt)}</span>
    <button className="pilot-button secondary" disabled={state.loading} onClick={state.refresh}><span aria-hidden="true">↻</span> Segarkan</button></div>;
}

function Devices() {
  const state = usePolling('/devices');
  const [pairing, setPairing] = useState(false);
  const navigate = useNavigate();
  return <>
    <div className="pilot-heading"><div><p className="pilot-eyebrow">DASHBOARD / PERANGKAT SAYA</p><h1>Ringkasan perangkat</h1><p>Pantau tiap unit, tanpa mencampur data antarperangkat.</p></div>
      <button className="pilot-button" aria-expanded={pairing} aria-controls="pilot-pairing" onClick={() => setPairing(!pairing)}><span aria-hidden="true">+</span> Tambah Perangkat</button></div>
    <dl className="pilot-metrics" aria-label="Ringkasan koneksi perangkat">
      <div><dt>Total perangkat</dt><dd><span>{state.data && !state.error ? state.data.devices.length : '—'}</span><small>Unit pada akun Anda</small></dd></div>
      {['online', 'stale', 'offline'].map(status => <div key={status} className={'pilot-metric ' + status}><dt>{statusNames[status]}</dt><dd><span>{state.data && !state.error ? state.data.devices.filter(device => device.status === status).length : '—'}</span><small>{status === 'online' ? 'Koneksi tersedia' : status === 'stale' ? 'Pengukuran ≥90 detik' : 'Tanpa kiriman ≥3 menit'}</small></dd></div>)}
    </dl>
    {pairing && <section id="pilot-pairing" className="pilot-panel pilot-pairing"><p className="pilot-eyebrow">PEMASANGAN UNIT</p><h2>Pasangkan perangkat simulator</h2><p>Gunakan kode sekali pakai yang dialokasikan admin untuk akun Anda. Bukan kredensial pengiriman perangkat.</p>
      <ActionForm button="Pasangkan" action={values => pilotApi('/devices/pair', { method: 'POST', body: values })} onSuccess={result => navigate('/perangkat/' + result.deviceId)}>
        <Field label="Kode aktivasi" name="code" required minLength={64} maxLength={64} pattern="[a-f0-9]{64}" autoComplete="off" />
      </ActionForm></section>}
    <RefreshBar state={state} /><ErrorNotice error={state.error} />
    {state.error && state.data && <p>Nilai terakhir ditampilkan; koneksi dan status belum dapat diperbarui.</p>}
    {state.loading && !state.data && <div className="pilot-loading" role="status"><span className="pilot-loading-dot" aria-hidden="true" />Menyiapkan daftar perangkat…</div>}
    {state.data?.devices.length === 0 && <section className="pilot-panel pilot-empty"><span className="pilot-empty-mark" aria-hidden="true">+</span><p className="pilot-eyebrow">MULAI DARI SATU UNIT</p><h2>Belum ada perangkat</h2><p>Minta alokasi simulator dari Admin Pilot, lalu pilih Tambah Perangkat. Tidak ada telemetri contoh dalam akun ini.</p></section>}
    <div className="pilot-device-list">{state.data?.devices.map(device => <Link className="pilot-panel pilot-device" key={device.id} to={'/perangkat/' + device.id}>
      <div className="pilot-device-top"><span className="pilot-eyebrow">{device.model === 'water-v1' ? 'PEMANTAU AIR' : 'PEMANTAU LINGKUNGAN'}</span><span className={'pilot-status ' + (state.error ? 'stale' : device.status)}>{state.error ? 'Status belum terverifikasi' : statusNames[device.status]}</span></div>
      <div><h2>{device.name}</h2><p className="pilot-device-model">{device.model} · Simulator melalui backend</p></div>
      {device.sensors?.length > 0 && <dl className="pilot-device-values">{device.sensors.map(sensor => <div key={sensor.code}><dt>{sensor.name}</dt><dd>{device.readings?.[sensor.code]?.toLocaleString('id-ID', { maximumFractionDigits: 2 }) ?? '—'} <small>{sensor.unit}</small></dd></div>)}</dl>}
      <div className="pilot-device-bottom"><p><span>Pengukuran terakhir</span>{date(device.measured_at)}</p><span className="pilot-device-arrow" aria-hidden="true">↗</span><span className="sr-only">Lihat detail</span></div>
    </Link>)}</div>
    <p className="pilot-note">Alert sensor dan email peringatan belum aktif — Sprint 2. Terhubung bukan berarti kondisi sensor normal.</p>
  </>;
}

function DeviceDetail() {
  const { id } = useParams();
  const state = usePolling('/devices/' + id);
  const history = usePolling('/devices/' + id + '/history');
  const [pagination, setPagination] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [moreLoading, setMoreLoading] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const navigate = useNavigate();
  const device = state.data?.device;
  const older = pagination?.head === history.data ? pagination.rows : [];
  const cursor = pagination?.head === history.data ? pagination.cursor : history.data?.nextCursor;
  const rows = [...(history.data?.readings ?? []), ...older];
  const plot = [...rows].reverse();
  return <>
    <Link className="pilot-link" to="/">← Semua perangkat</Link>
    <div className="pilot-heading"><div><p className="pilot-eyebrow">PERANGKAT / SIMULATOR MELALUI BACKEND</p><h1>{device?.name ?? 'Detail perangkat'}</h1><p>{device?.model} · Nilai dan riwayat khusus unit ini</p></div></div>
    <RefreshBar state={{ ...state, loading: state.loading || history.loading, refresh: () => { void state.refresh(); void history.refresh(); } }} />
    <ErrorNotice error={state.error} /><ErrorNotice error={history.error || historyError} />
    {device && <>
      <section className="pilot-panel pilot-connection"><div><p className="pilot-eyebrow">STATUS KONEKSI</p><span className={'pilot-status ' + (state.error ? 'stale' : device.status)}>{state.error ? 'Status belum terverifikasi' : statusNames[device.status]}</span></div>
        <dl><div><dt>Pengukuran terakhir</dt><dd>{date(device.measured_at)}</dd></div><div><dt>Kiriman diterima server</dt><dd>{date(device.last_received_at)}</dd></div></dl>
        <p>Data terlambat ≥90 detik; offline ≥3 menit tanpa kiriman. Nilai lama bukan kondisi normal.</p></section>
      <div className="pilot-sensors">{device.sensors.map(sensor => <section className="pilot-panel pilot-sensor-value" key={sensor.code}><h2>{sensor.name}</h2>
        <p className="pilot-value">{device.readings?.[sensor.code]?.toLocaleString('id-ID', { maximumFractionDigits: 2 }) ?? '—'} <small>{sensor.unit}</small></p>
        <p>{date(device.measured_at)}</p></section>)}</div>
      <h2 className="pilot-section-title">Riwayat pengukuran</h2>
      {!rows.length && !history.loading && !history.error && <p>Belum ada kiriman. Jalankan simulator setelah pemasangan.</p>}
      {rows.length > 0 && <>
        <p>Grafik berdasarkan waktu pengukuran asli. Tabel menyediakan nilai yang sama.</p>
        <div className="pilot-sensors">{device.sensors.map(sensor => <section className="pilot-panel pilot-chart-panel" key={sensor.code}><h3>{sensor.name} ({sensor.unit})</h3>
          <div className="pilot-chart"><Line aria-label={'Grafik ' + sensor.name} role="img" data={{ labels: plot.map(row => date(row.measured_at)), datasets: [{ label: sensor.unit, data: plot.map(row => row.readings[sensor.code]), borderColor: '#165b3f', backgroundColor: '#165b3f', pointRadius: 1, borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 4 } } } }} /></div>
        </section>)}</div>
        <div className="pilot-table" tabIndex={0} role="region" aria-label="Tabel riwayat, dapat digulir"><table><caption>Riwayat unit ini, periode kepemilikan akun Anda</caption><thead><tr><th scope="col">Waktu pengukuran</th>{device.sensors.map(sensor => <th scope="col" key={sensor.code}>{sensor.name} ({sensor.unit})</th>)}<th scope="col">Diterima server</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.message_id}><td>{date(row.measured_at)}</td>{device.sensors.map(sensor => <td key={sensor.code}>{row.readings[sensor.code]?.toLocaleString('id-ID', { maximumFractionDigits: 3 }) ?? '—'}</td>)}<td>{date(row.received_at)}</td></tr>)}</tbody></table></div>
        {cursor && <button className="pilot-button secondary" disabled={moreLoading || history.loading} onClick={async () => {
          setMoreLoading(true); setHistoryError('');
          try { const result = await pilotApi('/devices/' + id + '/history?cursor=' + encodeURIComponent(cursor)); setPagination({ head: history.data, rows: [...older, ...result.readings], cursor: result.nextCursor }); }
          catch (failure) { setHistoryError(failure.message); }
          finally { setMoreLoading(false); }
        }}>{moreLoading ? 'Memuat…' : 'Muat 100 sebelumnya'}</button>}
      </>}
      <section className="pilot-panel pilot-danger"><p className="pilot-eyebrow">KEPEMILIKAN PERANGKAT</p><h2>Lepas perangkat</h2><p>Unit tidak lagi tampil sebagai perangkat aktif. Riwayat lama tetap terisolasi pada akun ini; tidak dibagikan ke pemilik berikutnya. Admin harus menerbitkan kode baru sebelum unit dipasang kembali.</p>
        {!confirmRelease ? <button className="pilot-button secondary" onClick={() => setConfirmRelease(true)}>Lepas perangkat…</button> : <>
          <ActionForm button="Konfirmasi lepas perangkat" action={() => pilotApi('/devices/' + id + '/release', { method: 'POST' })} onSuccess={() => navigate('/')}><p>Yakin melepas {device.name}?</p></ActionForm>
          <button className="pilot-button secondary" onClick={() => setConfirmRelease(false)}>Batal</button></>}
      </section>
    </>}
  </>;
}

function Admin() {
  const state = usePolling('/admin/users');
  const modelState = usePolling('/models');
  const [message, setMessage] = useState('');
  const [provision, setProvision] = useState(null);
  return <>
    <div className="pilot-heading"><div><p className="pilot-eyebrow">ADMIN PILOT / AKSES & UNIT</p><h1>Pengguna & alokasi simulator</h1><p>Maksimal 10 akun termasuk admin, total 20 unit. Admin tidak mendapat akses otomatis ke telemetri pengguna.</p></div></div>
    <ErrorNotice error={state.error || modelState.error} />
    <div className="pilot-admin-grid"><section className="pilot-panel"><p className="pilot-eyebrow">01 / AKUN</p><h2>Undang pengguna</h2><p>Undangan dikirim melalui SMTP; gunakan mailbox uji saat pengembangan.</p>
      <ActionForm button="Kirim undangan" action={body => pilotApi('/admin/invitations', { method: 'POST', body })} onSuccess={result => { setMessage(result.message); void state.refresh(); }}>
        <Field label="Email pengguna" name="email" type="email" required maxLength={254} />
      </ActionForm><p role="status">{message}</p></section>
    <section className="pilot-panel"><p className="pilot-eyebrow">02 / PERANGKAT</p><h2>Alokasikan unit</h2><p>Siapkan unit baru atau terbitkan ulang akses unit yang sudah dilepas.</p>
      <ActionForm button="Terbitkan kode & kredensial" action={values => { const body = { ...values }; if (!body.deviceId) delete body.deviceId; return pilotApi('/admin/devices', { method: 'POST', body }); }} onSuccess={setProvision}>
        <div className="pilot-field"><label htmlFor="pilot-user">Akun tujuan</label><select id="pilot-user" name="userId" required defaultValue=""><option value="" disabled>Pilih akun terverifikasi</option>{state.data?.users.filter(user => user.verified).map(user => <option key={user.id} value={user.id}>{user.email}</option>)}</select></div>
        <Field label="Nama unit" name="name" required maxLength={100} />
        <div className="pilot-field"><label htmlFor="pilot-model">Model</label><select id="pilot-model" name="model" required defaultValue=""><option value="" disabled>Pilih model</option>{Object.entries(modelState.data?.models ?? {}).map(([key, model]) => <option key={key} value={key}>{model.name}</option>)}</select></div>
        <Field label="ID unit lama (opsional, hanya unit yang sudah dilepas; kredensial lama akan diganti)" name="deviceId" />
      </ActionForm>
      {provision && <div role="status" className="pilot-secret"><h3>Simpan sekarang — rahasia hanya ditampilkan sekali</h3><p>Kirim kode aktivasi hanya ke pengguna tujuan. Kredensial hanya untuk operator simulator, jangan dimasukkan ke frontend atau Git.</p>
        <dl>{Object.entries(provision).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><code>{value}</code></dd></div>)}</dl><button className="pilot-button secondary" onClick={() => setProvision(null)}>Sembunyikan rahasia</button></div>}
    </section></div>
    <section className="pilot-panel"><h2>Akun pilot</h2><RefreshBar state={state} /><ul className="pilot-user-list">{state.data?.users.map(user => <li key={user.id}><div><strong>{user.email}</strong><span>{user.role === 'admin' ? 'Admin Pilot' : 'Pengguna'}</span></div><span className={'pilot-status ' + (user.verified ? 'online' : 'stale')}>{user.verified ? 'Terverifikasi' : 'Menunggu undangan'}</span></li>)}</ul></section>
  </>;
}

export default function PilotApp() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('invite');
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  });
  useEffect(() => {
    if (window.location.hash.startsWith('#invite=')) window.history.replaceState(null, '', window.location.pathname);
    let current = true;
    pilotApi('/session').then(result => { if (current) setUser(result.user); }).catch(failure => { if (current && failure.status !== 401) setError(failure.message); }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  return <BrowserRouter><div className="pilot-shell">
    <a href="#pilot-main" className="pilot-skip">Langsung ke konten</a>
    <header className="pilot-header"><Link to="/" className="pilot-brand"><svg className="pilot-brand-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 26V14m0 5C7 20 5 14 6 7c7 0 12 3 10 12Zm0-4C16 7 21 5 27 5c1 7-3 11-11 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>JagoFarm <span>Pilot</span></Link>
      {user && <nav aria-label="Navigasi pilot"><NavLink to="/" end>Perangkat</NavLink>{user.role === 'admin' && <NavLink to="/admin">Admin Pilot</NavLink>}<button onClick={async () => {
        try { await pilotApi('/session/logout', { method: 'POST' }); setUser(null); setError(''); }
        catch (failure) { if (failure.status === 401) setUser(null); else setError(failure.message); }
      }}>Keluar</button></nav>}</header>
    <main id="pilot-main" className="pilot-main"><ErrorNotice error={error} />
      {!ready ? <p role="status">Memeriksa sesi…</p> : !user || invitation ? <Login onLogin={value => { setUser(value); setError(''); }} invitation={invitation} onAccepted={() => setInvitation(null)} /> : <>
        <div className="pilot-account"><span className="pilot-account-identity"><span className="pilot-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>{user.email}</span><span>Simulator melalui backend <span aria-hidden="true">·</span> Polling 30 detik saat halaman aktif</span></div>
        <Routes><Route path="/" element={<Devices />} /><Route path="/perangkat/:id" element={<DeviceDetail />} /><Route path="/admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
      </>}
    </main><footer className="pilot-footer">Pilot software. Bukan hardware fisik. RAG, alert email, dan pembayaran nyata belum aktif.</footer>
  </div></BrowserRouter>;
}
