import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';
import { Badge, Button, Card, Empty, Field, SectionTitle, Select } from '../components/ui';
import { IOT_SOURCE, iotApi } from '../services/iotApi.js';
import { iotStreamClient } from '../services/iotStream.js';
import SensorStateBadge from '../components/iot/SensorStateBadge.jsx';
import {
  createBoundedBatchRunner,
  createSlidingWindowBudget,
  getLocalDayRange,
  mergeEventPages,
  summarizeAreaPoints,
  AREA_HISTORY_LABEL,
  AREA_HISTORY_MAX_REQUESTS,
  AREA_HISTORY_REFRESH_MS,
  API_SESSION_REQUEST_LIMIT,
} from '../utils/monitoring.js';
import {
  formatEventMessage,
  formatMeasuredAt,
  formatSensorNumber,
  formatThreshold,
  mergeLatestReading,
} from '../utils/iotPresentation.js';

const TABS = [
  { id: 'package', label: 'Per paket' },
  { id: 'sensor', label: 'Per sensor' },
  { id: 'area', label: 'Per area' },
];

function nextTabId(currentTabId, key) {
  const currentIndex = TABS.findIndex(tab => tab.id === currentTabId);
  if (currentIndex < 0) return null;
  if (key === 'Home') return TABS[0].id;
  if (key === 'End') return TABS[TABS.length - 1].id;
  if (key === 'ArrowRight') return TABS[(currentIndex + 1) % TABS.length].id;
  if (key === 'ArrowLeft') return TABS[(currentIndex - 1 + TABS.length) % TABS.length].id;
  return null;
}
const DEVICE_STATUSES = {
  online: { label: 'Terhubung', tone: 'ok' },
  stale: { label: 'Data tertunda', tone: 'warn' },
  offline: { label: 'Tidak terhubung', tone: 'bad' },
};
const EVENT_TYPES = [
  { value: 'online', label: 'Terhubung kembali' },
  { value: 'offline', label: 'Tidak terhubung' },
  { value: 'threshold_low', label: 'Di bawah ambang' },
  { value: 'threshold_high', label: 'Di atas ambang' },
  { value: 'threshold_clear', label: 'Kembali normal' },
];
const COMPARE_SERIES = [
  { stroke: 'stroke-primary', text: 'text-primary' },
  { stroke: 'stroke-tertiary', text: 'text-tertiary' },
  { stroke: 'stroke-secondary', text: 'text-secondary' },
];
const SENSOR_HISTORY_LABEL = '24 jam terakhir';

function deviceSensors(device) {
  return device?.type?.sensors || device?.sensors || [];
}

function dateRange24h(now = new Date()) {
  const end = new Date(now);
  return { from: new Date(end.getTime() - 24 * 60 * 60_000).toISOString(), to: end.toISOString() };
}

function dateLabel(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
}

function sensorLabel(sensor) {
  return sensor?.name || sensor?.label || sensor?.code || 'Sensor';
}

function EventLogPanel({
  events,
  eventCursor,
  eventDeviceId,
  eventType,
  eventState,
  eventError,
  loadingMoreEvents,
  liveDevices,
  sensorTypes,
  deviceById,
  onDeviceChange,
  onTypeChange,
  onRetry,
  onLoadMore,
}) {
  const sensorNames = Object.fromEntries(sensorTypes.map(sensor => [sensor.code, sensor.name || sensor.code]));

  return (
    <Card pad="sm" className="space-y-4">
      <SectionTitle title="Log kejadian" subtitle="Filter kejadian perangkat dan buka halaman sebelumnya." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Perangkat"><Select value={eventDeviceId} onChange={onDeviceChange} options={liveDevices.map(device => ({ value: device.id, label: `${device.name} · ${device.code}` }))} placeholder="Semua perangkat" /></Field>
        <Field label="Jenis kejadian"><Select value={eventType} onChange={onTypeChange} options={EVENT_TYPES} placeholder="Semua kejadian" /></Field>
      </div>
      <p className="text-xs text-on-surface-variant">Halaman mengikuti ID kejadian menurun. Waktu memakai nilai `at` dari API.</p>
      {eventState === 'loading' && <p role="status" className="py-2 text-sm text-on-surface-variant">Memuat log kejadian...</p>}
      {eventState === 'error' && <ErrorPanel message={eventError} onRetry={onRetry} />}
      {eventState === 'ready' && eventError && <p role="alert" className="text-sm text-red-800 dark:text-red-200">{eventError}</p>}
      {eventState === 'ready' && events.length === 0 && !eventError && <Empty title="Belum ada kejadian" hint="Kejadian perangkat akan muncul setelah API mencatat perubahan koneksi atau ambang." icon="history" />}
      {eventState === 'ready' && events.length > 0 && <div className="space-y-2">{events.map(event => <Card key={event.id} pad="sm" className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-on-surface">{formatEventMessage(event, sensorNames)}</p>
          <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{deviceById.get(event.deviceId)?.code || event.deviceId} · ID {event.id}</p>
        </div>
        <time className="shrink-0 text-xs text-on-surface-variant" dateTime={event.at}>{dateLabel(event.at)}</time>
      </Card>)}</div>}
      {eventState === 'ready' && eventCursor && <div className="flex justify-center"><Button variant="ghost" icon="expand_more" disabled={loadingMoreEvents} onClick={onLoadMore}>{loadingMoreEvents ? 'Memuat kejadian...' : 'Muat kejadian sebelumnya'}</Button></div>}
    </Card>
  );
}

