import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { Badge, Button, Card, Empty, Field, SectionTitle, Select } from '../../shared/components/ui';
import { IOT_SOURCE, iotApi } from '../../services/iotApi.js';
import { iotMonitoringStore } from '../../services/iotMonitoringStore.js';
import SensorStateBadge from '../../components/iot/SensorStateBadge.jsx';
import {
  createBoundedBatchRunner,
  getLocalDayRange,
  mergeEventPages,
  summarizeAreaPoints,
  AREA_HISTORY_LABEL,
  AREA_HISTORY_REFRESH_MS,
} from '../../utils/monitoring.js';
import {
  formatEventMessage,
  formatMeasuredAt,
  formatSensorNumber,
  formatThreshold,
} from '../../utils/iotPresentation.js';

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
const EMPTY_DEVICES = [];
const EMPTY_SENSORS = [];
const EMPTY_LATEST = {};

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
  devices,
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
        <Field label="Perangkat"><Select value={eventDeviceId} onChange={onDeviceChange} options={devices.map(device => ({ value: device.id, label: `${device.name} · ${device.code}${device.isSandbox || device.is_sandbox ? ' · Sandbox' : ''}` }))} placeholder="Semua perangkat" /></Field>
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
          <p className="mt-1 flex flex-wrap items-center gap-2 break-all font-mono text-xs text-on-surface-variant">{deviceById.get(event.deviceId)?.code || event.deviceId} · ID {event.id}
            {(event.isSandbox || event.is_sandbox || deviceById.get(event.deviceId)?.isSandbox || deviceById.get(event.deviceId)?.is_sandbox) && <Badge tone="info">Sandbox</Badge>}
          </p>
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

function PackageDeviceCard({ device, latest }) {
  const [visible, setVisible] = useState(false);
  const [historyState, setHistoryState] = useState('idle');
  const [historyError, setHistoryError] = useState('');
  const [histories, setHistories] = useState({});
  const [attempt, setAttempt] = useState(0);
  const cardRef = useRef(null);
  const completed = useRef(false);
  const sensors = deviceSensors(device);
  const sensorKey = JSON.stringify(sensors.map(sensor => sensor.code));

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sensorCodes = JSON.parse(sensorKey);
    if (!visible || !sensorCodes.length || completed.current) return undefined;
    const controller = new AbortController();
    const range = dateRange24h();
    setHistoryState('loading');
    setHistoryError('');
    Promise.allSettled(sensorCodes.map(sensor => iotApi.getDeviceReadings(device.id, {
      sensor,
      ...range,
      bucket: '5m',
      signal: controller.signal,
      priority: attempt ? 'user' : 'history',
    }))).then(results => {
      if (controller.signal.aborted) return;
      completed.current = true;
      const nextHistories = Object.fromEntries(results.flatMap((result, index) => result.status === 'fulfilled'
        ? [[sensorCodes[index], result.value]]
        : []));
      const failures = results.filter(result => result.status === 'rejected');
      setHistories(nextHistories);
      setHistoryError(failures.length
        ? `${failures.length} dari ${sensorCodes.length} riwayat sensor gagal dimuat. ${failures[0].reason?.message || ''}`.trim()
        : '');
      setHistoryState(failures.length && !Object.keys(nextHistories).length ? 'error' : 'ready');
    });
    return () => controller.abort();
  }, [attempt, device.id, sensorKey, visible]);

  const retry = () => {
    completed.current = false;
    setHistoryState('loading');
    setAttempt(value => value + 1);
  };

  return (
    <div ref={cardRef}>
      <Card pad="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-on-surface">{device.name}</h3>
            {(device.isSandbox || device.is_sandbox) && <Badge tone="info">Sandbox</Badge>}
            <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{device.code} · {device.type?.name || device.type?.code}</p>
            {device.areaRef && <p className="mt-1 text-xs text-on-surface-variant">Area: {device.areaRef}</p>}
          </div>
          <div className="flex flex-wrap gap-2"><DeviceStatus status={device.status} /><Link to={`/iot/${encodeURIComponent(device.id)}`} className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-inverse-primary">Buka perangkat</Link></div>
        </div>
        {historyError && <p role="alert" className="mt-3 text-sm text-red-800 dark:text-red-200">{historyError}</p>}
        {historyError && <div className="mt-2 flex justify-end"><Button variant="ghost" icon="refresh" onClick={retry}>Coba lagi</Button></div>}
        <div className="mt-4 divide-y divide-outline-variant/30">
          {sensors.map(sensor => {
            const reading = latestReadingFor({ [device.id]: latest }, device.id, sensor.code);
            const history = histories[sensor.code];
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
                <p className="mt-1 text-xs text-on-surface-variant">{formatMeasuredAt(reading?.measuredAt)}</p>
              </div>
              {historyState === 'loading' ? <p role="status" className="text-xs text-on-surface-variant">Memuat riwayat sensor...</p>
                : historyState === 'idle' ? <p className="text-xs text-on-surface-variant">Riwayat sensor akan dimuat saat perangkat terlihat.</p>
                  : <Sparkline sensor={sensor} history={history} />}
            </div>;
          })}
        </div>
      </Card>
    </div>
  );
}

