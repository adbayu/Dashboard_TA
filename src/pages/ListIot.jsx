import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';
import { iotApi } from '../services/iotApi.js';
import { Badge, Button, Card, Empty, Field, Input, SectionTitle, Select, StatCard } from '../components/ui';
import { areaFilterOptions } from '../utils/frontendReview.js';
import { iotStreamClient } from '../services/iotStream.js';
import { DeviceReadings } from '../components/iot/Readings.jsx';
import { formatMeasuredAt, mergeLatestReading, resolveTelemetrySnapshot, sortEventsByIdDescending } from '../utils/iotPresentation.js';
import ReadingChart from '../components/iot/ReadingChart.jsx';
import EventList from '../components/iot/EventList.jsx';

const STATUS = {
  online: { label: 'Terhubung', tone: 'ok', icon: 'wifi' },
  stale: { label: 'Data tertunda', tone: 'warn', icon: 'schedule' },
  offline: { label: 'Tidak terhubung', tone: 'bad', icon: 'wifi_off' },
};

function DeviceStatus({ status }) {
  const info = STATUS[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'help' };
  return <Badge tone={info.tone} icon={info.icon}>{info.label}</Badge>;
}

function StreamStatus({ status }) {
  const details = {
    connecting: { label: 'Menghubungkan...', tone: 'muted', icon: 'sensors' },
    live: { label: 'Live', tone: 'ok', icon: 'sensors' },
    reconnecting: { label: 'Menyambung ulang...', tone: 'warn', icon: 'sync' },
    polling: { label: 'Diperbarui tiap 30 detik', tone: 'muted', icon: 'schedule' },
  }[status];
  if (!details) return null;
  return <span className="inline-flex" role="status" aria-live="polite"><Badge tone={details.tone} icon={details.icon}>{details.label}</Badge></span>;
}

const READING_STATE_LABEL = { normal: 'Normal', low: 'Di bawah ambang', high: 'Di atas ambang', unknown: 'Tanpa ambang' };

function ErrorState({ message, retry }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-3" role="alert">
        <p className="flex items-start gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{message}</span>
        </p>
        <Button variant="ghost" icon="refresh" onClick={retry}>Coba lagi</Button>
      </div>
    </Card>
  );
}

