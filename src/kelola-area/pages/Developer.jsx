import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageHeader, Select, StatusPill, Table } from '../../shared/components/ui';
import { kelasTombol } from '../../shared/components/ui/tombol.js';
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
const JUDUL = 'Developer';
const SUBJUDUL = 'Kelola API key untuk mengirim dan membaca data dari alat Anda sendiri.';
const GALAT = 'text-sm font-semibold text-bad-fg';
const ANGKA = 'font-num text-[22px] font-bold leading-7';

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

function GalatMuat({ pesan, onRetry }) {
  return (
    <Alert tone="bad">
      <p>{pesan}</p>
      <Button variant="secondary" size="sm" icon="refresh-cw" className="mt-2" onClick={onRetry}>Coba lagi</Button>
    </Alert>
  );
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
      <div>
        <PageHeader title={JUDUL} subtitle={SUBJUDUL} sample />
        <Alert tone="info" title="Mode API diperlukan.">
          Pengelolaan API key dan pemakaian memerlukan mode API. Data contoh tidak memuat key atau statistik pemakaian.
        </Alert>
      </div>
    );
  }

  const kolomKey = [
    { key: 'name', label: 'Nama', render: key => <span className="break-words font-semibold">{key.name}</span> },
    {
      key: 'environment',
      label: 'Environment',
      render: key => (key.environment === 'live'
        ? <StatusPill tone="ok" icon="zap">Live</StatusPill>
        : <StatusPill tone="info" icon="flask-conical">Test</StatusPill>),
    },
    { key: 'prefix', label: 'Prefix', render: key => <span className="font-num text-sm text-text-2">{key.prefix}</span> },
    { key: 'scopes', label: 'Scope', render: key => <span className="break-words text-sm text-text-2">{key.scopes.join(', ') || 'Tidak ada scope'}</span> },
    { key: 'lastUsedAt', label: 'Terakhir dipakai', render: key => <span className="whitespace-nowrap text-sm text-text-2">{formattedDate(key.lastUsedAt)}</span> },
    {
      key: 'status',
      label: 'Status',
      render: key => (key.revokedAt
        ? <StatusPill tone="bad" icon="ban">Dicabut</StatusPill>
        : <StatusPill tone="ok" icon="circle-check">Aktif</StatusPill>),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: key => (key.revokedAt ? null : (
        <Button size="sm" variant="danger" icon="ban" aria-label={`Cabut key ${key.name}`} onClick={() => { setRevokeError(''); setRevokeTarget(key); }}>
          Cabut
        </Button>
      )),
    },
  ];

  return (
    <div className="iot-touch-targets min-w-0">
      <PageHeader
        title={JUDUL}
        subtitle={SUBJUDUL}
        actions={(
          <>
            <a data-ui="button" href="/docs/openapi.json" target="_blank" rel="noopener noreferrer" className={kelasTombol({ variant: 'secondary', tautan: true })}>Referensi API</a>
            <Button icon="plus" onClick={openCreate}>Buat key</Button>
          </>
        )}
      />

      <div className="flex min-w-0 flex-col gap-5">
        {notice && <Alert tone="ok" live="status">{notice}</Alert>}

        <Card title="API key" subtitle="Secret hanya tampil sekali saat dibuat. Yang tersimpan hanya prefix.">
          {loadingKeys ? <p role="status" className="py-3 text-sm text-text-2">Memuat API key...</p> : keysError ? (
            <GalatMuat pesan={keysError} onRetry={() => loadKeys()} />
          ) : keys.length === 0 ? (
            <EmptyState title="Belum ada API key" icon="key-round" action={<Button icon="plus" onClick={openCreate}>Buat key</Button>}>
              Buat key untuk mulai menggunakan API.
            </EmptyState>
          ) : (
            <Table columns={kolomKey} rows={keys} />
          )}
        </Card>

        <Card
          title="Pemakaian 7 hari"
          subtitle="Ringkasan dan grafik berasal dari log API untuk key yang dipilih."
          action={(
            <div className="w-full min-w-[14rem] max-w-xs">
              <Field label="API key">
                <Select value={effectiveKeyId} onChange={setSelectedKeyId} placeholder="Pilih key" options={keys.map(key => ({ value: key.id, label: `${key.name} · ${key.environment}` }))} disabled={keys.length === 0} />
              </Field>
            </div>
          )}
        >
          {loadingUsage ? <p role="status" className="py-3 text-sm text-text-2">Memuat pemakaian...</p> : usageError ? (
            <GalatMuat pesan={usageError} onRetry={loadUsage} />
          ) : !selectedKey ? (
            <EmptyState title="Pilih API key" icon="chart-no-axes-column">Pemakaian akan muncul setelah key tersedia.</EmptyState>
          ) : usageIsEmpty ? (
            <EmptyState title={selectedKey?.lastUsedAt ? 'Tidak ada pemakaian dalam 7 hari terakhir' : 'Key belum pernah digunakan'} icon="chart-no-axes-column">
              {selectedKey?.lastUsedAt ? 'Tidak ada request yang tercatat dalam rentang ini.' : 'Belum ada request yang tercatat dalam rentang 7 hari.'}
            </EmptyState>
          ) : usage ? (
            <div className="flex flex-col gap-5">
              {/* Ringkasan angka sebagai daftar, bukan deretan kartu statistik. */}
              <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-sm font-semibold text-text-2">Request</dt>
                  <dd className={`${ANGKA} text-text`}>{usage.totalRequests}</dd>
                  <dd className="text-sm text-text-2">Dalam 7 hari terakhir</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm font-semibold text-text-2">Error</dt>
                  <dd className={`${ANGKA} ${usage.errorPercent > 0 ? 'text-warn-fg' : 'text-text'}`}>{usage.errorPercent}%</dd>
                  <dd className="text-sm text-text-2">Respons dengan status 400 ke atas</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm font-semibold text-text-2">Kena 429</dt>
                  <dd className={`${ANGKA} ${usage.rateLimitedRequests > 0 ? 'text-warn-fg' : 'text-text'}`}>{usage.rateLimitedRequests}</dd>
                  <dd className="text-sm text-text-2">Request yang dibatasi</dd>
                </div>
              </dl>
              <figure className="min-w-0 rounded-card border border-border p-3" role="img" aria-label={`Grafik request harian selama 7 hari untuk ${selectedKey.name}`}>
                <figcaption className="mb-3 text-sm font-semibold text-text">Request per hari</figcaption>
                <div className="grid min-h-40 grid-cols-7 items-end gap-1 border-b border-border sm:gap-3">
                  {days.map(day => {
                    const height = maxRequests ? (day.requests / maxRequests) * 100 : 0;
                    return (
                      <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
                        <span className="font-num text-xs text-text-2">{day.requests}</span>
                        <div className="w-full max-w-10 rounded-t-md bg-primary" style={{ height: `${height}%`, minHeight: day.requests ? '0.2rem' : 0 }} aria-label={`${shortDate(day.date)}: ${day.requests} request`} />
                        <span className="pb-1 text-center text-xs leading-tight text-text-2">{shortDate(day.date)}</span>
                      </div>
                    );
                  })}
                </div>
              </figure>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-text">Route terbanyak</h3>
                {usage.topRoutes?.length ? (
                  <ol className="flex flex-col">
                    {usage.topRoutes.slice(0, 5).map(item => (
                      <li key={item.route} className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 border-b border-border py-2 text-sm">
                        <code className="min-w-0 break-all font-num text-xs text-text">{item.route}</code>
                        <span className="font-num text-text-2">{item.requests} request</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-text-2">Belum ada route yang tercatat.</p>}
              </div>
            </div>
          ) : <p className="py-3 text-sm text-text-2">Pemakaian belum tersedia.</p>}
        </Card>

        <SandboxPanel apiKeyPrefix={keys.find(key => key.environment === 'test' && !key.revokedAt)?.prefix || ''} />
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat API key">
        <form onSubmit={submitCreate} className="space-y-4">
          <Field label="Nama key"><Input value={createForm.name} onChange={value => setCreateForm(current => ({ ...current, name: value }))} maxLength={100} placeholder="Nama untuk mengenali key" required /></Field>
          <Field label="Environment">
            <Select value={isAdmin ? createForm.environment : 'test'} onChange={value => setCreateForm(current => ({ ...current, environment: value }))} options={isAdmin ? [{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }] : [{ value: 'test', label: 'Test' }]} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-text">Scope</legend>
            {SCOPES.filter(([scope]) => isAdmin || scope !== 'admin').map(([scope, label]) => (
              <div key={scope} className="flex min-w-0 items-center gap-2 rounded-control border border-border px-3">
                <Checkbox className="min-h-11 flex-1 py-2.5" checked={createForm.scopes.includes(scope)} onChange={() => toggleScope(scope)} label={label} />
                <code className="font-num text-xs text-text-2">{scope}</code>
              </div>
            ))}
          </fieldset>
          {!isAdmin && <p className="text-sm text-text-2">{role === 'mitra' ? 'Akun mitra hanya dapat membuat key Test tanpa scope admin. Sandbox tetap terpisah untuk setiap akun.' : 'Akun pengguna hanya dapat membuat key Test tanpa scope admin.'} Server tetap memeriksa izin.</p>}
          {createError && <p role="alert" className={GALAT}>{createError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button type="submit" icon="key-round" disabled={creating || createForm.scopes.length === 0}>{creating ? 'Membuat...' : 'Buat key'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(secretReveal)} onClose={closeSecret} title="Simpan key ini sekarang" closeDisabled={Boolean(secretReveal && !secretCopied && !secretSaved)}>
        {secretReveal && (
          <div className="space-y-4">
            <p className="text-sm text-text-2">{secretReveal.key.name} · {secretReveal.key.environment === 'live' ? 'Live' : 'Test'} · {secretReveal.key.scopes.join(', ')}</p>
            <Alert tone="warn">Key ini tidak akan ditampilkan lagi. Kalau hilang, cabut lalu buat key baru.</Alert>
            <div className="flex min-w-0 flex-wrap gap-2">
              <code aria-label="Secret API key" className="min-w-0 flex-1 break-all rounded-control bg-surface-2 px-3 py-3 font-num text-xs text-text">{secretReveal.secret}</code>
              <Button variant="secondary" icon={secretCopied ? 'check' : 'copy'} onClick={copySecret}>{secretCopied ? 'Tersalin' : 'Salin'}</Button>
            </div>
            <Checkbox className="min-h-11 py-2.5" checked={secretSaved} onChange={event => setSecretSaved(event.target.checked)} label="Sudah saya simpan di tempat aman" />
            {createError && <p role="alert" className={GALAT}>{createError}</p>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!secretCopied && !secretSaved && <span className="text-sm text-text-2">Salin atau centang dulu untuk menutup.</span>}
              <Button disabled={!secretCopied && !secretSaved} onClick={closeSecret}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} title="Cabut API key">
        {revokeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-2">Cabut key <strong className="text-text">{revokeTarget.name}</strong>? Semua request dengan key ini langsung ditolak.</p>
            {revokeError && <p role="alert" className={GALAT}>{revokeError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Batal</Button>
              <Button variant="danger" icon="ban" disabled={revoking} onClick={confirmRevoke}>{revoking ? 'Mencabut...' : 'Cabut key'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
