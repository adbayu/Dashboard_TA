import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { iotApi } from '../../services/iotApi.js';
import { Alert, Badge, Button, Card, Empty, Field, FilterChip, Input, PageHeader, Select, StatusPill, Table, Tautan, TautanTombol } from '../../shared/components/ui';
import { areaFilterOptions } from '../../utils/frontendReview.js';
import { iotStreamClient } from '../../services/iotStream.js';
import { formatMeasuredAt, formatSensorNumber, getSensorState, isMeasurementStale, mergeLatestReading, resolveTelemetrySnapshot, sortEventsByIdDescending, statusKoneksiLive } from '../../utils/iotPresentation.js';
import AreaSection from '../../components/iot/AreaSection.jsx';
import EventList from '../../components/iot/EventList.jsx';
import LiveIndicator from '../../components/iot/LiveIndicator.jsx';
import ReadingChart from '../../components/iot/ReadingChart.jsx';
import SensorReading from '../../components/iot/SensorReading.jsx';

const STATUS = {
  online: { label: 'Terhubung', tone: 'ok', icon: 'wifi' },
  stale: { label: 'Data tertunda', tone: 'warn', icon: 'clock' },
  offline: { label: 'Tidak terhubung', tone: 'bad', icon: 'wifi-off' },
};
// Alat bermasalah tampil paling atas: tidak terhubung, lalu data tertunda.
const STATUS_ORDER = { offline: 0, stale: 1, online: 2 };
const STATUS_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'offline', label: 'Tidak terhubung' },
  { value: 'stale', label: 'Data tertunda' },
  { value: 'online', label: 'Terhubung' },
];
const STREAM_STATES = ['connecting', 'live', 'reconnecting', 'polling'];
const EMPTY_READING_TEXT = 'Belum ada data. Pastikan alat sudah diprovisioning dan tersambung WiFi.';

function DeviceStatus({ status }) {
  const info = STATUS[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'circle-help' };
  return <Badge tone={info.tone} icon={info.icon}>{info.label}</Badge>;
}

// Status siaran diumumkan sopan lewat LiveIndicator (role="status", aria-live="polite").
function StreamStatus({ status }) {
  if (!STREAM_STATES.includes(status)) return null;
  return <LiveIndicator status={status} />;
}

const READING_STATE_LABEL = { normal: 'Normal', low: 'Di bawah ambang', high: 'Di atas ambang', unknown: 'Tanpa ambang' };

function ErrorState({ title, message, retry, back }) {
  return (
    <div className="iot-touch-targets min-w-0">
      {back}
      <PageHeader title={title} />
      <Alert tone="bad" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retry}>Coba lagi</Button>}>
        {message}
      </Alert>
    </div>
  );
}

function deviceKindLabel(device) {
  return `${device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · ${device.type?.name || device.type?.code || 'Tipe tidak tersedia'}`;
}

function sensorName(sensor) {
  return sensor.name || sensor.label || sensor.code;
}

function sensorIcon(sensor) {
  const code = String(sensor.code || '').toLowerCase();
  if (code.includes('temp') || code.includes('suhu')) return 'thermometer';
  if (code.includes('tds')) return 'waves';
  if (code.includes('ph')) return 'droplet';
  return 'activity';
}

// Ambang valid hanya bila kedua batas angka dan bawah < atas; selain itu
// SensorReading menampilkan "Ambang belum diatur" tanpa RangeBar.
function validRange(threshold) {
  const low = Number(threshold?.low);
  const high = Number(threshold?.high);
  if (threshold?.low == null || threshold?.high == null || !Number.isFinite(low) || !Number.isFinite(high) || low >= high) return null;
  return { min: low, max: high };
}

function readingStatus(state, stale) {
  if (state === 'low' || state === 'high') return state;
  if (stale) return 'stale';
  if (state === 'normal') return 'normal';
  return 'no-range';
}