function DeviceStatus({ status }) {
  const value = DEVICE_STATUSES[status] || { label: 'Status tidak diketahui', tone: 'muted' };
  return <Badge tone={value.tone}>{value.label}</Badge>;
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
      <p>{message}</p>
      {onRetry && <Button variant="ghost" icon="refresh" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}

function historyRange(points = []) {
  const valid = points.filter(point => Number.isFinite(Number(point.min)) && Number.isFinite(Number(point.max)));
  if (!valid.length) return null;
  return {
    min: Math.min(...valid.map(point => Number(point.min))),
    max: Math.max(...valid.map(point => Number(point.max))),
    values: points.map(point => Number(point.avg)).filter(Number.isFinite),
  };
}

function Sparkline({ sensor, history }) {
  const points = history?.points || [];
  const summary = historyRange(points);
  if (!summary) return <p className="text-xs text-on-surface-variant">Belum ada data untuk {SENSOR_HISTORY_LABEL.toLowerCase()}.</p>;

  const low = Math.min(...summary.values);
  const high = Math.max(...summary.values);
  const span = high - low || 1;
  const coordinates = summary.values.map((value, index) => {
    const x = summary.values.length < 2 ? 160 : 4 + (index / (summary.values.length - 1)) * 312;
    const y = 42 - ((value - low) / span) * 34;
    return `${x},${y}`;
  }).join(' ');
  const decimals = sensor.decimals ?? 2;
  const unit = sensor.unit ? ` ${sensor.unit}` : '';
  const accessibleRange = `Min ${formatSensorNumber(summary.min, decimals)}${unit}, maks ${formatSensorNumber(summary.max, decimals)}${unit}`;

  return (
    <figure className="min-w-0" aria-label={`${sensorLabel(sensor)} ${SENSOR_HISTORY_LABEL}. ${accessibleRange}`}>
      <figcaption className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-on-surface-variant">
        <span>{SENSOR_HISTORY_LABEL}</span>
        <span>{accessibleRange}</span>
      </figcaption>
      <svg className="mt-1 h-12 w-full overflow-visible text-primary dark:text-inverse-primary" viewBox="0 0 320 48" role="img" aria-label={`${sensorLabel(sensor)} ${SENSOR_HISTORY_LABEL}. ${accessibleRange}`}>
        <polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </figure>
  );
}

function ComparisonChart({ series, sensor }) {
  const validSeries = series.map(item => ({ ...item, points: item.history?.points || [] }))
    .filter(item => item.points.some(point => Number.isFinite(Number(point.avg))));
  if (!validSeries.length) return <p className="text-sm text-on-surface-variant">Pilih perangkat untuk membandingkan riwayat sensor.</p>;

  const values = validSeries.flatMap(item => item.points.map(point => Number(point.avg)).filter(Number.isFinite));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const summaries = validSeries.map(item => {
    const summary = historyRange(item.points);
    const range = `min ${formatSensorNumber(summary.min, sensor.decimals ?? 2)}, maks ${formatSensorNumber(summary.max, sensor.decimals ?? 2)}${sensor.unit ? ` ${sensor.unit}` : ''}`;
    return `${item.device.name} ${range}`;
  });
  const description = `Perbandingan ${sensorLabel(sensor)} ${SENSOR_HISTORY_LABEL}: ${summaries.join('; ')}`;

  return (
    <figure className="min-w-0 rounded-xl border border-outline-variant/40 p-3" aria-label={description}>
      <figcaption className="mb-2 text-sm font-semibold text-on-surface">Riwayat {sensorLabel(sensor).toLowerCase()}, {SENSOR_HISTORY_LABEL.toLowerCase()}</figcaption>
      <svg className="h-36 w-full" viewBox="0 0 320 120" role="img" aria-label={description}>
        {validSeries.map((item, seriesIndex) => {
          const points = item.points.filter(point => Number.isFinite(Number(point.avg)));
          const coordinates = points.map((point, index) => {
            const x = points.length < 2 ? 160 : 4 + (index / (points.length - 1)) * 312;
            const y = 112 - ((Number(point.avg) - low) / span) * 104;
            return `${x},${y}`;
          }).join(' ');
          return <polyline key={item.device.id} points={coordinates} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={COMPARE_SERIES[seriesIndex].stroke} />;
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
        {validSeries.map((item, index) => <li key={item.device.id} className={`break-words ${COMPARE_SERIES[index].text}`}>
          <span className="font-semibold">{item.device.name}</span>: {summaries[index].replace(`${item.device.name} `, '')}
        </li>)}
      </ul>
    </figure>
  );
}

function latestReadingFor(latestByDevice, deviceId, sensorCode) {
  return latestByDevice[deviceId]?.readings?.find(reading => reading.sensor === sensorCode) || null;
}

export default function Monitoring() {
  const { currentUser } = useSmart();
  const [activeTab, setActiveTab] = useState('package');
  const [catalogResult, setCatalogResult] = useState({ key: '', state: 'loading', error: '' });
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [devices, setDevices] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [latestByDevice, setLatestByDevice] = useState({});
  const [latestState, setLatestState] = useState('loading');
  const [latestError, setLatestError] = useState('');
  const [packageState, setPackageState] = useState('idle');
  const [packageError, setPackageError] = useState('');
  const [packageHistories, setPackageHistories] = useState({});
  const [packageAttempt, setPackageAttempt] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [sensorState, setSensorState] = useState('idle');
  const [sensorError, setSensorError] = useState('');
  const [sensorAttempt, setSensorAttempt] = useState(0);
  const [sensorItems, setSensorItems] = useState([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [comparisonState, setComparisonState] = useState('idle');
  const [comparisonError, setComparisonError] = useState('');
  const [comparisonHistories, setComparisonHistories] = useState({});
  const [comparisonAttempt, setComparisonAttempt] = useState(0);
  const [eventDeviceId, setEventDeviceId] = useState('');
  const [eventType, setEventType] = useState('');
  const [events, setEvents] = useState([]);
  const [eventCursor, setEventCursor] = useState(null);
  const [eventState, setEventState] = useState('idle');
  const [eventError, setEventError] = useState('');
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const [eventAttempt, setEventAttempt] = useState(0);
  const [areaState, setAreaState] = useState('idle');
  const [areaError, setAreaError] = useState('');
  const [areaRows, setAreaRows] = useState([]);
  const [areaCounters, setAreaCounters] = useState({ started: 0, total: 0, used: 0, remaining: API_SESSION_REQUEST_LIMIT });

  const latestRef = useRef({});
  const devicesRef = useRef([]);
  const eventFiltersRef = useRef({ deviceId: '', type: '' });
  const refreshLatestRef = useRef(null);
  const lastAreaRefreshAt = useRef(0);
  const areaRefreshActionRef = useRef(null);
  const latestRunner = useRef(createBoundedBatchRunner({ concurrency: 4, maxRequests: 20 }));
  const packageRunner = useRef(createBoundedBatchRunner({ concurrency: 4, maxRequests: API_SESSION_REQUEST_LIMIT }));
  const comparisonRunner = useRef(createBoundedBatchRunner({ concurrency: 3, maxRequests: 3 }));
  const [areaBudget] = useState(() => createSlidingWindowBudget());
  const [areaRunner] = useState(() => createBoundedBatchRunner({ budget: areaBudget, concurrency: 4, maxRequests: AREA_HISTORY_MAX_REQUESTS }));
  const areaController = useRef(null);

  const liveDevices = useMemo(() => devices.filter(device => !device.isSandbox && !device.is_sandbox), [devices]);
  const packageDevices = useMemo(() => liveDevices.filter(device => device.type?.kind === 'paket'), [liveDevices]);
  const packageSensors = useMemo(() => packageDevices.flatMap(device => deviceSensors(device).map(sensor => ({ device, sensor }))), [packageDevices]);
  const deviceById = useMemo(() => new Map(liveDevices.map(device => [device.id, device])), [liveDevices]);
  const sensorOptions = useMemo(() => sensorTypes.map(sensor => ({ value: sensor.code, label: `${sensor.name || sensor.code}${sensor.unit ? ` (${sensor.unit})` : ''}` })), [sensorTypes]);
  const selectedSensorType = sensorTypes.find(sensor => sensor.code === selectedSensor) || null;
  const catalogRequestKey = `${currentUser?.id || ''}:${catalogAttempt}`;
  const catalogState = IOT_SOURCE !== 'api'
    ? 'disabled'
    : catalogResult.key === catalogRequestKey ? catalogResult.state : 'loading';
  const catalogError = catalogResult.key === catalogRequestKey ? catalogResult.error : '';

  useEffect(() => { latestRef.current = latestByDevice; }, [latestByDevice]);
  useEffect(() => { devicesRef.current = liveDevices; }, [liveDevices]);
  useEffect(() => { eventFiltersRef.current = { deviceId: eventDeviceId, type: eventType }; }, [eventDeviceId, eventType]);

  useEffect(() => {
    if (IOT_SOURCE !== 'api') return undefined;
    let active = true;
    const controller = new AbortController();
    iotApi.getDevices({ userId: currentUser?.id, signal: controller.signal }).then(result => {
      if (!active) return;
      setDevices((result.devices || []).filter(device => !device.isSandbox && !device.is_sandbox));
      setSensorTypes(result.sensorTypes || []);
      setSelectedSensor(current => current || result.sensorTypes?.[0]?.code || '');
      setCatalogResult({ key: catalogRequestKey, state: 'ready', error: '' });
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setCatalogResult({ key: catalogRequestKey, state: 'error', error: error.message || 'Daftar perangkat tidak dapat dimuat.' });
    });
    return () => { active = false; controller.abort(); };
  }, [catalogRequestKey, currentUser?.id]);

  const refreshLatest = useCallback(async (signal) => {
    const targets = devicesRef.current;
    if (!targets.length) {
      setLatestByDevice({});
      setLatestState('ready');
      setLatestError('');
      return;
    }
    const tasks = targets.map(device => () => iotApi.getDeviceLatest(device.id, { signal }));
    const result = await latestRunner.current.run(tasks);
    if (result.skipped || signal?.aborted) return;
    const failed = result.results.filter(item => item.status === 'rejected');
    const updates = result.results.flatMap((item, index) => item.status === 'fulfilled' ? [[targets[index].id, item.value]] : []);
    if (updates.length) {
      setLatestByDevice(current => ({ ...current, ...Object.fromEntries(updates) }));
      setLatestState('ready');
    } else if (failed.length) setLatestState('error');
    setLatestError(failed.length ? `${failed.length} dari ${targets.length} pembacaan gagal dimuat. ${failed[0].reason?.message || ''}`.trim() : '');
  }, []);

  const retryLatest = useCallback(() => {
    if (latestRunner.current.isRunning()) return;
    setLatestError('');
    setLatestState('loading');
    void refreshLatest();
  }, [refreshLatest]);

  useEffect(() => { refreshLatestRef.current = refreshLatest; }, [refreshLatest]);

  useEffect(() => {
    if (catalogState === 'ready') void refreshLatest();
  }, [catalogState, refreshLatest]);

  useEffect(() => {
    if (catalogState !== 'ready' || IOT_SOURCE !== 'api') return undefined;
    const stop = iotStreamClient.subscribe({
      onReading: frame => {
        const previous = latestRef.current[frame.deviceId];
        const next = mergeLatestReading(previous, frame);
        if (!next || next === previous) return;
        latestRef.current = { ...latestRef.current, [frame.deviceId]: next };
        setLatestByDevice(latestRef.current);
      },
      onDeviceEvent: (event, id) => {
        const value = { ...event, id: id ?? event?.id };
        if (!value.id) return;
        const filter = eventFiltersRef.current;
        if (filter.deviceId && value.deviceId !== filter.deviceId) return;
        if (filter.type && value.type !== filter.type) return;
        setEvents(current => mergeEventPages([value], current));
      },
      onRefresh: () => { void refreshLatestRef.current?.(); },
    });
    return stop;
  }, [catalogState]);

  useEffect(() => {
    if (catalogState !== 'ready' || activeTab !== 'package') return undefined;
    let active = true;
    const controller = new AbortController();
    const sensors = packageSensors;
    if (!sensors.length) return () => { active = false; controller.abort(); };
    const range = dateRange24h();
    const tasks = sensors.map(({ device, sensor }) => () => iotApi.getDeviceReadings(device.id, {
      sensor: sensor.code,
      ...range,
      bucket: '5m',
      signal: controller.signal,
    }));
    packageRunner.current.run(tasks).then(result => {
      if (!active || controller.signal.aborted) return;
      if (result.skipped) {
        setPackageError('Riwayat sensor sedang dimuat oleh permintaan lain. Coba lagi.');
        setPackageState('error');
        return;
      }
      const fulfilled = result.results.flatMap((entry, index) => entry.status === 'fulfilled'
        ? [[`${sensors[index].device.id}:${sensors[index].sensor.code}`, entry.value]]
        : []);
      const failures = result.results.filter(entry => entry.status === 'rejected');
      if (fulfilled.length) setPackageHistories(current => ({ ...current, ...Object.fromEntries(fulfilled) }));
      if (!fulfilled.length && failures.length) setPackageState('error');
      else setPackageState('ready');
      setPackageError(failures.length
        ? `${failures.length} dari ${sensors.length} riwayat sensor gagal dimuat. ${failures[0].reason?.message || ''}`.trim()
        : '');
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setPackageError(error.message || 'Riwayat sensor paket tidak dapat dimuat.');
      setPackageState('error');
    });
    return () => { active = false; controller.abort(); };
  }, [activeTab, catalogState, packageAttempt, packageSensors]);

  useEffect(() => {
    if (catalogState !== 'ready' || activeTab !== 'sensor' || !selectedSensor) return undefined;
    let active = true;
    const controller = new AbortController();
    iotApi.getSensorOverview(selectedSensor, { signal: controller.signal }).then(result => {
      if (!active) return;
      const items = (result.items || []).filter(item => deviceById.has(item.deviceId)).map(item => ({
        ...item,
        device: deviceById.get(item.deviceId),
      }));
      setSensorItems(items);
      setSensorState('ready');
      setSelectedCompareIds(current => current.filter(id => items.some(item => item.deviceId === id)).slice(0, 3));
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setSensorError(error.message || 'Ringkasan sensor tidak dapat dimuat.');
      setSensorState('error');
    });
    return () => { active = false; controller.abort(); };
  }, [activeTab, catalogState, selectedSensor, deviceById, sensorAttempt]);

  useEffect(() => {
    if (catalogState !== 'ready' || activeTab !== 'sensor' || selectedCompareIds.length === 0) {
      return undefined;
    }
    let active = true;
    const controller = new AbortController();
    const range = dateRange24h();
    const tasks = selectedCompareIds.map(id => () => iotApi.getDeviceReadings(id, {
      sensor: selectedSensor,
      ...range,
      bucket: '5m',
      signal: controller.signal,
    }));
    comparisonRunner.current.run(tasks).then(result => {
      if (!active || controller.signal.aborted) return;
      if (result.skipped) {
        setComparisonError('Riwayat perbandingan sedang dimuat oleh permintaan lain. Coba lagi.');
        setComparisonState('error');
        return;
      }
      const fulfilled = result.results.flatMap((entry, index) => entry.status === 'fulfilled'
        ? [[selectedCompareIds[index], entry.value]]
        : []);
      const failures = result.results.filter(entry => entry.status === 'rejected');
      setComparisonHistories(current => ({ ...current, ...Object.fromEntries(fulfilled) }));
      setComparisonError(failures.length ? failures[0].reason?.message || 'Riwayat perbandingan tidak dapat dimuat.' : '');
      setComparisonState(fulfilled.length || !failures.length ? 'ready' : 'error');
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setComparisonError(error.message || 'Riwayat perbandingan tidak dapat dimuat.');
      setComparisonState('error');
    });
    return () => { active = false; controller.abort(); };
  }, [activeTab, catalogState, selectedCompareIds, selectedSensor, comparisonAttempt]);

  const loadEvents = useCallback(async ({ cursor = null, append = false, signal } = {}) => {
    if (append) setLoadingMoreEvents(true);
    try {
      const result = await iotApi.getEvents({
        deviceId: eventDeviceId || undefined,
        type: eventType || undefined,
        cursor: cursor || undefined,
        limit: 50,
        signal,
      });
      if (signal?.aborted) return;
      setEvents(current => append ? mergeEventPages(current, result.events || []) : mergeEventPages([], result.events || []));
      setEventCursor(result.nextCursor || null);
      setEventState('ready');
      setEventError('');
    } catch (error) {
      if (signal?.aborted) return;
      setEventError(error.message || 'Log kejadian tidak dapat dimuat.');
      if (!append) setEventState('error');
    } finally {
      if (!signal?.aborted) setLoadingMoreEvents(false);
    }
  }, [eventDeviceId, eventType]);

  useEffect(() => {
    if (catalogState !== 'ready') return undefined;
    let active = true;
    const controller = new AbortController();
    iotApi.getEvents({
      deviceId: eventDeviceId || undefined,
      type: eventType || undefined,
      limit: 50,
      signal: controller.signal,
    }).then(result => {
      if (!active || controller.signal.aborted) return;
      setEvents(mergeEventPages([], result.events || []));
      setEventCursor(result.nextCursor || null);
      setEventState('ready');
      setEventError('');
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setEventError(error.message || 'Log kejadian tidak dapat dimuat.');
      setEventState('error');
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [catalogState, eventDeviceId, eventType, eventAttempt]);

  const refreshArea = useCallback(async ({ signal, active = () => true } = {}) => {
    const range = getLocalDayRange();
    const sensors = liveDevices.flatMap(device => deviceSensors(device)
      .filter(_sensor => device.areaRef?.trim())
      .map(sensor => ({ device, sensor })));
    if (!sensors.length) {
      setAreaRows([]);
      setAreaState('ready');
      setAreaError('');
      setAreaCounters({ started: 0, total: 0, used: areaBudget.used(), remaining: areaBudget.remaining() });
      return;
    }
    if (areaRunner.isRunning()) {
      if (active()) {
        setAreaState('error');
        setAreaError('Pembaruan ringkasan area sebelumnya masih berjalan. Coba lagi setelah selesai.');
      }
      return;
    }

    setAreaState('loading');
    setAreaError('');
    const tasks = sensors.map(({ device, sensor }) => () => iotApi.getDeviceReadings(device.id, {
      sensor: sensor.code,
      from: range.from,
      to: range.to,
      bucket: '5m',
      signal,
    }));
    try {
      const batch = await areaRunner.run(tasks);
      if (batch.skipped) {
        if (active()) {
          setAreaState('error');
          setAreaError('Pembaruan ringkasan area sebelumnya masih berjalan. Coba lagi setelah selesai.');
        }
        return;
      }
      if (signal?.aborted) {
        if (active()) setAreaState('idle');
        return;
      }
      if (!active()) return;
      const rows = new Map();
      const errors = batch.results.filter(result => result.status === 'rejected');
      for (const [index, result] of batch.results.entries()) {
        if (result.status !== 'fulfilled') continue;
        const { device, sensor } = sensors[index];
        const key = `${device.areaRef}\u0000${sensor.code}`;
        const entry = rows.get(key) || {
          areaRef: device.areaRef.trim(),
          sensor,
          points: [],
        };
        entry.points.push(...(result.value.points || []));
        rows.set(key, entry);
      }
      const nextRows = [...rows.values()].map(row => ({ ...row, summary: summarizeAreaPoints(row.points) }))
        .sort((left, right) => left.areaRef.localeCompare(right.areaRef, 'id') || sensorLabel(left.sensor).localeCompare(sensorLabel(right.sensor), 'id'));
      setAreaRows(nextRows);
      setAreaState('ready');
      setAreaError(errors.length
        ? `${errors.length} dari ${sensors.length} permintaan riwayat gagal. ${errors[0].reason?.message || ''}`.trim()
        : '');
      setAreaCounters({ started: batch.counters.started, total: batch.counters.total, used: areaBudget.used(), remaining: areaBudget.remaining() });
    } catch (error) {
      if (signal?.aborted || !active()) return;
      setAreaState('error');
      setAreaError(error.message || 'Riwayat area tidak dapat dimuat.');
      setAreaCounters({ started: 0, total: tasks.length, used: areaBudget.used(), remaining: areaBudget.remaining() });
    }
  }, [areaBudget, areaRunner, liveDevices]);

  useEffect(() => {
    if (catalogState !== 'ready' || activeTab !== 'area') return undefined;
    let active = true;
    let interval = null;
    let deferred = null;
    const refresh = () => {
      if (!active || document.visibilityState !== 'visible') return;
      if (areaRunner.isRunning()) {
        setAreaState('waiting');
        setAreaError('');
        if (deferred === null) {
          deferred = setTimeout(() => {
            deferred = null;
            refresh();
          }, 250);
        }
        return;
      }
      const now = Date.now();
      const waitMs = lastAreaRefreshAt.current
        ? AREA_HISTORY_REFRESH_MS - (now - lastAreaRefreshAt.current)
        : 0;
      if (waitMs > 0) {
        setAreaState('waiting');
        setAreaError('');
        if (deferred === null) {
          deferred = setTimeout(() => {
            deferred = null;
            refresh();
          }, waitMs);
        }
        return;
      }
      if (deferred !== null) clearTimeout(deferred);
      deferred = null;
      lastAreaRefreshAt.current = now;
      const controller = new AbortController();
      areaController.current = controller;
      void refreshArea({ signal: controller.signal, active: () => active });
    };
    areaRefreshActionRef.current = refresh;
    const stopWhenHidden = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        if (interval === null) interval = setInterval(refresh, AREA_HISTORY_REFRESH_MS);
      } else {
        if (interval !== null) clearInterval(interval);
        interval = null;
        if (deferred !== null) clearTimeout(deferred);
        deferred = null;
        areaController.current?.abort();
        areaController.current = null;
      }
    };
    stopWhenHidden();
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      active = false;
      if (interval !== null) clearInterval(interval);
      if (deferred !== null) clearTimeout(deferred);
      areaController.current?.abort();
      areaController.current = null;
      areaRefreshActionRef.current = null;
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [activeTab, areaRunner, catalogState, refreshArea]);

  const retryCatalog = () => {
    setCatalogAttempt(value => value + 1);
  };

  function resetEventQuery() {
    setEvents([]);
    setEventCursor(null);
    setLoadingMoreEvents(false);
    setEventError('');
    setEventState('loading');
  }

  function retryEvents() {
    resetEventQuery();
    setEventAttempt(value => value + 1);
  }

  function changeEventDevice(value) {
    resetEventQuery();
    setEventDeviceId(value);
  }

  function changeEventType(value) {
    resetEventQuery();
    setEventType(value);
  }

  function retryComparison() {
    if (comparisonRunner.current.isRunning()) return;
    setComparisonError('');
    setComparisonState('loading');
    setComparisonAttempt(value => value + 1);
  }

  function retrySensor() {
    setSensorError('');
    setSensorState('loading');
    setSensorAttempt(value => value + 1);
  }

  function retryPackage() {
    if (packageRunner.current.isRunning()) return;
    setPackageError('');
    setPackageState('loading');
    setPackageAttempt(value => value + 1);
  }

  const currentSensorItems = sensorItems.map(item => {
    const latest = latestReadingFor(latestByDevice, item.deviceId, selectedSensor);
    return latest ? { ...item, value: latest.value, state: latest.state, threshold: latest.threshold, measuredAt: latestByDevice[item.deviceId]?.measuredAt } : item;
  }).sort((left, right) => Number(right.state === 'low' || right.state === 'high') - Number(left.state === 'low' || left.state === 'high')
    || String(left.device?.code || '').localeCompare(String(right.device?.code || ''), 'id'));

  function toggleComparison(deviceId) {
    const next = selectedCompareIds.includes(deviceId)
      ? selectedCompareIds.filter(id => id !== deviceId)
      : selectedCompareIds.length >= 3 ? selectedCompareIds : [...selectedCompareIds, deviceId];
    setSelectedCompareIds(next);
    setComparisonState(next.length ? 'loading' : 'idle');
    setComparisonError('');
  }

  function renderPackageTab() {
    if (!packageSensors.length) return <Empty
      title={packageDevices.length ? 'Sensor paket belum tersedia' : 'Belum ada perangkat paket live'}
      hint={packageDevices.length ? 'Sensor paket akan muncul setelah tersedia pada daftar API.' : 'Perangkat paket yang terpasang akan muncul di sini.'}
      icon="deployed_code"
    />;
    if (packageState === 'loading' || packageState === 'idle') return <p role="status" className="py-4 text-sm text-on-surface-variant">Memuat riwayat sensor paket...</p>;
    if (packageState === 'error') return <ErrorPanel message={packageError} onRetry={retryPackage} />;
    return <div className="space-y-4">
      {packageError && <p role="alert" className="text-sm text-red-800 dark:text-red-200">{packageError}</p>}
      {packageDevices.map(device => {
        const latest = latestByDevice[device.id];
        return <Card key={device.id} pad="sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-base font-bold text-on-surface">{device.name}</h3>
              <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{device.code} · {device.type?.name || device.type?.code}</p>
              {device.areaRef && <p className="mt-1 text-xs text-on-surface-variant">Area: {device.areaRef}</p>}
            </div>
            <div className="flex flex-wrap gap-2"><DeviceStatus status={device.status} /><Link to={`/iot/${encodeURIComponent(device.id)}`} className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-inverse-primary">Buka perangkat</Link></div>
          </div>
          <div className="mt-4 divide-y divide-outline-variant/30">
            {deviceSensors(device).map(sensor => {
              const reading = latestReadingFor(latestByDevice, device.id, sensor.code);
              const history = packageHistories[`${device.id}:${sensor.code}`];
              return <div key={sensor.code} className="grid min-w-0 gap-3 py-3 md:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.4fr)] md:items-start">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface">{sensorLabel(sensor)}</p>
                  <p className="mt-1 break-words text-xs text-on-surface-variant">{reading?.value == null ? 'Belum ada data' : `${formatSensorNumber(reading.value, sensor.decimals ?? 2)}${sensor.unit ? ` ${sensor.unit}` : ''}`}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {reading && <SensorStateBadge state={reading.state} />}
                    <span className="break-words text-xs text-on-surface-variant">{reading?.threshold
                      ? formatThreshold(reading.threshold, sensor.unit || '', sensor.decimals ?? 2)
                      : 'Ambang efektif belum dimuat'}</span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{formatMeasuredAt(latest?.measuredAt)}</p>
                </div>
                <Sparkline sensor={sensor} history={history} />
              </div>;
            })}
          </div>
        </Card>;
      })}
    </div>;
  }

  function renderSensorTab() {
    if (!sensorOptions.length) return <Empty title="Jenis sensor belum tersedia" hint="Jenis sensor akan muncul setelah tersedia di daftar API." icon="sensors" />;
    return <div className="space-y-4">
      <Card pad="sm"><Field label="Jenis sensor"><Select value={selectedSensor} onChange={value => {
        setSelectedSensor(value);
        setSensorState('loading');
        setSensorError('');
        setSelectedCompareIds([]);
        setComparisonState('idle');
        setComparisonError('');
        setComparisonHistories({});
      }} options={sensorOptions} /></Field></Card>
      {sensorState === 'loading' || sensorState === 'idle' ? <p role="status" className="py-4 text-sm text-on-surface-variant">Memuat ringkasan sensor...</p>
        : sensorState === 'error' ? <ErrorPanel message={sensorError} onRetry={retrySensor} />
          : <>
            {sensorError && <p role="alert" className="text-sm text-red-800 dark:text-red-200">{sensorError}</p>}
            {currentSensorItems.length === 0 ? <Empty title="Belum ada perangkat dengan sensor ini" hint="Pilih jenis sensor lain atau periksa perangkat yang sudah terpasang." icon="sensors" /> : (
              <Card pad="sm">
                <SectionTitle title={selectedSensorType?.name || selectedSensor} subtitle="Perangkat satuan dan paket ditampilkan bersama. Nilai ambang dan waktu berasal dari API." />
                <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-surface-container-high/70 text-left text-xs text-on-surface-variant"><tr>
                      <th className="px-3 py-2.5">Perangkat</th><th className="px-3 py-2.5">Area</th><th className="px-3 py-2.5">Nilai</th><th className="px-3 py-2.5">Ambang</th><th className="px-3 py-2.5">Waktu ukur</th>
                    </tr></thead>
                    <tbody className="divide-y divide-outline-variant/30">{currentSensorItems.map(item => {
                      const sensor = deviceSensors(item.device).find(value => value.code === selectedSensor) || selectedSensorType || {};
                      return <tr key={item.deviceId}>
                        <td className="px-3 py-3">
                          <Link to={`/iot/${encodeURIComponent(item.deviceId)}`} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-inverse-primary">{item.device?.name || item.deviceCode}</Link>
                          <span className="mt-1 block break-all font-mono text-[11px] text-on-surface-variant">{item.deviceCode} · {item.device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {item.device?.type?.name || item.device?.type?.code}</span>
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant">{item.areaRef || 'Area belum diatur'}</td>
                        <td className="px-3 py-3">
                          <span className="block font-bold tabular-nums text-on-surface">{item.value == null ? 'Belum ada data' : `${formatSensorNumber(item.value, sensor.decimals ?? 2)}${item.unit ? ` ${item.unit}` : ''}`}</span>
                          <span className="mt-1 inline-flex"><SensorStateBadge state={item.state} /></span>
                        </td>
                        <td className="max-w-48 px-3 py-3 text-xs text-on-surface-variant">{formatThreshold(item.threshold, item.unit || '', sensor.decimals ?? 2)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-on-surface-variant">{dateLabel(item.measuredAt)}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              </Card>
            )}
            {currentSensorItems.length > 0 && <Card pad="sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold text-on-surface">Bandingkan riwayat</h3><p className="mt-1 text-xs text-on-surface-variant">Pilih sampai tiga perangkat. Riwayat memakai pembacaan lima menit dalam 24 jam terakhir.</p></div>
                <span className="text-xs tabular-nums text-on-surface-variant">{selectedCompareIds.length}/3 dipilih</span>
              </div>
              <fieldset className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <legend className="sr-only">Perangkat untuk dibandingkan</legend>
                {currentSensorItems.map(item => <label key={item.deviceId} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-outline-variant/50 px-3 py-2 text-sm text-on-surface focus-within:ring-2 focus-within:ring-primary">
                  <input type="checkbox" checked={selectedCompareIds.includes(item.deviceId)} disabled={!selectedCompareIds.includes(item.deviceId) && selectedCompareIds.length >= 3} onChange={() => toggleComparison(item.deviceId)} className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                  <span className="min-w-0"><span className="block truncate font-semibold">{item.device?.name || item.deviceCode}</span><span className="block truncate text-xs text-on-surface-variant">{item.deviceCode}</span></span>
                </label>)}
              </fieldset>
              {selectedCompareIds.length > 0 && comparisonState === 'loading' && <p role="status" className="mt-3 text-sm text-on-surface-variant">Memuat riwayat perbandingan...</p>}
              {selectedCompareIds.length > 0 && comparisonError && <div role="alert" className="mt-3 space-y-2 text-sm text-red-800 dark:text-red-200"><p>{comparisonError}</p><Button variant="ghost" icon="refresh" onClick={retryComparison}>Coba lagi</Button></div>}
              {selectedCompareIds.length > 0 && comparisonState === 'error' && !comparisonError && <div role="alert" className="mt-3 space-y-2 text-sm text-red-800 dark:text-red-200"><p>Riwayat perbandingan tidak dapat dimuat.</p><Button variant="ghost" icon="refresh" onClick={retryComparison}>Coba lagi</Button></div>}
              {selectedCompareIds.length > 0 && comparisonState === 'ready' && <div className="mt-4"><ComparisonChart
                sensor={selectedSensorType || { code: selectedSensor }}
                series={selectedCompareIds.map(id => ({ device: deviceById.get(id), history: comparisonHistories[id] })).filter(item => item.device)}
              /></div>}
            </Card>}
          </>}
    </div>;
  }

  function renderAreaTab() {
    const areas = [...new Set(liveDevices.map(device => device.areaRef?.trim()).filter(Boolean))];
    if (areaState === 'loading' || areaState === 'idle') return <div className="space-y-3"><p role="status" className="text-sm text-on-surface-variant">Memuat ringkasan pembacaan hari ini...</p><p className="text-xs text-on-surface-variant">{AREA_HISTORY_LABEL}</p></div>;
    if (areaState === 'waiting') return <div className="space-y-3"><p role="status" className="text-sm text-on-surface-variant">Menunggu batas refresh berikutnya untuk ringkasan area.</p><p className="text-xs text-on-surface-variant">{AREA_HISTORY_LABEL}</p></div>;
    if (areaState === 'error') return <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />;
    if (!areas.length) return <Empty title="Belum ada area dengan perangkat live" hint="Area terisi akan muncul setelah perangkat memiliki areaRef." icon="water" />;
    return <div className="space-y-4">
      <Card pad="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-on-surface">Ringkasan pembacaan area</h3><p className="mt-1 text-sm text-on-surface-variant">{AREA_HISTORY_LABEL}. Rata-rata ditimbang berdasarkan jumlah sampel.</p></div>
        </div>
        <p className="mt-3 text-xs tabular-nums text-on-surface-variant">Request batch: {areaCounters.started}/{areaCounters.total} · Anggaran jendela 60 detik: {areaCounters.remaining}/{API_SESSION_REQUEST_LIMIT}</p>
      </Card>
      {areaError && <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />}
      {areaRows.length === 0 ? <Empty title="Belum ada data sensor hari ini" hint="Belum ada titik pembacaan pada rentang waktu perangkatmu sejak tengah malam." icon="query_stats" />
        : <div className="overflow-x-auto rounded-2xl border border-outline-variant/50">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-surface-container-high/70 text-left text-xs text-on-surface-variant"><tr><th className="px-3 py-3">Area</th><th className="px-3 py-3">Sensor</th><th className="px-3 py-3">Minimum</th><th className="px-3 py-3">Rata-rata</th><th className="px-3 py-3">Maksimum</th><th className="px-3 py-3">Sampel</th></tr></thead>
            <tbody className="divide-y divide-outline-variant/30">{areaRows.map(row => <tr key={`${row.areaRef}:${row.sensor.code}`}>
              <td className="px-3 py-3 font-semibold text-on-surface">{row.areaRef}</td>
              <td className="px-3 py-3 text-on-surface-variant">{sensorLabel(row.sensor)}{row.sensor.unit ? ` (${row.sensor.unit})` : ''}</td>
              {row.summary ? <>
                <td className="px-3 py-3 tabular-nums text-on-surface">{formatSensorNumber(row.summary.min, row.sensor.decimals ?? 2)}</td>
                <td className="px-3 py-3 tabular-nums font-semibold text-on-surface">{formatSensorNumber(row.summary.avg, row.sensor.decimals ?? 2)}</td>
                <td className="px-3 py-3 tabular-nums text-on-surface">{formatSensorNumber(row.summary.max, row.sensor.decimals ?? 2)}</td>
                <td className="px-3 py-3 tabular-nums text-on-surface-variant">{row.summary.n}</td>
              </> : <td colSpan="4" className="px-3 py-3 text-on-surface-variant">Belum ada data sensor hari ini.</td>}
            </tr>)}</tbody>
          </table>
          <p className="border-t border-outline-variant/40 px-3 py-2 text-xs text-on-surface-variant">Jumlah device/sensor diringkas dari seluruh titik 5 menit yang tersedia.</p>
        </div>}
    </div>;
  }

  if (catalogState === 'disabled') return <Card><SectionTitle title="Monitoring memerlukan mode API" subtitle="Data contoh tidak ditampilkan sebagai telemetry." /></Card>;
  if (catalogState === 'loading') return <Card><p role="status" className="text-sm text-on-surface-variant">Memuat perangkat dan jenis sensor...</p></Card>;
  if (catalogState === 'error') return <ErrorPanel message={catalogError} onRetry={retryCatalog} />;

  return (
    <div className="min-w-0 space-y-4">
      {latestState === 'loading' && <p role="status" className="text-sm text-on-surface-variant">Memuat nilai terbaru...</p>}
      {latestError && <ErrorPanel message={latestError} onRetry={retryLatest} />}
      <Card pad="sm">
        <SectionTitle title="Monitoring" subtitle="Pilih cara membaca kondisi sensor, lalu buka perangkat untuk tindak lanjut." />
        <div role="tablist" aria-label="Tampilan Monitoring" className="flex min-w-0 flex-wrap gap-2">
          {TABS.map(tab => <button
            key={tab.id}
            id={`monitoring-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`monitoring-panel-${tab.id}`}
             tabIndex={activeTab === tab.id ? 0 : -1}
             onClick={() => setActiveTab(tab.id)}
             onKeyDown={event => {
               const nextId = nextTabId(tab.id, event.key);
               if (!nextId) return;
               event.preventDefault();
               setActiveTab(nextId);
               document.getElementById(`monitoring-tab-${nextId}`)?.focus();
             }}
            className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary ${activeTab === tab.id ? 'border-primary bg-primary text-white dark:border-inverse-primary dark:bg-inverse-primary dark:text-background' : 'border-outline-variant/60 bg-surface text-on-surface hover:bg-surface-container'}`}
          >{tab.label}</button>)}
        </div>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]">
        <section role="tabpanel" id={`monitoring-panel-${activeTab}`} aria-labelledby={`monitoring-tab-${activeTab}`} className="min-w-0">
          {activeTab === 'package' && renderPackageTab()}
          {activeTab === 'sensor' && renderSensorTab()}
          {activeTab === 'area' && renderAreaTab()}
        </section>
        <aside className="min-w-0" aria-label="Panel Log kejadian">
          <EventLogPanel
            events={events}
            eventCursor={eventCursor}
            eventDeviceId={eventDeviceId}
            eventType={eventType}
            eventState={eventState === 'idle' ? 'loading' : eventState}
            eventError={eventError}
            loadingMoreEvents={loadingMoreEvents}
            liveDevices={liveDevices}
            sensorTypes={sensorTypes}
            deviceById={deviceById}
            onDeviceChange={changeEventDevice}
            onTypeChange={changeEventType}
            onRetry={retryEvents}
            onLoadMore={() => { void loadEvents({ cursor: eventCursor, append: true }); }}
          />
        </aside>
      </div>
    </div>
  );
}
