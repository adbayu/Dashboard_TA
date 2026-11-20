import { useCallback, useEffect, useRef, useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, Button, Card, EmptyState, Field, Select, StatusPill } from '../../shared/components/ui';
import { IOT_SOURCE, iotApi } from '../../services/iotApi.js';
import { iotStreamClient } from '../../services/iotStream.js';
import { formatEventMessage, formatSensorNumber, mergeLatestReading } from '../../utils/iotPresentation.js';
import { mergeEventPages, sandboxConnectionStatus, sandboxCurlExample } from '../../utils/monitoring.js';
import SensorReading from './SensorReading.jsx';

// Status pH dari API (normal | low | high | unknown) ke status SensorReading.
const STATUS_PH = { normal: 'normal', low: 'low', high: 'high', unknown: 'no-range' };
const angkaSah = value => typeof value === 'number' && Number.isFinite(value);

const SCENARIOS = [
  { value: 'normal', label: 'Normal' },
  { value: 'ph_turun', label: 'pH turun' },
  { value: 'suhu_naik', label: 'Suhu naik' },
  { value: 'offline', label: 'Tidak terhubung' },
];

export function SandboxLoadingState() {
  return <p role="status" className="py-3 text-sm text-text-2">Memuat device sandbox...</p>;
}

export function SandboxEventMessage({ event }) {
  return event ? formatEventMessage(event, { ph: 'pH Air' }) : 'Belum ada kejadian';
}

export function SandboxErrorAlert({ error, onRetry }) {
  return (
    <Alert tone="bad" className="mb-3">
      <p>{error}</p>
      {onRetry && <Button variant="secondary" size="sm" icon="refresh-cw" className="mt-2" onClick={onRetry}>Coba lagi</Button>}
    </Alert>
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
  const low = phReading?.threshold?.low;
  const high = phReading?.threshold?.high;
  // Rentang hanya digambar bila ambangnya lengkap dan tidak terbalik.
  const rentangSah = angkaSah(low) && angkaSah(high) && low < high;
  const nilaiPh = phReading?.value == null || phReading.value === '' ? null : Number(phReading.value);

  return (
    <Card title="Sandbox Test" subtitle="Uji skenario tanpa mengubah device live. Skenario hanya memengaruhi device sandbox milik akun ini.">
      {notice && <Alert tone="ok" live="status" className="mb-3">{notice}</Alert>}
      {error && <SandboxErrorAlert error={error} onRetry={status === 'error' ? () => { setStatus('loading'); setError(''); void refresh(); } : undefined} />}
      {status === 'loading' && <SandboxLoadingState />}
      {status === 'error' && !sandbox && <EmptyState title="Device sandbox tidak tersedia" icon="flask-conical">Periksa koneksi API lalu coba lagi.</EmptyState>}
      {status === 'ready' && !sandbox && <EmptyState title="Device sandbox belum tersedia" icon="flask-conical">Endpoint Sandbox akan menyiapkan device untuk akun ini.</EmptyState>}
      {sandbox && <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-text">{sandbox.name}</h3>
            <p className="mt-0.5 break-all font-num text-sm text-text-2">{sandbox.code}</p>
            <p className="mt-0.5 text-sm text-text-2">Area: {sandbox.areaRef || 'Belum diatur'}</p>
          </div>
          <StatusPill tone={connection.tone} icon={connection.icon}>{connection.label}</StatusPill>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SensorReading
            name="pH terakhir"
            icon="flask-conical"
            device={sandbox.code}
            value={Number.isFinite(nilaiPh) ? nilaiPh : null}
            decimals={2}
            unit="pH"
            min={rentangSah ? low : undefined}
            max={rentangSah ? high : undefined}
            status={STATUS_PH[phReading?.state] || 'no-range'}
            measuredAt={sandbox.latest?.measuredAt}
            emptyText="Belum ada data"
          />
          <dl className="flex min-w-0 flex-col gap-3 text-sm">
            <div>
              <dt className="font-semibold text-text-2">Ambang pH efektif</dt>
              <dd className="mt-0.5 text-text">{low == null && high == null ? 'Ambang belum tersedia' : `${low == null ? 'tanpa batas bawah' : formatSensorNumber(low, 2)} sampai ${high == null ? 'tanpa batas atas' : formatSensorNumber(high, 2)} pH`}</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-2">Kejadian terakhir</dt>
              <dd className="mt-0.5 break-words font-semibold text-text"><SandboxEventMessage event={latestEvent} /></dd>
              <dd className="mt-0.5 text-text-2">{latestEvent?.at ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestEvent.at)) : 'Waktu tidak tersedia'}</dd>
            </div>
          </dl>
        </div>

        <Field label="Skenario sandbox" hint="Pilih pH turun untuk memeriksa perubahan state pH dan event ambang dari runner sandbox. Tidak ada device live yang diubah.">
          <Select value={sandbox.scenario} onChange={selectScenario} options={SCENARIOS} disabled={saving} />
        </Field>
        {saving && <p role="status" className="text-sm text-text-2">Menyimpan skenario...</p>}
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-semibold text-text">Contoh request</h3><p className="mt-0.5 text-sm text-text-2">Prefix aman saja. Isi environment key dengan secret Test milikmu.</p></div>
            <Button variant="ghost" size="sm" icon={copyState === 'Contoh curl tersalin.' ? 'check' : 'copy'} onClick={copyCurl}>Salin curl</Button>
          </div>
          {copyState && <p role="status" className="text-sm text-text-2">{copyState}</p>}
          <pre tabIndex={0} aria-label="Contoh curl untuk mengubah skenario sandbox" className="custom-scrollbar max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-control bg-surface-2 p-3 font-num text-xs leading-relaxed text-text"><code>{sandboxCurlExample({ deviceId: sandbox.id, scenario: sandbox.scenario, apiKeyPrefix })}</code></pre>
        </div>
      </div>}
    </Card>
  );
}