export function PackageTabEmpty({ hasPackageDevices }) {
  return <Empty
    title={hasPackageDevices ? 'Sensor paket belum tersedia' : 'Belum ada perangkat paket live'}
    hint={hasPackageDevices ? 'Sensor paket akan muncul setelah tersedia pada daftar API.' : 'Perangkat paket yang terpasang akan muncul di sini.'}
    icon="deployed_code"
  />;
}

export function PackageTabLoading() {
  return <p role="status" className="py-4 text-sm text-on-surface-variant">Memuat nilai terbaru...</p>;
}

export function SensorTabLoading() {
  return <p role="status" className="py-4 text-sm text-on-surface-variant">Memuat ringkasan sensor...</p>;
}

export function SensorLatestError({ message, onRetry }) {
  return <ErrorPanel message={message} onRetry={onRetry} />;
}

export function AreaTabLoading({ onReload }) {
  return <div className="space-y-3">
    <div className="flex justify-end"><Button variant="ghost" icon="refresh" onClick={onReload}>Muat ulang</Button></div>
    <p role="status" className="text-sm text-on-surface-variant">Memuat ringkasan pembacaan hari ini...</p>
    <p className="text-xs text-on-surface-variant">{AREA_HISTORY_LABEL}</p>
  </div>;
}

export function AreaEmptyState({ hasArea }) {
  return hasArea
    ? <Empty title="Belum ada data sensor hari ini" hint="Belum ada titik pembacaan pada rentang waktu perangkatmu sejak tengah malam." icon="query_stats" />
    : <Empty title="Belum ada area dengan perangkat live" hint="Area terisi akan muncul setelah perangkat memiliki areaRef." icon="water" />;
}

export function SensorDeviceEmpty() {
  return <Empty title="Belum ada perangkat dengan sensor ini" hint="Pilih jenis sensor lain atau periksa perangkat yang sudah terpasang." icon="sensors" />;
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
  return <MonitoringView key={String(currentUser?.id ?? 'anonymous')} currentUser={currentUser} />;
}

