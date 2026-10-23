import { useCallback, useEffect, useRef, useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { Badge, Button, Card, Empty, Field, SectionTitle, Select } from '../../shared/components/ui';
import { IOT_SOURCE, iotApi } from '../../services/iotApi.js';
import { iotStreamClient } from '../../services/iotStream.js';
import { formatEventMessage, formatMeasuredAt, formatSensorNumber, mergeLatestReading } from '../../utils/iotPresentation.js';
import { mergeEventPages, sandboxConnectionStatus, sandboxCurlExample } from '../../utils/monitoring.js';
import SensorStateBadge from './SensorStateBadge.jsx';

const SCENARIOS = [
  { value: 'normal', label: 'Normal' },
  { value: 'ph_turun', label: 'pH turun' },
  { value: 'suhu_naik', label: 'Suhu naik' },
  { value: 'offline', label: 'Tidak terhubung' },
];

export function SandboxLoadingState() {
  return <p role="status" className="py-3 text-sm text-on-surface-variant">Memuat device sandbox...</p>;
}

export function SandboxReadingValue({ reading }) {
  return reading?.value == null ? 'Belum ada data' : `${formatSensorNumber(reading.value, 2)} pH`;
}

export function SandboxEventMessage({ event }) {
  return event ? formatEventMessage(event, { ph: 'pH Air' }) : 'Belum ada kejadian';
}

export function SandboxErrorAlert({ error, onRetry }) {
  return (
    <div role="alert" className="mb-3 space-y-2 rounded-xl border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
      <p>{error}</p>
      {onRetry && <Button variant="ghost" icon="refresh" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}

export default function SandboxPanel({ apiKeyPrefix = '' }) {
  const { currentUser, isLoggedIn } = useSmart();
  const [sandbox, setSandbox] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [copyState, setCopyState] = useState('');
  const refreshing = useRef(false);
  const refreshGeneration = useRef(0);
  const snapshot = useRef(null);
  const refreshRef = useRef(null);

  const refresh = useCallback(async ({ signal, quiet = false } = {}) => {
    if (refreshing.current || !isLoggedIn) return;
    refreshing.current = true;
    const requestGeneration = ++refreshGeneration.current;
    try {
      const result = await iotApi.getSandboxDevices({ signal });
      if (signal?.aborted) return;
      const device = result.devices?.[0];
      if (!device) {
        snapshot.current = null;
        setSandbox(null);
        setStatus('ready');
        setError('');
        return;
      }
      const [details, latest, eventResult] = await Promise.all([
        iotApi.getDevice(device.id, { signal }),
        iotApi.getDeviceLatest(device.id, { signal }),
        iotApi.getDeviceEvents(device.id, { limit: 10, signal }),
      ]);
      if (signal?.aborted) return;
      const next = {
        ...device,
        device: details.device,
        latest,
        events: eventResult.events || [],
      };
      snapshot.current = next;
      setSandbox(next);
      setStatus('ready');
      setError('');
    } catch (failure) {
      if (signal?.aborted) return;
      setError(failure.message || 'Device sandbox tidak dapat dimuat.');
      if (!quiet || !snapshot.current) setStatus('error');
    } finally {
      if (requestGeneration === refreshGeneration.current) refreshing.current = false;
    }
  }, [isLoggedIn]);

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (IOT_SOURCE !== 'api' || !isLoggedIn) return undefined;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return refresh({ signal: controller.signal });
      return undefined;
    });
    return () => {
      controller.abort();
      refreshGeneration.current += 1;
      refreshing.current = false;
    };
  }, [currentUser?.id, isLoggedIn, refresh]);

  useEffect(() => {
    if (IOT_SOURCE !== 'api' || !isLoggedIn) return undefined;
    const stop = iotStreamClient.subscribe({
      onReading: frame => {
        if (!snapshot.current || frame.deviceId !== snapshot.current.id) return;
        const next = {
          ...snapshot.current,
          measuredAt: frame.measuredAt || snapshot.current.measuredAt,
          readings: { ...(snapshot.current.readings || {}), ...(frame.readings || {}) },
          latest: mergeLatestReading(snapshot.current.latest, frame),
        };
        snapshot.current = next;
        setSandbox(next);
      },
      onDeviceEvent: (event, id) => {
        if (!snapshot.current || event?.deviceId !== snapshot.current.id) return;
        const value = { ...event, id: id ?? event.id };
        const next = { ...snapshot.current, events: mergeEventPages([value], snapshot.current.events || []) };
        snapshot.current = next;
        setSandbox(next);
      },
      onRefresh: () => { void refreshRef.current?.({ quiet: true }); },
    });
    return stop;
  }, [isLoggedIn]);

  const selectScenario = async scenario => {
    if (!sandbox || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await iotApi.setSandboxScenario(sandbox.id, scenario);
      const next = { ...sandbox, scenario: result.scenario };
      snapshot.current = next;
      setSandbox(next);
      setNotice(`Skenario ${SCENARIOS.find(item => item.value === scenario)?.label || scenario} disimpan. Nilai dan kejadian mengikuti runner melalui stream atau polling.`);
    } catch (failure) {
      setError(failure.message || 'Skenario sandbox tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(sandboxCurlExample({
        deviceId: sandbox?.id,
        scenario: sandbox?.scenario,
        apiKeyPrefix,
      }));
      setCopyState('Contoh curl tersalin.');
    } catch {
      setCopyState('Salin tidak tersedia. Pilih teks contoh lalu salin manual.');
    }
  };

  if (IOT_SOURCE !== 'api') return null;

  const phReading = sandbox?.latest?.readings?.find(reading => reading.sensor === 'ph');
  const latestEvent = sandbox?.events?.[0];
  const connection = sandboxConnectionStatus(sandbox?.device?.status);

  return (
    <Card pad="sm">
      <SectionTitle eyebrow="Sandbox Test" title="Uji skenario tanpa mengubah device live" subtitle="Skenario memengaruhi device sandbox milik akun ini saja." />
      {notice && <p role="status" className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">{notice}</p>}
      {error && <SandboxErrorAlert error={error} onRetry={status === 'error' ? () => { setStatus('loading'); setError(''); void refresh(); } : undefined} />}
      {status === 'loading' && <SandboxLoadingState />}
      {status === 'error' && !sandbox && <Empty title="Device sandbox tidak tersedia" hint="Periksa koneksi API lalu coba lagi." icon="science" />}
      {status === 'ready' && !sandbox && <Empty title="Device sandbox belum tersedia" hint="Endpoint Sandbox akan menyiapkan device untuk akun ini." icon="science" />}
      {sandbox && <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-outline-variant/50 p-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-on-surface">{sandbox.name}</h3>
            <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{sandbox.code}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Area: {sandbox.areaRef || 'Belum diatur'}</p>
          </div>
          <Badge tone={connection.tone} icon={connection.icon}>{connection.label}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs font-semibold text-on-surface-variant">pH terakhir</p>
            <p className="mt-1 font-bold tabular-nums text-on-surface"><SandboxReadingValue reading={phReading} /></p>
            <div className="mt-2"><SensorStateBadge state={phReading?.state} /></div>
            <p className="mt-2 text-xs text-on-surface-variant">{formatMeasuredAt(sandbox.latest?.measuredAt)}</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs font-semibold text-on-surface-variant">Ambang pH efektif</p>
            <p className="mt-1 text-sm text-on-surface">{phReading?.threshold?.low == null && phReading?.threshold?.high == null ? 'Ambang belum tersedia' : `${phReading.threshold.low ?? 'tanpa batas bawah'} sampai ${phReading.threshold.high ?? 'tanpa batas atas'} pH`}</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-xs font-semibold text-on-surface-variant">Kejadian terakhir</p>
            <p className="mt-1 break-words text-sm font-semibold text-on-surface"><SandboxEventMessage event={latestEvent} /></p>
            <p className="mt-2 text-xs text-on-surface-variant">{latestEvent?.at ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestEvent.at)) : 'Waktu tidak tersedia'}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.75fr)_minmax(0,1.25fr)] sm:items-end">
          <Field label="Skenario sandbox"><Select value={sandbox.scenario} onChange={selectScenario} options={SCENARIOS} disabled={saving} /></Field>
          <p className="text-xs leading-relaxed text-on-surface-variant">Pilih pH turun untuk memeriksa perubahan state pH dan event ambang dari runner sandbox. Tidak ada device live yang diubah.</p>
        </div>
        {saving && <p role="status" className="text-sm text-on-surface-variant">Menyimpan skenario...</p>}
        <div className="rounded-xl border border-outline-variant/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-sm font-semibold text-on-surface">Contoh request</h3><p className="mt-1 text-xs text-on-surface-variant">Prefix aman saja. Isi environment key dengan secret Test milikmu.</p></div>
            <Button variant="ghost" icon={copyState === 'Contoh curl tersalin.' ? 'check' : 'content_copy'} onClick={copyCurl}>Salin curl</Button>
          </div>
          {copyState && <p role="status" className="mt-2 text-xs text-on-surface-variant">{copyState}</p>}
          <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface"><code>{sandboxCurlExample({ deviceId: sandbox.id, scenario: sandbox.scenario, apiKeyPrefix })}</code></pre>
        </div>
      </div>}
    </Card>
  );
}
