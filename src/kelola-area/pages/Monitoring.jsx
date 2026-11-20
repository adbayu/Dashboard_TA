import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, Badge, Button, Card, Checkbox, Empty, Field, PageHeader, Select, StatusPill, Table, Tabs, Tautan } from '../../shared/components/ui';
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
  STATUS_KONEKSI,
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

const EVENT_TYPES = [
  { value: 'online', label: 'Terhubung kembali' },
  { value: 'offline', label: 'Tidak terhubung' },
  { value: 'threshold_low', label: 'Di bawah ambang' },
  { value: 'threshold_high', label: 'Di atas ambang' },
  { value: 'threshold_clear', label: 'Kembali normal' },
];
// Seri pembanding memakai warna area. Di beberapa palet warnanya sama
// (Kebun Air: chart-1 = water-fg; Catatan Lapangan dan Panel Instrumen:
// water-fg = leaf-fg; Tanah & Lumut: ketiganya sama), jadi pola garis adalah
// pembeda utama. Ujung garis `butt`: ujung bulat ditambahkan SVG ke setiap
// ruas putus-putus dan menutup celahnya. Legenda memakai garis yang sama persis.
const COMPARE_STROKE_WIDTH = '2.5';
const COMPARE_SERIES = [
  { stroke: 'stroke-chart-1', dash: undefined },
  { stroke: 'stroke-water-fg', dash: '8 5' },
  { stroke: 'stroke-leaf-fg', dash: '2 4' },
];
const SENSOR_HISTORY_LABEL = '24 jam terakhir';
const EMPTY_DEVICES = [];
const EMPTY_SENSORS = [];
const EMPTY_LATEST = {};
const SANDBOX_ICON = 'flask-conical';

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
    <Card pad="sm" title="Log kejadian" subtitle="Filter kejadian alat dan buka halaman sebelumnya.">
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Field label="Perangkat"><Select value={eventDeviceId} onChange={onDeviceChange} options={devices.map(device => ({ value: device.id, label: `${device.name} · ${device.code}${device.isSandbox || device.is_sandbox ? ' · Sandbox' : ''}` }))} placeholder="Semua perangkat" /></Field>
          <Field label="Jenis kejadian"><Select value={eventType} onChange={onTypeChange} options={EVENT_TYPES} placeholder="Semua kejadian" /></Field>
        </div>
        <p className="text-sm text-text-2">Halaman mengikuti ID kejadian menurun. Waktu memakai nilai `at` dari API.</p>
        {eventState === 'loading' && <p role="status" className="py-2 text-sm text-text-2">Memuat log kejadian...</p>}
        {eventState === 'error' && <ErrorPanel message={eventError} onRetry={onRetry} />}
        {eventState === 'ready' && eventError && <p role="alert" className="text-sm font-semibold text-bad-fg">{eventError}</p>}
        {eventState === 'ready' && events.length === 0 && !eventError && <Empty title="Belum ada kejadian" hint="Kejadian perangkat akan muncul setelah API mencatat perubahan koneksi atau ambang." icon="history" />}
        {eventState === 'ready' && events.length > 0 && <ul className="divide-y divide-border border-b border-border">{events.map(event => <li key={event.id} className="flex min-w-0 flex-col gap-0.5 py-2.5">
          <span className="break-words font-semibold text-text">{formatEventMessage(event, sensorNames)}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 break-all font-mono text-xs text-text-2">{deviceById.get(event.deviceId)?.code || event.deviceId} · ID {event.id}
            {(event.isSandbox || event.is_sandbox || deviceById.get(event.deviceId)?.isSandbox || deviceById.get(event.deviceId)?.is_sandbox) && <Badge tone="info" icon={SANDBOX_ICON}>Sandbox</Badge>}
          </span>
          <time className="text-[13px] leading-[18px] text-text-2" dateTime={event.at}>{dateLabel(event.at)}</time>
        </li>)}</ul>}
        {eventState === 'ready' && eventCursor && <div className="flex justify-center"><Button variant="ghost" icon="chevron-down" disabled={loadingMoreEvents} onClick={onLoadMore}>{loadingMoreEvents ? 'Memuat kejadian...' : 'Muat kejadian sebelumnya'}</Button></div>}
      </div>
    </Card>
  );
}

function DeviceStatus({ status }) {
  const value = STATUS_KONEKSI[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'circle-help' };
  return <Badge tone={value.tone} icon={value.icon}>{value.label}</Badge>;
}