export default function ListIot() {
  const { currentUser } = useSmart();
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [areaRef, setAreaRef] = useState('');
  const [status, setStatus] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [latestByDevice, setLatestByDevice] = useState({});
  const [latestLoading, setLatestLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState('');
  const [streamStatus, setStreamStatus] = useState('idle');
  const [announcement, setAnnouncement] = useState('');
  const latestByDeviceRef = useRef({});
  const refreshLatestRef = useRef(null);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const data = await iotApi.getDevices({ userId: currentUser?.id });
        if (!current) return;
        setResult(data);
        setState('ready');
      } catch (failure) {
        if (!current) return;
        setError(failure.message);
        setState('error');
      }
    }
    void load();
    return () => { current = false; };
  }, [attempt, currentUser?.id]);

  const devices = result?.devices ?? EMPTY_DEVICES;
  useEffect(() => { latestByDeviceRef.current = latestByDevice; }, [latestByDevice]);

  useEffect(() => {
    if (!devices.length) return undefined;
    let active = true;
    let refreshing = false;

    const refreshLatest = async () => {
      if (refreshing) return;
      refreshing = true;
      if (devices.some(device => !Object.hasOwn(latestByDeviceRef.current, device.id))) setLatestLoading(true);
      try {
        const entries = await Promise.allSettled(devices.map(async device => [
          device.id,
          await iotApi.getDeviceLatest(device.id),
        ]));
        if (!active) return;
        const failed = entries.filter(entry => entry.status === 'rejected');
        const nextLatest = { ...latestByDeviceRef.current, ...Object.fromEntries(entries
          .filter(entry => entry.status === 'fulfilled')
          .map(entry => entry.value)) };
        if (failed.length) {
          setTelemetryError(failed[0].reason?.message || 'Pembacaan sensor tidak dapat dimuat.');
        } else setTelemetryError('');
        if (!Object.keys(nextLatest).length && failed.length) return;
        latestByDeviceRef.current = nextLatest;
        setLatestByDevice(nextLatest);
      } catch (failure) {
        if (active) setTelemetryError(failure.message || 'Pembacaan sensor tidak dapat diperbarui.');
      } finally {
        refreshing = false;
        if (active) setLatestLoading(false);
      }
    };

    refreshLatestRef.current = refreshLatest;
    void refreshLatest();
    if (result?.source === 'local') return () => {
      active = false;
      refreshLatestRef.current = null;
    };

    const stop = iotStreamClient.subscribe({
      onStatus: setStreamStatus,
      onRefresh: () => { void refreshLatest(); },
      onReading: frame => {
        const previous = latestByDeviceRef.current[frame.deviceId];
        const next = mergeLatestReading(previous, frame);
        if (!next || next === previous) return;
        const before = new Map(previous.readings.map(reading => [reading.sensor, reading.state]));
        const device = devices.find(item => item.id === frame.deviceId);
        const sensorNames = new Map((device?.type?.sensors || device?.sensors || []).map(sensor => [sensor.code, sensor.name || sensor.label || sensor.code]));
        const changes = next.readings.filter(reading => before.has(reading.sensor) && before.get(reading.sensor) !== reading.state);
        if (changes.length) {
          setAnnouncement(changes.map(reading => `${sensorNames.get(reading.sensor) || reading.sensor}: ${READING_STATE_LABEL[reading.state]}`).join('. '));
        }
        const updated = { ...latestByDeviceRef.current, [frame.deviceId]: next };
        latestByDeviceRef.current = updated;
        setLatestByDevice(updated);
      },
    });

    return () => {
      active = false;
      stop();
      refreshLatestRef.current = null;
    };
  }, [devices, result?.source]);

  const areas = areaFilterOptions(devices);
  const filtered = devices.filter(device => {
    const text = [device.name, device.code, device.type?.code, device.type?.name].filter(Boolean).join(' ').toLowerCase();
    return (!search || text.includes(search.trim().toLowerCase()))
      && (!kind || device.type?.kind === kind)
      && (!areaRef || device.areaRef?.trim() === areaRef)
      && (!status || device.status === status);
  });

  const retryList = () => {
    setState('loading');
    setError('');
    setAttempt(value => value + 1);
  };

  const retryLatest = () => {
    setTelemetryError('');
    void refreshLatestRef.current?.();
  };

  if (state === 'loading') {
    return <Card><p className="text-sm text-on-surface-variant" role="status">Memuat perangkat...</p></Card>;
  }

  if (state === 'error') return <ErrorState message={error} retry={retryList} />;

  if (devices.length === 0) {
    return (
      <Card>
        {result?.label && <p className="mb-3 text-xs font-bold text-on-surface-variant">{result.label}</p>}
        <Empty
          title="Belum ada perangkat di akun ini."
          hint="Pindai QR perangkat untuk melihat pratinjau dan mengklaim alat yang tersedia."
          icon="sensors"
          action={<Link to="/detail-informasi"><Button icon="qr_code_scanner">Scan QR alat</Button></Link>}
        />
      </Card>
    );
  }

  const counts = {
    online: devices.filter(device => device.status === 'online').length,
    stale: devices.filter(device => device.status === 'stale').length,
    offline: devices.filter(device => device.status === 'offline').length,
  };

  return (
    <div className="space-y-5 min-w-0">
      {result?.label && <p className="text-xs font-bold text-on-surface-variant">{result.label}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total device" value={devices.length} icon="devices" hint="Terlihat di akun ini" />
        <StatCard label="Terhubung" value={counts.online} icon="wifi" hint="Status dari API" />
        <StatCard label="Data tertunda" value={counts.stale} icon="schedule" tone="warn" hint="Pengukuran terakhir tertunda" />
        <StatCard label="Tidak terhubung" value={counts.offline} icon="wifi_off" tone="bad" hint="Status dari API" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="List IoT"
          title="Perangkat"
          subtitle="Nilai terakhir dari alat, dengan waktu ukur di setiap kartu."
        />

        <div className="mb-4 flex w-full min-w-0 flex-wrap items-center gap-2">
          <StreamStatus status={streamStatus} />
          <Link
            to="/detail-informasi"
            className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-xl bg-primary button-primary px-3.5 text-sm font-semibold text-white hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">qr_code_scanner</span>
            Scan QR alat
          </Link>
        </div>

        {telemetryError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"><span>{telemetryError}</span><Button variant="ghost" size="sm" icon="refresh" onClick={retryLatest}>Coba lagi</Button></div>}
        <p className="sr-only" aria-live="polite">{announcement}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          <Field label="Cari perangkat">
            <Input value={search} onChange={setSearch} placeholder="Nama atau kode" />
          </Field>
          <Field label="Tipe">
            <Select
              value={kind}
              onChange={setKind}
              placeholder="Semua tipe"
              options={[{ value: 'satuan', label: 'Satuan' }, { value: 'paket', label: 'Paket' }]}
            />
          </Field>
          <Field label="Area">
            <Select value={areaRef} onChange={setAreaRef} placeholder="Semua area" options={areas} />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={setStatus}
              placeholder="Semua status"
              options={Object.entries(STATUS).map(([value, item]) => ({ value, label: item.label }))}
            />
          </Field>
        </div>

        {filtered.length === 0 ? (
          <Empty title="Tidak ada device cocok" hint="Ubah kata kunci atau filter tipe, area, dan status." icon="search_off" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(device => (
              <Link
                key={device.id}
                to={`/iot/${encodeURIComponent(device.id)}`}
                className="glass-card rounded-2xl p-4 min-w-0 hover:shadow-glass-elevated transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="material-symbols-outlined text-[24px] text-primary dark:text-inverse-primary" aria-hidden="true">sensors</span>
                  <DeviceStatus status={device.status} />
                </div>
                <h2 className="mt-3 font-bold text-on-surface break-words">{device.name}</h2>
                <p className="mt-1 text-xs text-on-surface-variant break-all font-mono">{device.code}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge icon={device.type?.kind === 'paket' ? 'deployed_code' : 'sensors'}>
                    {device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {device.type?.name || device.type?.code}
                  </Badge>
                </div>
                <div className="mt-4 rounded-xl panel-inset p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Pembacaan</p>
                  <DeviceReadings
                    sensors={device.type?.sensors || device.sensors || []}
                    latest={latestByDevice[device.id]}
                    compact
                    loading={latestLoading}
                    unavailable={!latestLoading && Boolean(telemetryError) && !Object.hasOwn(latestByDevice, device.id)}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function DeviceDetail() {
  const { id } = useParams();
  const { theme } = useSmart();
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [loadedId, setLoadedId] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [telemetry, setTelemetry] = useState({ state: 'loading', latest: null, latestError: '', history: {}, historyErrors: {}, events: [], eventsError: '', error: '' });
  const [selectedSensor, setSelectedSensor] = useState('');
  const [streamStatus, setStreamStatus] = useState('idle');
  const [announcement, setAnnouncement] = useState('');
  const latestRef = useRef(null);
  const eventsRef = useRef([]);
  const refreshTelemetryRef = useRef(null);
  const telemetryRef = useRef(telemetry);

  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);

  useEffect(() => {
    let current = true;
    iotApi.getDevice(id).then(data => {
      if (!current) return;
      latestRef.current = null;
      eventsRef.current = [];
      setTelemetry({ state: 'loading', latest: null, latestError: '', history: {}, historyErrors: {}, events: [], eventsError: '', error: '' });
      setResult(data);
      setLoadedId(id);
      setState('ready');
      setSelectedSensor(data.device.sensors?.[0]?.code || '');
    }).catch(failure => {
      if (!current) return;
      setError(failure.message);
      setLoadedId(id);
      setState('error');
    });
    return () => { current = false; };
  }, [id, attempt]);

  useEffect(() => {
    const device = result?.device;
    if (!device || loadedId !== id || device.id !== id) return undefined;
    let active = true;
    let refreshing = false;

    const refreshTelemetry = async () => {
      if (refreshing) return;
      refreshing = true;
      setTelemetry(current => ({
        ...current,
        state: current.latest ? 'ready' : 'loading',
        latestError: '',
        historyErrors: {},
        eventsError: '',
        error: '',
      }));
      try {
        const to = new Date().toISOString();
        const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [latestResult, eventResult, ...historyResults] = await Promise.allSettled([
          iotApi.getDeviceLatest(device.id),
          iotApi.getDeviceEvents(device.id, { limit: 10 }),
          ...(device.sensors || []).map(sensor => iotApi.getDeviceReadings(device.id, {
            sensor: sensor.code,
            from,
            to,
            bucket: '5m',
          })),
        ]);
        if (!active) return;
        const snapshot = resolveTelemetrySnapshot({
          sensors: device.sensors || [],
          latestResult,
          eventResult,
          historyResults,
          previousLatest: latestRef.current,
          previousEvents: eventsRef.current,
          previousHistory: telemetryRef.current.history,
        });
        const { latest } = snapshot;
        const liveEvents = eventsRef.current;
        const eventById = new Map();
        for (const event of [...liveEvents, ...snapshot.events]) {
          const key = event.id || `${event.type}-${event.at}-${event.sensor || ''}`;
          if (!eventById.has(key)) eventById.set(key, event);
        }
        const events = sortEventsByIdDescending([...eventById.values()]).slice(0, 10);
        if (latest) latestRef.current = latest;
        eventsRef.current = events;
        setTelemetry({ ...snapshot, state: latest ? 'ready' : snapshot.error ? 'error' : 'ready', events });
      } catch (failure) {
        if (active) setTelemetry(current => ({
          ...current,
          state: current.latest ? 'ready' : 'error',
          error: failure.message || 'Telemetri perangkat tidak dapat dimuat.',
        }));
      } finally {
        refreshing = false;
      }
    };

    refreshTelemetryRef.current = refreshTelemetry;
    const start = async () => {
      await refreshTelemetry();
      if (!active || result?.source === 'local') return;
      const stop = iotStreamClient.subscribe({
        onStatus: setStreamStatus,
        onRefresh: () => { void refreshTelemetry(); },
        onReading: frame => {
          if (frame.deviceId !== device.id) return;
          const previous = latestRef.current;
          const next = mergeLatestReading(previous, frame);
          if (!next || next === previous) return;
          const before = new Map((previous.readings || []).map(reading => [reading.sensor, reading.state]));
          const names = new Map((device.sensors || []).map(sensor => [sensor.code, sensor.name || sensor.label || sensor.code]));
          const changes = next.readings.filter(reading => before.has(reading.sensor) && before.get(reading.sensor) !== reading.state);
          if (changes.length) setAnnouncement(changes.map(reading => `${names.get(reading.sensor) || reading.sensor}: ${READING_STATE_LABEL[reading.state]}`).join('. '));
          latestRef.current = next;
          setTelemetry(current => ({ ...current, latest: next }));
        },
        onDeviceEvent: (event, eventId) => {
          if (event.deviceId !== device.id) return;
          const item = { ...event, id: eventId || event.id };
          const key = item.id || `${item.type}-${item.at}-${item.sensor || ''}`;
          if (eventsRef.current.some(existing => (existing.id || `${existing.type}-${existing.at}-${existing.sensor || ''}`) === key)) return;
          const events = sortEventsByIdDescending([item, ...eventsRef.current]).slice(0, 10);
          eventsRef.current = events;
          setTelemetry(current => ({ ...current, events }));
        },
      });
      refreshTelemetryRef.current = refreshTelemetry;
      cleanupStream = stop;
    };
    let cleanupStream = () => {};
    void start();

    return () => {
      active = false;
      cleanupStream();
      refreshTelemetryRef.current = null;
      latestRef.current = null;
      eventsRef.current = [];
    };
  }, [id, loadedId, result?.device, result?.source]);

  if (state === 'loading' || loadedId !== id) {
    return <Card><p className="text-sm text-on-surface-variant" role="status">Memuat detail perangkat...</p></Card>;
  }

  if (state === 'error') return <ErrorState message={error} retry={() => {
    setState('loading');
    setError('');
    setAttempt(value => value + 1);
  }} />;

  const { device } = result;
  const sensors = device.sensors || [];
  const selected = sensors.find(sensor => sensor.code === selectedSensor) || sensors[0];
  const series = selected ? telemetry.history[selected.code] : null;
  const retryTelemetry = () => { void refreshTelemetryRef.current?.(); };

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/iot" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary dark:text-inverse-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-lg">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Kembali ke List IoT
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {result.label && <p className="text-xs font-bold text-on-surface-variant">{result.label}</p>}
          <StreamStatus status={streamStatus} />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary dark:text-inverse-primary">
              {device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {device.type?.name || device.type?.code}
            </p>
            {(device.isSandbox || device.is_sandbox) && <Badge tone="info">Sandbox</Badge>}
            <h2 className="mt-1 text-2xl font-extrabold text-on-surface break-words">{device.name}</h2>
            <p className="mt-1 font-mono text-sm text-on-surface-variant break-all">{device.code}</p>
          </div>
          <DeviceStatus status={device.status} />
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Pembacaan" title="Nilai sensor saat ini" subtitle={telemetry.latest?.measuredAt ? `${formatMeasuredAt(telemetry.latest.measuredAt)}. Ambang mengikuti target efektif.` : 'Ambang mengikuti target efektif jika tersedia.'} />
        {telemetry.state === 'loading' ? (
          <p role="status" className="py-4 text-sm text-on-surface-variant">Memuat pembacaan, ambang, dan riwayat perangkat...</p>
        ) : telemetry.latestError && !telemetry.latest ? (
          <div role="alert" className="space-y-3"><p className="text-sm text-on-surface">Pembacaan sensor tidak dapat dimuat: {telemetry.latestError}</p><Button icon="refresh" onClick={retryTelemetry}>Coba lagi</Button></div>
        ) : (
          <>
            {telemetry.error && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"><span>{telemetry.error}</span><Button variant="ghost" size="sm" icon="refresh" onClick={retryTelemetry}>Coba lagi</Button></div>}
            <DeviceReadings sensors={sensors} latest={telemetry.latest} />
            <p className="sr-only" aria-live="polite">{announcement}</p>
          </>
        )}
      </Card>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
        <Card>
          <SectionTitle eyebrow="Riwayat" title={selected ? `${selected.name || selected.label || selected.code}, 24 jam terakhir` : 'Riwayat sensor'} subtitle="Rata-rata per lima menit, dengan rentang minimum sampai maksimum dan ambang efektif." />
          {sensors.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Pilih sensor riwayat">
              {sensors.map(sensor => (
                <button
                  key={sensor.code}
                  type="button"
                  aria-pressed={selected?.code === sensor.code}
                  onClick={() => setSelectedSensor(sensor.code)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${selected?.code === sensor.code ? 'border-primary bg-primary button-primary text-white' : 'border-outline-variant/50 text-on-surface hover:bg-primary/5'}`}
                >
                  {sensor.name || sensor.label || sensor.code}
                </button>
              ))}
            </div>
          )}
          {telemetry.state === 'loading' ? <p role="status" className="py-5 text-sm text-on-surface-variant">Memuat riwayat sensor...</p>
            : selected && telemetry.historyErrors[selected.code] && !series ? <p role="alert" className="py-4 text-sm text-on-surface">Riwayat {selected.name || selected.code} tidak dapat dimuat: {telemetry.historyErrors[selected.code]}</p>
              : selected && series ? <ReadingChart sensor={selected} points={series.points || []} threshold={series.threshold || selected.threshold} theme={theme} />
                : <Empty title="Konfigurasi sensor belum tersedia" icon="sensors" />}
        </Card>

        <Card>
          <SectionTitle eyebrow="Kejadian" title="Log kejadian" subtitle="Perubahan ambang dan koneksi yang tercatat server." />
          {telemetry.state === 'loading' ? <p role="status" className="py-5 text-sm text-on-surface-variant">Memuat kejadian...</p>
            : telemetry.eventsError && !telemetry.events.length ? <p role="alert" className="py-4 text-sm text-on-surface">Kejadian tidak dapat dimuat: {telemetry.eventsError}</p>
              : <EventList events={telemetry.events} deviceCode={device.code} sensors={sensors} />}
        </Card>
      </div>

      <Card>
        <SectionTitle eyebrow="Kesehatan unit" title="Informasi yang tersedia" />
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Firmware', device.firmware || 'Belum tersedia'],
            ['Sinyal RSSI', device.rssi == null ? 'Belum tersedia' : `${device.rssi} dBm`],
            ['Kalibrasi terakhir', formatDate(device.calibratedAt)],
            ['Pengukuran terakhir', formatDate(telemetry.latest?.measuredAt || device.lastMeasuredAt)],
            ['Kiriman terakhir diterima', formatDate(device.lastReceivedAt)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl panel-inset p-3">
              <dt className="text-xs text-on-surface-variant">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Belum tersedia' : date.toLocaleString('id-ID');
}

const EMPTY_DEVICES = [];