function MonitoringView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('package');
  const [selectedSensorChoice, setSelectedSensorChoice] = useState('');
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
  const [areaCounters, setAreaCounters] = useState({ started: 0, total: 0 });

  const areaRefreshActionRef = useRef(null);
  const streamEventCursor = useRef({ userId: null, sequence: 0 });
  const comparisonRunner = useRef(createBoundedBatchRunner({ concurrency: 3, maxRequests: 3 }));
  const areaRunner = useMemo(() => createBoundedBatchRunner({ concurrency: 4, maxRequests: Number.MAX_SAFE_INTEGER }), []);
  const areaController = useRef(null);

  const monitoringSnapshot = useSyncExternalStore(iotMonitoringStore.subscribe, iotMonitoringStore.getSnapshot, iotMonitoringStore.getSnapshot);
  const hasSessionSnapshot = currentUser?.id !== null && currentUser?.id !== undefined
    && monitoringSnapshot.userId === String(currentUser.id);
  const devices = hasSessionSnapshot ? monitoringSnapshot.devices : EMPTY_DEVICES;
  const sensorTypes = hasSessionSnapshot ? monitoringSnapshot.sensorTypes : EMPTY_SENSORS;
  const latestByDevice = hasSessionSnapshot ? monitoringSnapshot.latestByDevice : EMPTY_LATEST;
  const latestState = hasSessionSnapshot ? monitoringSnapshot.latestState : 'loading';
  const latestError = hasSessionSnapshot ? monitoringSnapshot.latestError : '';
  const catalogState = IOT_SOURCE !== 'api' ? 'disabled'
    : hasSessionSnapshot ? monitoringSnapshot.catalogState : 'loading';
  const catalogError = hasSessionSnapshot ? monitoringSnapshot.catalogError : '';
  const displayDevices = devices;
  const liveDevices = useMemo(() => displayDevices.filter(device => !device.isSandbox && !device.is_sandbox), [displayDevices]);
  const packageDevices = useMemo(() => displayDevices.filter(device => device.type?.kind === 'paket'), [displayDevices]);
  const deviceById = useMemo(() => new Map(displayDevices.map(device => [device.id, device])), [displayDevices]);
  const sensorOptions = useMemo(() => sensorTypes.map(sensor => ({ value: sensor.code, label: `${sensor.name || sensor.code}${sensor.unit ? ` (${sensor.unit})` : ''}` })), [sensorTypes]);
  const selectedSensor = sensorTypes.some(sensor => sensor.code === selectedSensorChoice)
    ? selectedSensorChoice
    : sensorTypes[0]?.code || '';
  const selectedSensorType = sensorTypes.find(sensor => sensor.code === selectedSensor) || null;
  const sensorState = !selectedSensor ? 'ready' : latestState;
  const sensorError = latestError;
  const sensorItems = (hasSessionSnapshot ? monitoringSnapshot.overviewBySensor?.[selectedSensor]?.items : null) || EMPTY_DEVICES;
  const currentSensorItems = sensorItems
    .filter(item => deviceById.has(item.deviceId))
    .map(item => ({ ...item, device: deviceById.get(item.deviceId) }))
    .map(item => {
      const latest = latestReadingFor(latestByDevice, item.deviceId, selectedSensor);
      return latest ? { ...item, value: latest.value, state: latest.state, threshold: latest.threshold, measuredAt: latest.measuredAt } : item;
    })
    .sort((left, right) => Number(right.state === 'low' || right.state === 'high') - Number(left.state === 'low' || left.state === 'high')
      || String(left.device?.code || '').localeCompare(String(right.device?.code || ''), 'id'));

  useEffect(() => {
    if (IOT_SOURCE !== 'api') return undefined;
    return iotMonitoringStore.connect(currentUser?.id);
  }, [currentUser?.id]);

  const retryLatest = useCallback(() => {
    void iotMonitoringStore.refreshLatest({ priority: 'user' });
  }, []);

  useEffect(() => {
    if (!hasSessionSnapshot || !monitoringSnapshot.deviceEvents.length) return;
    const userId = String(currentUser?.id);
    if (streamEventCursor.current.userId !== userId) streamEventCursor.current = { userId, sequence: 0 };
    const unseen = monitoringSnapshot.deviceEvents.filter(item => item.sequence > streamEventCursor.current.sequence);
    if (!unseen.length) return;
    streamEventCursor.current.sequence = unseen.at(-1).sequence;
    const values = unseen.map(item => item.event).filter(event =>
      (!eventDeviceId || event.deviceId === eventDeviceId) && (!eventType || event.type === eventType));
    if (values.length) setEvents(current => mergeEventPages(current, values));
  }, [currentUser?.id, eventDeviceId, eventType, hasSessionSnapshot, monitoringSnapshot.deviceEvents]);

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
      priority: 'user',
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
        priority: append || eventAttempt ? 'user' : 'latest',
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
  }, [eventAttempt, eventDeviceId, eventType]);

  useEffect(() => {
    if (catalogState !== 'ready') return undefined;
    let active = true;
    const controller = new AbortController();
    iotApi.getEvents({
      deviceId: eventDeviceId || undefined,
      type: eventType || undefined,
      limit: 50,
      signal: controller.signal,
      priority: eventAttempt ? 'user' : 'latest',
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

  const refreshArea = useCallback(async ({ signal, active = () => true, priority = 'area' } = {}) => {
    const range = getLocalDayRange();
    const sensors = liveDevices.flatMap(device => deviceSensors(device)
      .filter(_sensor => device.areaRef?.trim())
      .map(sensor => ({ device, sensor })));
    if (!sensors.length) {
      setAreaRows([]);
      setAreaState('ready');
      setAreaError('');
      setAreaCounters({ started: 0, total: 0 });
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
      priority,
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
      setAreaCounters({ started: batch.counters.started, total: batch.counters.total });
    } catch (error) {
      if (signal?.aborted || !active()) return;
      setAreaState('error');
      setAreaError(error.message || 'Riwayat area tidak dapat dimuat.');
      setAreaCounters({ started: 0, total: tasks.length });
    }
  }, [areaRunner, liveDevices]);

  useEffect(() => {
    if (catalogState !== 'ready' || activeTab !== 'area') return undefined;
    let active = true;
    let interval = null;
    const refresh = (priority = 'area') => {
      if (!active || document.visibilityState !== 'visible') return;
      if (areaRunner.isRunning()) {
        setAreaState('waiting');
        setAreaError('');
        return;
      }
      const controller = new AbortController();
      areaController.current = controller;
      void refreshArea({ signal: controller.signal, active: () => active, priority }).finally(() => {
        if (areaController.current === controller) areaController.current = null;
      });
    };
    areaRefreshActionRef.current = () => refresh('user');
    const stopWhenHidden = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        if (interval === null) interval = setInterval(refresh, AREA_HISTORY_REFRESH_MS);
      } else {
        if (interval !== null) clearInterval(interval);
        interval = null;
        areaController.current?.abort();
        areaController.current = null;
      }
    };
    stopWhenHidden();
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      active = false;
      if (interval !== null) clearInterval(interval);
      areaController.current?.abort();
      areaController.current = null;
      areaRefreshActionRef.current = null;
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [activeTab, areaRunner, catalogState, refreshArea]);

  const retryCatalog = () => {
    void iotMonitoringStore.reloadCatalog(currentUser?.id);
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
    setEventAttempt(attempt => attempt + 1);
    setEventDeviceId(value);
  }

  function changeEventType(value) {
    resetEventQuery();
    setEventAttempt(attempt => attempt + 1);
    setEventType(value);
  }

  function retryComparison() {
    if (comparisonRunner.current.isRunning()) return;
    setComparisonError('');
    setComparisonState('loading');
    setComparisonAttempt(value => value + 1);
  }

  function toggleComparison(deviceId) {
    const next = selectedCompareIds.includes(deviceId)
      ? selectedCompareIds.filter(id => id !== deviceId)
      : selectedCompareIds.length >= 3 ? selectedCompareIds : [...selectedCompareIds, deviceId];
    setSelectedCompareIds(next);
    setComparisonState(next.length ? 'loading' : 'idle');
    setComparisonError('');
  }

  function renderPackageTab() {
    if (!packageDevices.some(device => deviceSensors(device).length)) return <PackageTabEmpty hasPackageDevices={packageDevices.length > 0} />;
    if (latestState === 'loading') return <PackageTabLoading />;
    if (latestError) return <ErrorPanel message={latestError} onRetry={retryLatest} />;
    return <div className="space-y-4">{packageDevices.map(device => <PackageDeviceCard
      key={`${currentUser?.id}:${device.id}`}
      device={device}
      latest={latestByDevice[device.id]}
    />)}</div>;
  }

  function renderSensorTab() {
    if (!sensorOptions.length) return <Empty title="Jenis sensor belum tersedia" hint="Jenis sensor akan muncul setelah tersedia di daftar API." icon="sensors" />;
    return <div className="space-y-4">
      <Card pad="sm"><Field label="Jenis sensor"><Select value={selectedSensor} onChange={value => {
        setSelectedSensorChoice(value);
        setSelectedCompareIds([]);
        setComparisonState('idle');
        setComparisonError('');
        setComparisonHistories({});
      }} options={sensorOptions} /></Field></Card>
      {sensorState === 'loading' || sensorState === 'idle' ? <SensorTabLoading />
         : sensorState === 'error' ? <ErrorPanel message={sensorError} onRetry={retryLatest} />
          : <>
            {sensorError && <SensorLatestError message={sensorError} onRetry={retryLatest} />}
            {currentSensorItems.length === 0 ? <SensorDeviceEmpty /> : (
              <Card pad="sm">
                <SectionTitle title={selectedSensorType?.name || selectedSensor} subtitle="Perangkat satuan dan paket ditampilkan bersama. Nilai ambang dan waktu berasal dari API." />
                <div className="hidden min-w-0 overflow-hidden rounded-xl border border-outline-variant/40 sm:block">
                  <table className="w-full min-w-0 table-fixed text-sm">
                    <colgroup><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[30%]" /><col className="w-[14%]" /><col className="w-[18%]" /></colgroup>
                    <thead className="bg-surface-container-high/70 text-left text-xs text-on-surface-variant"><tr>
                      <th className="break-words px-3 py-2.5">Perangkat</th><th className="break-words px-3 py-2.5">Area</th><th className="break-words px-3 py-2.5">Nilai</th><th className="break-words px-3 py-2.5">Ambang</th><th className="break-words px-3 py-2.5">Waktu ukur</th>
                    </tr></thead>
                    <tbody className="divide-y divide-outline-variant/30">{currentSensorItems.map(item => {
                      const sensor = deviceSensors(item.device).find(value => value.code === selectedSensor) || selectedSensorType || {};
                      return <tr key={item.deviceId}>
                        <td className="break-words px-3 py-3 [overflow-wrap:anywhere]">
                          <Link to={`/iot/${encodeURIComponent(item.deviceId)}`} className="break-words font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-inverse-primary">{item.device?.name || item.deviceCode}</Link>
                          {(item.device?.isSandbox || item.device?.is_sandbox) && <Badge tone="info">Sandbox</Badge>}
                          <span className="mt-1 block break-all font-mono text-[11px] text-on-surface-variant">{item.deviceCode} · {item.device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {item.device?.type?.name || item.device?.type?.code}</span>
                        </td>
                        <td className="break-words px-3 py-3 text-on-surface-variant [overflow-wrap:anywhere]">{item.areaRef || 'Area belum diatur'}</td>
                        <td className="px-3 py-3 [overflow-wrap:anywhere]">
                          <span className="block font-bold tabular-nums text-on-surface">{item.value == null ? 'Belum ada data' : `${formatSensorNumber(item.value, sensor.decimals ?? 2)}${item.unit ? ` ${item.unit}` : ''}`}</span>
                          <span className="mt-1 inline-flex"><SensorStateBadge state={item.state} /></span>
                        </td>
                        <td className="break-words px-3 py-3 text-xs text-on-surface-variant [overflow-wrap:anywhere]">{formatThreshold(item.threshold, item.unit || '', sensor.decimals ?? 2)}</td>
                        <td className="break-words px-3 py-3 text-xs text-on-surface-variant [overflow-wrap:anywhere]"><time dateTime={item.measuredAt || undefined}>{dateLabel(item.measuredAt)}</time></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
                <ul aria-label={`Daftar perangkat dengan sensor ${selectedSensorType?.name || selectedSensor}`} className="space-y-3 sm:hidden">{currentSensorItems.map(item => {
                  const sensor = deviceSensors(item.device).find(value => value.code === selectedSensor) || selectedSensorType || {};
                  return <Card as="li" key={item.deviceId} pad="sm" className="[overflow-wrap:anywhere]">
                    <div className="min-w-0">
                      <Link to={`/iot/${encodeURIComponent(item.deviceId)}`} className="break-words font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-inverse-primary">{item.device?.name || item.deviceCode}</Link>
                      {(item.device?.isSandbox || item.device?.is_sandbox) && <span className="ml-2 inline-flex align-middle"><Badge tone="info">Sandbox</Badge></span>}
                      <p className="mt-1 break-all font-mono text-xs text-on-surface-variant">{item.deviceCode} · {item.device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {item.device?.type?.name || item.device?.type?.code}</p>
                    </div>
                    <dl className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 text-sm">
                      <div><dt className="text-xs text-on-surface-variant">Area</dt><dd className="break-words text-on-surface [overflow-wrap:anywhere]">{item.areaRef || 'Area belum diatur'}</dd></div>
                      <div><dt className="text-xs text-on-surface-variant">Nilai</dt><dd className="break-words font-bold tabular-nums text-on-surface">{item.value == null ? 'Belum ada data' : `${formatSensorNumber(item.value, sensor.decimals ?? 2)}${item.unit ? ` ${item.unit}` : ''}`}</dd><dd className="mt-1"><SensorStateBadge state={item.state} /></dd></div>
                      <div><dt className="text-xs text-on-surface-variant">Ambang</dt><dd className="break-words text-on-surface-variant [overflow-wrap:anywhere]">{formatThreshold(item.threshold, item.unit || '', sensor.decimals ?? 2)}</dd></div>
                      <div><dt className="text-xs text-on-surface-variant">Waktu ukur</dt><dd className="break-words text-on-surface-variant [overflow-wrap:anywhere]"><time dateTime={item.measuredAt || undefined}>{dateLabel(item.measuredAt)}</time></dd></div>
                    </dl>
                  </Card>;
                })}</ul>
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
    const reloadAction = <div className="flex justify-end"><Button variant="ghost" icon="refresh" onClick={() => areaRefreshActionRef.current?.()}>Muat ulang</Button></div>;
    if (areaState === 'loading' || areaState === 'idle') return <AreaTabLoading onReload={() => areaRefreshActionRef.current?.()} />;
    if (areaState === 'waiting') return <div className="space-y-3">{reloadAction}<p role="status" className="text-sm text-on-surface-variant">Menunggu permintaan ringkasan area sebelumnya selesai.</p><p className="text-xs text-on-surface-variant">{AREA_HISTORY_LABEL}</p></div>;
    if (areaState === 'error') return <div className="space-y-3">{reloadAction}<ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} /></div>;
    if (!areas.length) return <div className="space-y-3">{reloadAction}<AreaEmptyState hasArea={false} /></div>;
    return <div className="space-y-4">
      {reloadAction}
      <Card pad="sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-on-surface">Ringkasan pembacaan area</h3><p className="mt-1 text-sm text-on-surface-variant">{AREA_HISTORY_LABEL}. Rata-rata ditimbang berdasarkan jumlah sampel.</p></div>
        </div>
        <p className="mt-3 text-xs tabular-nums text-on-surface-variant">Request area: {areaCounters.started}/{areaCounters.total}</p>
      </Card>
      {areaError && <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />}
      {areaRows.length === 0 ? <AreaEmptyState hasArea />
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
    <div className="iot-touch-targets min-w-0 space-y-4">
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
            devices={displayDevices}
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
