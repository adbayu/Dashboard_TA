import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { AksiBaris, Badge, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../shared/components/ui';
import { developerApi } from '../../services/developerApi.js';
import { IOT_SOURCE } from '../../services/iotApi.js';
import { developerDataEnabled } from '../../utils/frontendReview.js';
import SandboxPanel from '../../components/iot/SandboxPanel.jsx';

const SCOPES = [
  ['devices:read', 'Baca device'],
  ['devices:write', 'Kelola device'],
  ['readings:read', 'Baca pembacaan'],
  ['admin', 'Admin'],
];
const EMPTY_FORM = { name: '', environment: 'test', scopes: ['devices:read'] };

function formattedDate(value) {
  if (!value) return 'Belum pernah';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Belum pernah' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function shortDate(value) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`));
}

async function copyText(value) {
  if (!navigator.clipboard?.writeText) throw new Error('Fitur salin tidak tersedia di browser ini. Pilih teks lalu salin secara manual.');
  await navigator.clipboard.writeText(value);
}

export default function Developer() {
  const { role } = useSmart();
  const isAdmin = role === 'pengelola';
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [keysError, setKeysError] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [usageResult, setUsageResult] = useState(null);
  const [usageLoadVersion, setUsageLoadVersion] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [secretReveal, setSecretReveal] = useState(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [secretSaved, setSecretSaved] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [notice, setNotice] = useState('');

  const loadKeys = useCallback(async ({ quiet = false } = {}) => {
    if (!developerDataEnabled(IOT_SOURCE)) return;
    if (!quiet) {
      setLoadingKeys(true);
      setKeysError('');
    }
    try {
      const result = await developerApi.getKeys();
      setKeys(result.keys || []);
      setKeysError('');
    } catch (error) {
      setKeysError(error.message || 'Daftar API key tidak dapat dimuat.');
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (!developerDataEnabled(IOT_SOURCE)) return undefined;
    let active = true;
    developerApi.getKeys().then(result => {
      if (!active) return;
      setKeys(result.keys || []);
      setKeysError('');
    }).catch(error => {
      if (active) setKeysError(error.message || 'Daftar API key tidak dapat dimuat.');
    }).finally(() => {
      if (active) setLoadingKeys(false);
    });
    return () => { active = false; };
  }, []);

  const effectiveKeyId = keys.some(key => key.id === selectedKeyId) ? selectedKeyId : keys[0]?.id || '';
  const selectedKey = useMemo(() => keys.find(key => key.id === effectiveKeyId) || null, [keys, effectiveKeyId]);

  useEffect(() => {
    if (!developerDataEnabled(IOT_SOURCE) || !effectiveKeyId) return undefined;
    let active = true;
    developerApi.getUsage(effectiveKeyId, 7).then(result => {
      if (active) setUsageResult({ keyId: effectiveKeyId, usage: result.usage, error: '' });
    }).catch(error => {
      if (active) setUsageResult({ keyId: effectiveKeyId, usage: null, error: error.message || 'Pemakaian API tidak dapat dimuat.' });
    });
    return () => { active = false; };
  }, [effectiveKeyId, usageLoadVersion]);

  const selectedUsage = usageResult?.keyId === effectiveKeyId ? usageResult : null;
  const usage = selectedUsage?.usage || null;
  const usageError = selectedUsage?.error || '';
  const loadingUsage = Boolean(effectiveKeyId && !selectedUsage);
  const loadUsage = () => {
    setUsageResult(null);
    setUsageLoadVersion(version => version + 1);
  };

  const toggleScope = scope => setCreateForm(current => ({
    ...current,
    scopes: current.scopes.includes(scope) ? current.scopes.filter(value => value !== scope) : [...current.scopes, scope],
  }));

  const openCreate = () => {
    setCreateForm({ ...EMPTY_FORM, environment: 'test' });
    setCreateError('');
    setCreateOpen(true);
  };

  const submitCreate = async event => {
    event.preventDefault();
    if (!createForm.scopes.length) {
      setCreateError('Pilih minimal satu scope.');
      return;
    }
    setCreating(true);
    setCreateError('');
    setNotice('');
    try {
      const result = await developerApi.createKey({
        name: createForm.name.trim(),
        environment: isAdmin ? createForm.environment : 'test',
        scopes: isAdmin ? createForm.scopes : createForm.scopes.filter(scope => scope !== 'admin'),
      });
      setCreateOpen(false);
      setSecretReveal(result);
      setSecretCopied(false);
      setSecretSaved(false);
      setKeys(current => [result.key, ...current.filter(key => key.id !== result.key.id)]);
      setSelectedKeyId(result.key.id);
      await loadKeys({ quiet: true });
    } catch (error) {
      setCreateError(error.message || 'API key tidak dapat dibuat.');
    } finally {
      setCreating(false);
    }
  };

  const copySecret = async () => {
    try {
      await copyText(secretReveal.secret);
      setSecretCopied(true);
      setCreateError('');
    } catch (error) {
      setCreateError(error.message);
    }
  };

  const closeSecret = () => {
    if (!secretCopied && !secretSaved) return;
    setSecretReveal(null);
    setSecretCopied(false);
    setSecretSaved(false);
    setCreateError('');
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await developerApi.revokeKey(revokeTarget.id);
      setNotice(`API key ${revokeTarget.name} dicabut.`);
      setRevokeTarget(null);
      await loadKeys({ quiet: true });
    } catch (error) {
      setRevokeError(error.message || 'API key tidak dapat dicabut.');
    } finally {
      setRevoking(false);
    }
  };

  const days = usage?.daily || [];
  const maxRequests = Math.max(0, ...days.map(day => day.requests));
  const usageIsEmpty = usage && usage.totalRequests === 0;

  if (!developerDataEnabled(IOT_SOURCE)) {
    return (
      <Card>
        <div className="space-y-3">
          <Badge tone="muted" icon="science">Data contoh</Badge>
          <SectionTitle
            eyebrow="Dashboard API"
            title="Mode API diperlukan"
            subtitle="Pengelolaan API key dan pemakaian memerlukan mode API."
          />
          <p className="text-sm text-on-surface-variant">Data contoh tidak memuat key atau statistik pemakaian.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="iot-touch-targets min-w-0 space-y-5">
      {notice && <p role="status" className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-on-surface">{notice}</p>}

      <Card className="min-w-0" pad="sm">
        <SectionTitle
          eyebrow="Dashboard API"
          title="API key"
          subtitle="Secret hanya tampil sekali saat dibuat. Yang tersimpan hanya prefix."
          action={<div className="flex flex-wrap items-center gap-2">
            <a href="/docs/openapi.json" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-outline-variant/50 px-3 text-sm font-semibold text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Referensi API</a>
            <Button icon="add" onClick={openCreate}>Buat key</Button>
          </div>}
        />
        {loadingKeys ? <p role="status" className="py-5 text-sm text-on-surface-variant">Memuat API key...</p> : keysError ? (
          <div className="space-y-3 py-3" role="alert"><p className="text-sm text-on-surface">{keysError}</p><Button icon="refresh" onClick={() => loadKeys()}>Coba lagi</Button></div>
        ) : keys.length === 0 ? (
          <Empty title="Belum ada API key" hint="Buat key untuk mulai menggunakan API." icon="key" action={<Button icon="add" onClick={openCreate}>Buat key</Button>} />
        ) : (
          <Table head={['Nama', 'Environment', 'Prefix', 'Scope', 'Terakhir dipakai', 'Status', 'Aksi']}>
            {keys.map(key => (
              <tr key={key.id}>
                <td className="max-w-[14rem] break-words px-3 py-3 font-semibold text-on-surface">{key.name}</td>
                <td className="px-3 py-3"><Badge tone={key.environment === 'live' ? 'ok' : 'info'} icon={key.environment === 'live' ? 'bolt' : 'science'}>{key.environment === 'live' ? 'Live' : 'Test'}</Badge></td>
                <td className="px-3 py-3 font-mono text-xs text-on-surface-variant">{key.prefix}</td>
                <td className="max-w-[14rem] break-words px-3 py-3 text-sm text-on-surface-variant">{key.scopes.join(', ') || 'Tidak ada scope'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-on-surface-variant">{formattedDate(key.lastUsedAt)}</td>
                <td className="px-3 py-3">{key.revokedAt ? <Badge tone="bad" icon="block">Dicabut</Badge> : <Badge tone="ok" icon="check_circle">Aktif</Badge>}</td>
                <td className="px-3 py-3">
                  {!key.revokedAt && <AksiBaris><Button size="sm" variant="danger" onClick={() => { setRevokeError(''); setRevokeTarget(key); }}>Cabut</Button></AksiBaris>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="min-w-0" pad="sm">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <SectionTitle eyebrow="Pemakaian" title="Pemakaian 7 hari" subtitle="Ringkasan dan grafik berasal dari log API untuk key yang dipilih." />
          <div className="w-full max-w-xs">
            <Field label="API key">
              <Select value={effectiveKeyId} onChange={setSelectedKeyId} placeholder="Pilih key" options={keys.map(key => ({ value: key.id, label: `${key.name} · ${key.environment}` }))} disabled={keys.length === 0} />
            </Field>
          </div>
        </div>
        {loadingUsage ? <p role="status" className="py-5 text-sm text-on-surface-variant">Memuat pemakaian...</p> : usageError ? (
          <div className="space-y-3 py-3" role="alert"><p className="text-sm text-on-surface">{usageError}</p><Button icon="refresh" onClick={loadUsage}>Coba lagi</Button></div>
        ) : !selectedKey ? (
          <Empty title="Pilih API key" hint="Pemakaian akan muncul setelah key tersedia." icon="query_stats" />
        ) : usageIsEmpty ? (
          <Empty
            title={selectedKey?.lastUsedAt ? 'Tidak ada pemakaian dalam 7 hari terakhir' : 'Key belum pernah digunakan'}
            hint={selectedKey?.lastUsedAt ? 'Tidak ada request yang tercatat dalam rentang ini.' : 'Belum ada request yang tercatat dalam rentang 7 hari.'}
            icon="query_stats"
          />
        ) : usage ? (
          <div className="space-y-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <StatCard label="Request" value={usage.totalRequests} icon="swap_vert" hint="Dalam 7 hari terakhir" />
              <StatCard label="Error" value={`${usage.errorPercent}%`} icon="error" tone={usage.errorPercent > 0 ? 'warn' : 'brand'} hint="Respons dengan status 400 ke atas" />
              <StatCard label="Kena 429" value={usage.rateLimitedRequests} icon="speed" tone={usage.rateLimitedRequests > 0 ? 'warn' : 'brand'} hint="Request yang dibatasi" />
            </div>
            <figure className="min-w-0 rounded-2xl border border-outline-variant/40 p-3" role="img" aria-label={`Grafik request harian selama 7 hari untuk ${selectedKey.name}`}>
              <figcaption className="mb-3 text-sm font-semibold text-on-surface">Request per hari</figcaption>
              <div className="grid min-h-40 grid-cols-7 items-end gap-1 border-b border-outline-variant/50 sm:gap-3">
                {days.map(day => {
                  const height = maxRequests ? (day.requests / maxRequests) * 100 : 0;
                  return <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] tabular-nums text-on-surface-variant">{day.requests}</span>
                    <div className="w-full max-w-10 rounded-t-md bg-primary dark:bg-inverse-primary" style={{ height: `${height}%`, minHeight: day.requests ? '0.2rem' : 0 }} aria-label={`${shortDate(day.date)}: ${day.requests} request`} />
                    <span className="pb-1 text-center text-[9px] leading-tight text-on-surface-variant sm:text-[11px]">{shortDate(day.date)}</span>
                  </div>;
                })}
              </div>
            </figure>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-on-surface">Route terbanyak</h3>
              {usage.topRoutes?.length ? (
                <ol className="space-y-1">
                  {usage.topRoutes.slice(0, 5).map(item => <li key={item.route} className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 border-b border-outline-variant/30 py-2 text-sm">
                    <code className="min-w-0 break-all font-mono text-xs text-on-surface">{item.route}</code><span className="tabular-nums text-on-surface-variant">{item.requests} request</span>
                  </li>)}
                </ol>
              ) : <p className="text-sm text-on-surface-variant">Belum ada route yang tercatat.</p>}
            </div>
          </div>
        ) : <p className="py-5 text-sm text-on-surface-variant">Pemakaian belum tersedia.</p>}
      </Card>

      <SandboxPanel apiKeyPrefix={keys.find(key => key.environment === 'test' && !key.revokedAt)?.prefix || ''} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat API key">
        <form onSubmit={submitCreate} className="space-y-4">
          <Field label="Nama key"><Input value={createForm.name} onChange={value => setCreateForm(current => ({ ...current, name: value }))} maxLength={100} placeholder="Nama untuk mengenali key" required /></Field>
          <Field label="Environment">
            <Select value={isAdmin ? createForm.environment : 'test'} onChange={value => setCreateForm(current => ({ ...current, environment: value }))} options={isAdmin ? [{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }] : [{ value: 'test', label: 'Test' }]} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Scope</legend>
            {SCOPES.filter(([scope]) => isAdmin || scope !== 'admin').map(([scope, label]) => (
              <label key={scope} className="flex min-h-10 items-center gap-2 rounded-xl border border-outline-variant/30 px-3 text-sm text-on-surface">
                <input type="checkbox" checked={createForm.scopes.includes(scope)} onChange={() => toggleScope(scope)} className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                <span>{label}</span><code className="ml-auto font-mono text-xs text-on-surface-variant">{scope}</code>
              </label>
            ))}
          </fieldset>
          {!isAdmin && <p className="text-xs text-on-surface-variant">{role === 'mitra' ? 'Akun mitra hanya dapat membuat key Test tanpa scope admin. Sandbox tetap terpisah untuk setiap akun.' : 'Akun pengguna hanya dapat membuat key Test tanpa scope admin.'} Server tetap memeriksa izin.</p>}
          {createError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{createError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => setCreateOpen(false)}>Batal</Button><Button type="submit" icon="key" disabled={creating || createForm.scopes.length === 0}>{creating ? 'Membuat...' : 'Buat key'}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(secretReveal)} onClose={closeSecret} title="Simpan key ini sekarang" closeDisabled={Boolean(secretReveal && !secretCopied && !secretSaved)}>
        {secretReveal && <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">{secretReveal.key.name} · {secretReveal.key.environment === 'live' ? 'Live' : 'Test'} · {secretReveal.key.scopes.join(', ')}</p>
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">Key ini tidak akan ditampilkan lagi. Kalau hilang, cabut lalu buat key baru.</p>
          <div className="flex min-w-0 flex-wrap gap-2">
            <code aria-label="Secret API key" className="min-w-0 flex-1 break-all rounded-xl bg-surface-container-high px-3 py-3 font-mono text-xs text-on-surface">{secretReveal.secret}</code>
            <Button variant="ghost" icon={secretCopied ? 'check' : 'content_copy'} onClick={copySecret}>{secretCopied ? 'Tersalin' : 'Salin'}</Button>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm text-on-surface"><input type="checkbox" checked={secretSaved} onChange={event => setSecretSaved(event.target.checked)} className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />Sudah saya simpan di tempat aman</label>
          {createError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{createError}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!secretCopied && !secretSaved && <span className="text-xs text-on-surface-variant">Salin atau centang dulu untuk menutup.</span>}
            <Button disabled={!secretCopied && !secretSaved} onClick={closeSecret}>Tutup</Button>
          </div>
        </div>}
      </Modal>

      <Modal open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} title="Cabut API key">
        {revokeTarget && <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">Cabut key <strong className="text-on-surface">{revokeTarget.name}</strong>? Semua request dengan key ini langsung ditolak.</p>
          {revokeError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{revokeError}</p>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRevokeTarget(null)}>Batal</Button><Button variant="danger" icon="block" disabled={revoking} onClick={confirmRevoke}>{revoking ? 'Mencabut...' : 'Cabut key'}</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