// Satu peringatan dengan aksi Coba lagi. Tombolnya anak langsung Alert supaya
// tes bisa menemukannya lewat props.children.
function ErrorPanel({ message, onRetry }) {
  return (
    <Alert tone="bad">
      <p>{message}</p>
      {onRetry && <Button variant="secondary" size="sm" icon="refresh-cw" className="mt-2" onClick={onRetry}>Coba lagi</Button>}
    </Alert>
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
  if (!summary) return <p className="text-sm text-text-2">Belum ada data untuk {SENSOR_HISTORY_LABEL.toLowerCase()}.</p>;

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
      <figcaption className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-text-2">
        <span>{SENSOR_HISTORY_LABEL}</span>
        <span className="font-num">{accessibleRange}</span>
      </figcaption>
      <svg className="mt-1 h-12 w-full overflow-visible text-chart-1" viewBox="0 0 320 48" preserveAspectRatio="none" role="img" aria-label={`${sensorLabel(sensor)} ${SENSOR_HISTORY_LABEL}. ${accessibleRange}`}>
        <polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
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
      <Card pad="sm" title={device.name} subtitle={`${device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · ${device.areaRef ? `Area: ${device.areaRef}` : 'Area belum diatur'}`}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-all font-mono text-sm text-text">{device.code}</span>
            <span className="text-sm text-text-2">{device.type?.name || device.type?.code}</span>
            <DeviceStatus status={device.status} />
            {(device.isSandbox || device.is_sandbox) && <Badge tone="info" icon={SANDBOX_ICON}>Sandbox</Badge>}
          </span>
          <Tautan to={`/iot/${encodeURIComponent(device.id)}`} className="text-sm">Buka alat</Tautan>
        </div>
        {historyError && <div className="my-2"><ErrorPanel message={historyError} onRetry={retry} /></div>}
        <div className="divide-y divide-border">
          {sensors.map(sensor => {
            const reading = latestReadingFor({ [device.id]: latest }, device.id, sensor.code);
            const history = histories[sensor.code];
            return <div key={sensor.code} className="grid min-w-0 gap-x-6 gap-y-2.5 py-3 md:grid-cols-[minmax(11rem,0.8fr)_minmax(0,1.4fr)] md:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-text">{sensorLabel(sensor)}</p>
                <p className="mt-0.5 break-words">{reading?.value == null
                  ? <span className="text-text-2">Belum ada data</span>
                  : <><span className="font-num text-xl font-semibold leading-[26px] text-text">{formatSensorNumber(reading.value, sensor.decimals ?? 2)}</span>{sensor.unit && <span className="text-text-2"> {sensor.unit}</span>}</>}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  {reading && <SensorStateBadge state={reading.state} />}
                  <span className="break-words text-[13px] leading-[18px] text-text-2">{reading?.threshold
                    ? formatThreshold(reading.threshold, sensor.unit || '', sensor.decimals ?? 2)
                    : 'Ambang efektif belum dimuat'}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-[18px] text-text-2">{formatMeasuredAt(reading?.measuredAt)}</p>
              </div>
              {historyState === 'loading' ? <p role="status" className="text-sm text-text-2">Memuat riwayat sensor...</p>
                : historyState === 'idle' ? <p className="text-sm text-text-2">Riwayat sensor akan dimuat saat perangkat terlihat.</p>
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
    icon="package"
  />;
}

export function PackageTabLoading() {
  return <p role="status" className="py-4 text-sm text-text-2">Memuat nilai terbaru...</p>;
}

export function SensorTabLoading() {
  return <p role="status" className="py-4 text-sm text-text-2">Memuat ringkasan sensor...</p>;
}

export function SensorLatestError({ message, onRetry }) {
  return <ErrorPanel message={message} onRetry={onRetry} />;
}

export function AreaTabLoading({ onReload }) {
  return <div className="space-y-3">
    <div className="flex justify-end"><Button variant="ghost" icon="refresh-cw" onClick={onReload}>Muat ulang</Button></div>
    <p role="status" className="text-sm text-text-2">Memuat ringkasan pembacaan hari ini...</p>
    <p className="text-sm text-text-2">{AREA_HISTORY_LABEL}</p>
  </div>;
}

export function AreaEmptyState({ hasArea }) {
  return hasArea
    ? <Empty title="Belum ada data sensor hari ini" hint="Belum ada titik pembacaan pada rentang waktu perangkatmu sejak tengah malam." icon="chart-line" />
    : <Empty title="Belum ada area dengan perangkat live" hint="Area terisi akan muncul setelah perangkat memiliki areaRef." icon="waves" />;
}

export function SensorDeviceEmpty() {
  return <Empty title="Belum ada perangkat dengan sensor ini" hint="Pilih jenis sensor lain atau periksa perangkat yang sudah terpasang." icon="radio" />;
}

function ComparisonChart({ series, sensor }) {
  const validSeries = series.map(item => ({ ...item, points: item.history?.points || [] }))
    .filter(item => item.points.some(point => Number.isFinite(Number(point.avg))));
  if (!validSeries.length) return <p className="text-sm text-text-2">Pilih perangkat untuk membandingkan riwayat sensor.</p>;

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
    <figure className="min-w-0" aria-label={description}>
      <figcaption className="mb-2 font-semibold text-text">Riwayat {sensorLabel(sensor).toLowerCase()}, {SENSOR_HISTORY_LABEL.toLowerCase()}</figcaption>
      <svg className="h-36 w-full overflow-visible border-b border-border" viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label={description}>
        {validSeries.map((item, seriesIndex) => {
          const points = item.points.filter(point => Number.isFinite(Number(point.avg)));
          const coordinates = points.map((point, index) => {
            const x = points.length < 2 ? 160 : 4 + (index / (points.length - 1)) * 312;
            const y = 112 - ((Number(point.avg) - low) / span) * 104;
            return `${x},${y}`;
          }).join(' ');
          const style = COMPARE_SERIES[seriesIndex];
          return <polyline key={item.device.id} points={coordinates} fill="none" strokeWidth={COMPARE_STROKE_WIDTH} strokeLinecap="butt" strokeLinejoin="round" strokeDasharray={style.dash} vectorEffect="non-scaling-stroke" className={style.stroke} />;
        })}
      </svg>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] leading-[18px] text-text-2">
        {validSeries.map((item, index) => <li key={item.device.id} className="inline-flex min-w-0 items-center gap-2">
          <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" className="shrink-0">
            <line x1="0" y1="4" x2="28" y2="4" strokeWidth={COMPARE_STROKE_WIDTH} strokeLinecap="butt" strokeDasharray={COMPARE_SERIES[index].dash} className={COMPARE_SERIES[index].stroke} />
          </svg>
          <span className="break-words"><b className="font-semibold text-text">{item.device.name}</b>: {summaries[index].replace(`${item.device.name} `, '')}</span>
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

  function sensorFor(item) {
    return deviceSensors(item.device).find(value => value.code === selectedSensor) || selectedSensorType || {};
  }

  function sensorValueText(item) {
    return item.value == null ? 'Belum ada data' : `${formatSensorNumber(item.value, sensorFor(item).decimals ?? 2)}${item.unit ? ` ${item.unit}` : ''}`;
  }

  const alatPerhatian = displayDevices.filter(device => device.status === 'offline' || device.status === 'stale').length;

  function renderSensorTab() {
    if (!sensorOptions.length) return <Empty title="Jenis sensor belum tersedia" hint="Jenis sensor akan muncul setelah tersedia di daftar API." icon="radio" />;
    return <div className="flex flex-col gap-4">
      <div className="max-w-xs"><Field label="Jenis sensor"><Select value={selectedSensor} onChange={value => {
        setSelectedSensorChoice(value);
        setSelectedCompareIds([]);
        setComparisonState('idle');
        setComparisonError('');
        setComparisonHistories({});
      }} options={sensorOptions} /></Field></div>
      {sensorState === 'loading' || sensorState === 'idle' ? <SensorTabLoading />
         : sensorState === 'error' ? <ErrorPanel message={sensorError} onRetry={retryLatest} />
          : <>
            {sensorError && <SensorLatestError message={sensorError} onRetry={retryLatest} />}
            {currentSensorItems.length === 0 ? <SensorDeviceEmpty /> : (
              <Card pad="sm" title={selectedSensorType?.name || selectedSensor} subtitle="Alat satuan dan paket ditampilkan bersama. Nilai, ambang, dan waktu berasal dari API.">
                <div className="hidden min-w-0 sm:block">
                  <Table
                    columns={[
                      { key: 'device', label: 'Perangkat', render: item => <>
                        <Tautan to={`/iot/${encodeURIComponent(item.deviceId)}`} className="break-words">{item.device?.name || item.deviceCode}</Tautan>
                        {(item.device?.isSandbox || item.device?.is_sandbox) && <span className="ml-2 inline-flex align-middle"><Badge tone="info" icon={SANDBOX_ICON}>Sandbox</Badge></span>}
                        <span className="mt-1 block break-all font-mono text-xs text-text-2">{item.deviceCode} · {item.device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {item.device?.type?.name || item.device?.type?.code}</span>
                      </> },
                      { key: 'area', label: 'Area', render: item => <span className="break-words text-text-2 [overflow-wrap:anywhere]">{item.areaRef || 'Area belum diatur'}</span> },
                      { key: 'value', label: 'Nilai', render: item => <>
                        <span className="block font-num font-semibold tabular-nums text-text">{sensorValueText(item)}</span>
                        <span className="mt-1 inline-flex"><SensorStateBadge state={item.state} /></span>
                      </> },
                      { key: 'threshold', label: 'Ambang', render: item => <span className="text-sm text-text-2">{formatThreshold(item.threshold, item.unit || '', sensorFor(item).decimals ?? 2)}</span> },
                      { key: 'measuredAt', label: 'Waktu ukur', render: item => <time className="text-sm text-text-2" dateTime={item.measuredAt || undefined}>{dateLabel(item.measuredAt)}</time> },
                    ]}
                    rows={currentSensorItems.map(item => ({ ...item, id: item.deviceId }))}
                  />
                </div>
                <ul aria-label={`Daftar perangkat dengan sensor ${selectedSensorType?.name || selectedSensor}`} className="divide-y divide-border sm:hidden">{currentSensorItems.map(item => {
                  const sensor = sensorFor(item);
                  return <li key={item.deviceId} className="min-w-0 py-3 [overflow-wrap:anywhere]">
                    <div className="min-w-0">
                      <Tautan to={`/iot/${encodeURIComponent(item.deviceId)}`} className="break-words">{item.device?.name || item.deviceCode}</Tautan>
                      {(item.device?.isSandbox || item.device?.is_sandbox) && <span className="ml-2 inline-flex align-middle"><Badge tone="info" icon={SANDBOX_ICON}>Sandbox</Badge></span>}
                      <p className="mt-1 break-all font-mono text-xs text-text-2">{item.deviceCode} · {item.device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {item.device?.type?.name || item.device?.type?.code}</p>
                    </div>
                    <dl className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 text-sm">
                      <div><dt className="text-text-2">Area</dt><dd className="break-words text-text">{item.areaRef || 'Area belum diatur'}</dd></div>
                      <div><dt className="text-text-2">Nilai</dt><dd className="break-words font-num font-semibold tabular-nums text-text">{sensorValueText(item)}</dd><dd className="mt-1"><SensorStateBadge state={item.state} /></dd></div>
                      <div><dt className="text-text-2">Ambang</dt><dd className="break-words text-text-2">{formatThreshold(item.threshold, item.unit || '', sensor.decimals ?? 2)}</dd></div>
                      <div><dt className="text-text-2">Waktu ukur</dt><dd className="break-words text-text-2"><time dateTime={item.measuredAt || undefined}>{dateLabel(item.measuredAt)}</time></dd></div>
                    </dl>
                  </li>;
                })}</ul>
              </Card>
            )}
            {currentSensorItems.length > 0 && <Card
              pad="sm"
              title="Bandingkan riwayat"
              subtitle="Pilih sampai tiga perangkat. Riwayat memakai pembacaan lima menit dalam 24 jam terakhir."
              action={<span className="font-num text-sm tabular-nums text-text-2">{selectedCompareIds.length}/3 dipilih</span>}
            >
              <fieldset className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                <legend className="sr-only">Perangkat untuk dibandingkan</legend>
                {currentSensorItems.map(item => <Checkbox
                  key={item.deviceId}
                  className="min-h-11 min-w-0 items-center py-1.5"
                  checked={selectedCompareIds.includes(item.deviceId)}
                  disabled={!selectedCompareIds.includes(item.deviceId) && selectedCompareIds.length >= 3}
                  onChange={() => toggleComparison(item.deviceId)}
                  label={<span className="min-w-0"><span className="block truncate font-semibold">{item.device?.name || item.deviceCode}</span><span className="block truncate font-mono text-xs text-text-2">{item.deviceCode}</span></span>}
                />)}
              </fieldset>
              {selectedCompareIds.length > 0 && comparisonState === 'loading' && <p role="status" className="mt-3 text-sm text-text-2">Memuat riwayat perbandingan...</p>}
              {selectedCompareIds.length > 0 && comparisonError && <Alert tone="bad" className="mt-3" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retryComparison}>Coba lagi</Button>}>{comparisonError}</Alert>}
              {selectedCompareIds.length > 0 && comparisonState === 'error' && !comparisonError && <Alert tone="bad" className="mt-3" action={<Button variant="secondary" size="sm" icon="refresh-cw" onClick={retryComparison}>Coba lagi</Button>}>Riwayat perbandingan tidak dapat dimuat.</Alert>}
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
    const reloadAction = <div className="flex justify-end"><Button variant="ghost" icon="refresh-cw" onClick={() => areaRefreshActionRef.current?.()}>Muat ulang</Button></div>;
    if (areaState === 'loading' || areaState === 'idle') return <AreaTabLoading onReload={() => areaRefreshActionRef.current?.()} />;
    if (areaState === 'waiting') return <div className="space-y-3">{reloadAction}<p role="status" className="text-sm text-text-2">Menunggu permintaan ringkasan area sebelumnya selesai.</p><p className="text-sm text-text-2">{AREA_HISTORY_LABEL}</p></div>;
    if (areaState === 'error') return <div className="space-y-3">{reloadAction}<ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} /></div>;
    if (!areas.length) return <div className="space-y-3">{reloadAction}<AreaEmptyState hasArea={false} /></div>;
    return <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-2">Ringkasan pembacaan area. {AREA_HISTORY_LABEL}. Rata-rata ditimbang berdasarkan jumlah sampel. <span className="font-num tabular-nums">Request area: {areaCounters.started}/{areaCounters.total}</span></p>
        {reloadAction}
      </div>
      {areaError && <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />}
      {areaRows.length === 0 ? <AreaEmptyState hasArea />
        : <>
          <Table
            caption="Ringkasan pembacaan per area"
            columns={[
              { key: 'areaRef', label: 'Area', render: row => <span className="font-semibold">{row.areaRef}</span> },
              { key: 'sensor', label: 'Sensor', render: row => <span className="text-text-2">{sensorLabel(row.sensor)}{row.sensor.unit ? ` (${row.sensor.unit})` : ''}</span> },
              { key: 'min', label: 'Minimum', align: 'end', num: true, render: row => row.summary ? formatSensorNumber(row.summary.min, row.sensor.decimals ?? 2) : <span className="font-body text-text-2">Belum ada data sensor hari ini.</span> },
              { key: 'avg', label: 'Rata-rata', align: 'end', num: true, render: row => row.summary ? <b className="font-semibold">{formatSensorNumber(row.summary.avg, row.sensor.decimals ?? 2)}</b> : '' },
              { key: 'max', label: 'Maksimum', align: 'end', num: true, render: row => row.summary ? formatSensorNumber(row.summary.max, row.sensor.decimals ?? 2) : '' },
              { key: 'n', label: 'Sampel', align: 'end', num: true, render: row => row.summary ? <span className="text-text-2">{row.summary.n}</span> : '' },
            ]}
            rows={areaRows.map(row => ({ ...row, id: `${row.areaRef}:${row.sensor.code}` }))}
          />
          <p className="text-sm text-text-2">Jumlah device/sensor diringkas dari seluruh titik 5 menit yang tersedia.</p>
        </>}
    </div>;
  }

  const pageHeader = <PageHeader
    title="Monitoring"
    subtitle="Pilih cara membaca kondisi sensor, lalu buka alat untuk tindak lanjut."
    actions={alatPerhatian > 0 && <StatusPill tone="warn" icon="triangle-alert" solid>{alatPerhatian} alat perlu perhatian</StatusPill>}
  />;

  if (catalogState === 'disabled') return <div className="iot-touch-targets min-w-0">{pageHeader}<Alert tone="info" title="Monitoring memerlukan mode API.">Data contoh tidak ditampilkan sebagai telemetry.</Alert></div>;
  if (catalogState === 'loading') return <div className="iot-touch-targets min-w-0">{pageHeader}<Card><p role="status" className="text-sm text-text-2">Memuat perangkat dan jenis sensor...</p></Card></div>;
  if (catalogState === 'error') return <div className="iot-touch-targets min-w-0">{pageHeader}<ErrorPanel message={catalogError} onRetry={retryCatalog} /></div>;

  return (
    <div className="iot-touch-targets min-w-0">
      {pageHeader}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} label="Tampilan Monitoring">
            {activeTab === 'package' && renderPackageTab()}
            {activeTab === 'sensor' && renderSensorTab()}
            {activeTab === 'area' && renderAreaTab()}
          </Tabs>
        </div>
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