function compactReadings(device, latest) {
  const readings = new Map((latest?.readings || []).map(reading => [reading.sensor, reading]));
  return (device.type?.sensors || device.sensors || []).map(sensor => {
    const reading = readings.get(sensor.code);
    const value = reading?.value ?? null;
    const threshold = reading?.threshold ?? sensor.threshold ?? null;
    return {
      code: sensor.code,
      text: value == null ? null : `${formatSensorNumber(value, sensor.decimals ?? 2)}${sensor.unit ? ` ${sensor.unit}` : ''}`,
      state: reading?.state || getSensorState(value, threshold),
    };
  });
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
  // Status koneksi dari stream, per id alat. Disimpan terpisah dari `result` supaya
  // efek stream (bergantung pada `devices`) tidak berlangganan ulang tiap pembacaan.
  const [statusLive, setStatusLive] = useState({});
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
        setStatusLive({});
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

    const perbaruiStatus = (device, pesan) => setStatusLive(kini => {
      const status = statusKoneksiLive(kini[device.id] ?? device.status, pesan);
      return status === (kini[device.id] ?? device.status) ? kini : { ...kini, [device.id]: status };
    });

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
        if (device) perbaruiStatus(device, { jenis: 'reading', measuredAt: frame.measuredAt });
      },
      onDeviceEvent: event => {
        const device = devices.find(item => item.id === event.deviceId);
        if (device) perbaruiStatus(device, { jenis: 'event', type: event.type });
      },
    });

    return () => {
      active = false;
      stop();
      refreshLatestRef.current = null;
    };
  }, [devices, result?.source]);

  // Status dari stream menimpa status saat halaman dimuat, sampai daftar dimuat ulang.
  const devicesTampil = devices.map(device => (statusLive[device.id] ? { ...device, status: statusLive[device.id] } : device));

  const areas = areaFilterOptions(devicesTampil);
  const filtered = devicesTampil.filter(device => {
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

  const scanAction = <TautanTombol to="/detail-informasi" icon="scan-qr-code">Pindai QR alat</TautanTombol>;

  if (state === 'loading') {
    return (
      <div className="iot-touch-targets min-w-0">
        <PageHeader title="Daftar alat" subtitle="Cari alat yang terputus atau datanya tertunda." />
        <Card><p className="text-sm text-text-2" role="status">Memuat perangkat...</p></Card>
      </div>
    );
  }

  if (state === 'error') return <ErrorState title="Daftar alat" message={error} retry={retryList} />;

  if (devicesTampil.length === 0) {
    return (
      <div className="iot-touch-targets min-w-0">
        <PageHeader title="Daftar alat" subtitle="Cari alat yang terputus atau datanya tertunda." sample={result?.label || undefined} />
        <Empty
          title="Belum ada alat di akun ini."
          hint="Pindai QR pada label alat untuk melihat pratinjau dan mengklaimnya."
          icon="radio"
          action={scanAction}
        />
      </div>
    );
  }

  const counts = {
    online: devicesTampil.filter(device => device.status === 'online').length,
    stale: devicesTampil.filter(device => device.status === 'stale').length,
    offline: devicesTampil.filter(device => device.status === 'offline').length,
  };
  const problems = devicesTampil.filter(device => device.status === 'offline' || device.status === 'stale');
  const sorted = [...filtered].sort((left, right) => (STATUS_ORDER[left.status] ?? 3) - (STATUS_ORDER[right.status] ?? 3)
    || String(left.code || '').localeCompare(String(right.code || ''), 'id'));
  const hasFilter = Boolean(search || kind || areaRef || status);
  const clearFilters = () => {
    setSearch('');
    setKind('');
    setAreaRef('');
    setStatus('');
  };

  return (
    <div className="iot-touch-targets min-w-0">
      <PageHeader
        title="Daftar alat"
        subtitle={`Cari alat yang terputus atau datanya tertunda. ${devicesTampil.length} alat terdaftar di akun ini.`}
        sample={result?.label || undefined}
        actions={<>
          <StreamStatus status={streamStatus} />
          {scanAction}
        </>}
      />

      <div className="flex min-w-0 flex-col gap-4">
        {problems.length > 0 ? (
          <Alert tone="warn" title={`${problems.length} alat perlu dicek.`} meta={`${counts.online} dari ${devicesTampil.length} alat terhubung`}>
            Periksa daya dan sinyal WiFi alat yang tidak terhubung atau datanya tertunda.
          </Alert>
        ) : (
          <Alert tone="ok" title="Semua alat terhubung." meta={`${counts.online} dari ${devicesTampil.length} alat terhubung`}>
            Pembacaan terbaru tampil di tabel.
          </Alert>
        )}

        {telemetryError && (
          <Alert tone="bad" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retryLatest}>Coba lagi</Button>}>
            {telemetryError}
          </Alert>
        )}
        <p className="sr-only" aria-live="polite">{announcement}</p>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <Field label="Cari alat">
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
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Filter status">
          {STATUS_FILTERS.map(option => (
            <FilterChip
              key={option.value || 'semua'}
              active={status === option.value}
              count={option.value ? counts[option.value] : devicesTampil.length}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        {sorted.length === 0 ? (
          <Empty
            title="Tidak ada alat yang cocok."
            hint="Ubah kata kunci atau filter tipe, area, dan status."
            icon="search-x"
            action={hasFilter && <Button variant="secondary" icon="x" onClick={clearFilters}>Hapus filter</Button>}
          />
        ) : (
          <>
            <Table
              caption="Daftar alat IoT, alat bermasalah di atas"
              columns={[
                { key: 'code', label: 'Kode alat', render: device => <span className="whitespace-nowrap font-mono text-sm">{device.code}</span> },
                { key: 'name', label: 'Nama', render: device => <div className="min-w-[11rem]">
                  <Tautan to={`/iot/${encodeURIComponent(device.id)}`} className="break-words">{device.name}</Tautan>
                  {(device.isSandbox || device.is_sandbox) && <span className="ml-2 inline-flex align-middle"><Badge tone="info" icon="flask-conical">Sandbox</Badge></span>}
                </div> },
                { key: 'area', label: 'Area', render: device => <span className="block min-w-[8rem] text-text-2">{device.areaRef?.trim() || 'Area belum diatur'}</span> },
                { key: 'type', label: 'Tipe', render: device => <span className="block min-w-[7rem] text-text-2">{deviceKindLabel(device)}</span> },
                { key: 'status', label: 'Status', render: device => <DeviceStatus status={device.status} /> },
                { key: 'readings', label: 'Pembacaan', render: device => {
                  const latest = latestByDevice[device.id];
                  if (latestLoading && !latest) return <span className="text-sm text-text-2">Memuat...</span>;
                  if (!latest && telemetryError) return <span className="text-sm text-bad-fg">Tidak dapat dimuat</span>;
                  const values = compactReadings(device, latest);
                  const shown = values.filter(item => item.text);
                  if (!shown.length) return <span className="text-sm text-text-2">Belum ada data</span>;
                  const outOfRange = values.some(item => item.state === 'low' || item.state === 'high');
                  return <div className="flex flex-col items-start gap-1">
                    <span className="font-num tabular-nums">{shown.map(item => item.text).join(' · ')}</span>
                    {outOfRange && <StatusPill tone="warn" icon="triangle-alert">Di luar batas</StatusPill>}
                  </div>;
                } },
                { key: 'measuredAt', label: 'Pengukuran terakhir', render: device => {
                  const measuredAt = latestByDevice[device.id]?.measuredAt || device.lastMeasuredAt;
                  return <time className="block min-w-[7rem] text-sm text-text-2" dateTime={measuredAt || undefined}>{formatMeasuredAt(measuredAt)}</time>;
                } },
              ]}
              rows={sorted}
            />
            <p className="text-sm text-text-2">Menampilkan {sorted.length} dari {devicesTampil.length} alat. Alat yang bermasalah ada di atas.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function DeviceDetail() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [loadedId, setLoadedId] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [telemetry, setTelemetry] = useState({ state: 'loading', latest: null, latestError: '', history: {}, historyErrors: {}, events: [], eventsError: '', error: '' });
  const [selectedSensor, setSelectedSensor] = useState('');
  const [streamStatus, setStreamStatus] = useState('idle');
  const [announcement, setAnnouncement] = useState('');
  // Status koneksi dari stream; null = pakai status saat detail dimuat.
  const [statusLive, setStatusLive] = useState(null);
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
      setStatusLive(null);
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
          setStatusLive(kini => statusKoneksiLive(kini ?? device.status, { jenis: 'reading', measuredAt: frame.measuredAt }));
          setTelemetry(current => ({ ...current, latest: next }));
        },
        onDeviceEvent: (event, eventId) => {
          if (event.deviceId !== device.id) return;
          const item = { ...event, id: eventId || event.id };
          const key = item.id || `${item.type}-${item.at}-${item.sensor || ''}`;
          if (eventsRef.current.some(existing => (existing.id || `${existing.type}-${existing.at}-${existing.sensor || ''}`) === key)) return;
          const events = sortEventsByIdDescending([item, ...eventsRef.current]).slice(0, 10);
          eventsRef.current = events;
          setStatusLive(kini => statusKoneksiLive(kini ?? device.status, { jenis: 'event', type: event.type }));
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

  const backLink = <Tautan to="/iot" icon="arrow-left" className="mb-3 text-sm">Kembali ke Daftar alat</Tautan>;

  if (state === 'loading' || loadedId !== id) {
    return (
      <div className="iot-touch-targets min-w-0">
        {backLink}
        <PageHeader title="Detail alat" />
        <Card><p className="text-sm text-text-2" role="status">Memuat detail perangkat...</p></Card>
      </div>
    );
  }

  if (state === 'error') return <ErrorState title="Detail alat" back={backLink} message={error} retry={() => {
    setState('loading');
    setError('');
    setAttempt(value => value + 1);
  }} />;

  const { device } = result;
  const sensors = device.sensors || [];
  const selected = sensors.find(sensor => sensor.code === selectedSensor) || sensors[0];
  const series = selected ? telemetry.history[selected.code] : null;
  const retryTelemetry = () => { void refreshTelemetryRef.current?.(); };
  const readingBySensor = new Map((telemetry.latest?.readings || []).map(reading => [reading.sensor, reading]));
  const measuredAt = telemetry.latest?.measuredAt;
  const statusAlat = statusLive ?? device.status;
  const stale = statusAlat !== 'online' || isMeasurementStale(measuredAt);
  const readingItems = sensors.map(sensor => {
    const reading = readingBySensor.get(sensor.code);
    const value = reading?.value ?? null;
    const threshold = reading?.threshold ?? sensor.threshold ?? null;
    const state = reading?.state || getSensorState(value, threshold);
    return { sensor, value: value == null ? null : Number(value), threshold, state, range: validRange(threshold) };
  });
  const outOfRange = readingItems.filter(item => item.state === 'low' || item.state === 'high');

  return (
    <div className="iot-touch-targets min-w-0">
      {backLink}
      <PageHeader
        title={device.name}
        subtitle={<>
          <span className="break-all font-mono">{device.code}</span>
          {' · '}{deviceKindLabel(device)}
          {device.areaRef?.trim() ? ` · ${device.areaRef.trim()}` : ''}
        </>}
        sample={result.label || undefined}
        actions={<>
          <DeviceStatus status={statusAlat} />
          {(device.isSandbox || device.is_sandbox) && <Badge tone="info" icon="flask-conical">Sandbox</Badge>}
          <StreamStatus status={streamStatus} />
          <TautanTombol to={`/iot/${encodeURIComponent(device.id)}/log`} variant="secondary" icon="history">Lihat log lengkap</TautanTombol>
        </>}
      />

      <div className="flex min-w-0 flex-col gap-4">
        {outOfRange.length > 0 && telemetry.state !== 'loading' && (
          <Alert tone="warn" title={outOfRange.map(item => `${sensorName(item.sensor)} ${item.state === 'high' ? 'di atas' : 'di bawah'} batas.`).join(' ')}>
            Periksa kondisi air dan nutrisi, lalu pantau pembacaan berikutnya.
          </Alert>
        )}
        {telemetry.error && telemetry.state !== 'loading' && !(telemetry.latestError && !telemetry.latest) && (
          <Alert tone="bad" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retryTelemetry}>Coba lagi</Button>}>
            {telemetry.error}
          </Alert>
        )}

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            {telemetry.state === 'loading' ? (
              <Card><p role="status" className="text-sm text-text-2">Memuat pembacaan, ambang, dan riwayat perangkat...</p></Card>
            ) : telemetry.latestError && !telemetry.latest ? (
              <Alert tone="bad" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retryTelemetry}>Coba lagi</Button>}>
                Pembacaan sensor tidak dapat dimuat: {telemetry.latestError}
              </Alert>
            ) : sensors.length === 0 ? (
              <Empty title="Konfigurasi sensor belum tersedia" icon="radio" />
            ) : (
              <AreaSection
                title="Pembacaan saat ini"
                meta={measuredAt ? `${formatMeasuredAt(measuredAt)}. Ambang mengikuti target efektif.` : 'Ambang mengikuti target efektif jika tersedia.'}
              >
                {readingItems.map(item => (
                  <SensorReading
                    key={item.sensor.code}
                    name={sensorName(item.sensor)}
                    icon={sensorIcon(item.sensor)}
                    device={device.code}
                    value={item.value}
                    decimals={item.sensor.decimals ?? 2}
                    unit={item.sensor.unit}
                    min={item.range?.min}
                    max={item.range?.max}
                    status={readingStatus(item.state, stale)}
                    measuredAt={measuredAt}
                    emptyText={EMPTY_READING_TEXT}
                  />
                ))}
              </AreaSection>
            )}
            <p className="sr-only" aria-live="polite">{announcement}</p>

            <Card
              title={selected ? `${sensorName(selected)}, 24 jam terakhir` : 'Riwayat sensor'}
              subtitle="Rata-rata per lima menit, dengan rentang minimum sampai maksimum dan ambang efektif."
            >
              {sensors.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Pilih sensor riwayat">
                  {sensors.map(sensor => (
                    <FilterChip
                      key={sensor.code}
                      active={selected?.code === sensor.code}
                      onClick={() => setSelectedSensor(sensor.code)}
                    >
                      {sensorName(sensor)}
                    </FilterChip>
                  ))}
                </div>
              )}
              {telemetry.state === 'loading' ? <p role="status" className="py-5 text-sm text-text-2">Memuat riwayat sensor...</p>
                : selected && telemetry.historyErrors[selected.code] && !series ? <p role="alert" className="py-4 text-sm text-bad-fg">Riwayat {selected.name || selected.code} tidak dapat dimuat: {telemetry.historyErrors[selected.code]}</p>
                  : selected && series ? <ReadingChart sensor={selected} points={series.points || []} threshold={series.threshold || selected.threshold} />
                    : <Empty title="Konfigurasi sensor belum tersedia" icon="radio" />}
            </Card>
          </div>

          <aside className="flex min-w-0 flex-col gap-4" aria-label="Kejadian dan informasi alat">
            <Card title="Log kejadian" subtitle="Perubahan ambang dan koneksi yang tercatat server.">
              {telemetry.state === 'loading' ? <p role="status" className="py-2 text-sm text-text-2">Memuat kejadian...</p>
                : telemetry.eventsError && !telemetry.events.length ? <p role="alert" className="py-2 text-sm text-bad-fg">Kejadian tidak dapat dimuat: {telemetry.eventsError}</p>
                  : <EventList events={telemetry.events} deviceCode={device.code} sensors={sensors} />}
            </Card>

            <Card title="Informasi alat">
              <dl className="flex flex-col divide-y divide-border">
                {[
                  ['Firmware', device.firmware || 'Belum tersedia'],
                  ['Sinyal RSSI', device.rssi == null ? 'Belum tersedia' : `${device.rssi} dBm`],
                  ['Kalibrasi terakhir', formatDate(device.calibratedAt)],
                  ['Pengukuran terakhir', formatDate(telemetry.latest?.measuredAt || device.lastMeasuredAt)],
                  ['Kiriman terakhir diterima', formatDate(device.lastReceivedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
                    <dt className="text-sm text-text-2">{label}</dt>
                    <dd className="break-words text-sm font-semibold text-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Belum tersedia' : date.toLocaleString('id-ID');
}

const EMPTY_DEVICES = [];
