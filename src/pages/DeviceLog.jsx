import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Field, Input, Select } from '../components/ui.jsx';
import LiveIndicator from '../components/iot/LiveIndicator.jsx';
import LogTable from '../components/iot/LogTable.jsx';
import { iotApi } from '../services/iotApi.js';
import { iotStreamClient } from '../services/iotStream.js';
import {
  getExportButtonState,
  getTimeZoneInfo,
  loadedRowsAnnouncement,
  localDateTimeToUtc,
  parseLogQuery,
  rangeForQuickFilter,
  serializeLogQuery,
  utcToLocalDateTime,
  validateLogRange,
} from '../utils/deviceLog.js';

const RANGE_OPTIONS = [
  { value: '1h', label: '1 jam' },
  { value: '24h', label: '24 jam' },
  { value: '7d', label: '7 hari' },
  { value: '31d', label: '31 hari' },
];
const READING_STATES = { normal: 'Normal', low: 'Di bawah ambang', high: 'Di atas ambang', unknown: 'Tanpa ambang' };
const DEVICE_STATUS = {
  online: { label: 'Terhubung', tone: 'ok', icon: 'wifi' },
  stale: { label: 'Data tertunda', tone: 'warn', icon: 'schedule' },
  offline: { label: 'Tidak terhubung', tone: 'bad', icon: 'wifi_off' },
};

function createDraft(filters, zone, search) {
  const range = filters.range === 'custom' ? { from: filters.from, to: filters.to } : rangeForQuickFilter(filters.range);
  return {
    search,
    range: filters.range,
    from: utcToLocalDateTime(range?.from, zone.iana),
    to: utcToLocalDateTime(range?.to, zone.iana),
    sensor: filters.sensor,
    error: '',
  };
}

function formatRangeTime(value) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23' }).format(timestamp);
}

function uniquePoints(points) {
  const seen = new Set();
  return points.filter(point => {
    if (!point?.messageId || seen.has(point.messageId)) return false;
    seen.add(point.messageId);
    return true;
  });
}

function readingStates(point) {
  return new Map((point?.readings || []).map(reading => [reading.sensor, reading.state || 'unknown']));
}

function ConnectionBadge({ status }) {
  const info = DEVICE_STATUS[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'help' };
  return <Badge tone={info.tone} icon={info.icon}>{info.label}</Badge>;
}

function ErrorMessage({ message, retry }) {
  return (
    <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
      <span className="min-w-0 break-words">{message}</span>
      {retry && <Button variant="ghost" size="sm" icon="refresh" onClick={retry}>Coba lagi</Button>}
    </div>
  );
}

function DeviceLogBackLink({ id }) {
  return (
    <Link
      to={`/iot/${encodeURIComponent(id)}`}
      className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-lg text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface dark:text-inverse-primary dark:focus-visible:ring-inverse-primary"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
      Kembali ke detail device
    </Link>
  );
}

export function DeviceLogState({ id, loading = false, error = '', retry }) {
  if (!loading && !error) return null;

  return (
    <div className="iot-touch-targets min-w-0 space-y-5">
      <DeviceLogBackLink id={id} />
      <Card>
        {loading
          ? <p className="text-sm text-on-surface-variant" role="status">Memuat log...</p>
          : <ErrorMessage message={error} retry={retry} />}
      </Card>
    </div>
  );
}

export default function DeviceLog() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const filters = useMemo(() => parseLogQuery(locationSearch), [locationSearch]);
  const zone = useMemo(() => getTimeZoneInfo(), []);
  const appliedRange = useMemo(() => filters.range === 'custom'
    ? { from: filters.from, to: filters.to }
    : rangeForQuickFilter(filters.range), [filters]);
  const appliedError = validateLogRange(appliedRange?.from, appliedRange?.to);
  const appliedKey = `${id}|${locationSearch}`;

  const [draftState, setDraftState] = useState(() => createDraft(filters, zone, locationSearch));
  const draft = draftState.search === locationSearch ? draftState : createDraft(filters, zone, locationSearch);

  const [loadedKey, setLoadedKey] = useState('');
  const loading = loadedKey !== appliedKey;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [device, setDevice] = useState(null);
  const [source, setSource] = useState('api');
  const deviceRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [total, setTotal] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadedRange, setLoadedRange] = useState(appliedRange);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [pageAnnouncement, setPageAnnouncement] = useState('');
  const [thresholdAnnouncement, setThresholdAnnouncement] = useState('');
  const [liveError, setLiveError] = useState('');
  const [liveErrorKind, setLiveErrorKind] = useState('');
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [exportStatus, setExportStatus] = useState(() => ({ key: appliedKey, status: 'ready' }));

  const pointsRef = useRef([]);
  const pageOneRef = useRef(true);
  const thresholdStatesRef = useRef(new Map());
  const thresholdsReadyRef = useRef(false);
  const initialRequestRef = useRef(null);
  const moreRequestRef = useRef(null);
  const refreshRequestRef = useRef(null);
  const exportRequestRef = useRef(null);
  const exportTimerRef = useRef(null);
  const exportUrlRef = useRef(null);
  const refreshBusyRef = useRef(false);
  const moreBusyRef = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    initialRequestRef.current?.abort();
    initialRequestRef.current = controller;
    moreRequestRef.current?.abort();
    refreshRequestRef.current?.abort();
    exportRequestRef.current?.abort();
    pageOneRef.current = true;
    thresholdStatesRef.current = new Map();
    thresholdsReadyRef.current = false;
    refreshBusyRef.current = false;
    moreBusyRef.current = false;

    iotApi.getDeviceLog(id, {
      from: appliedRange.from,
      to: appliedRange.to,
      sensor: filters.sensor || undefined,
      limit: 50,
      signal: controller.signal,
    }).then(result => {
      if (!active) return;
      const firstPage = uniquePoints(result.points || []).slice(0, 2000);
      pointsRef.current = firstPage;
      thresholdStatesRef.current = readingStates(firstPage[0]);
      thresholdsReadyRef.current = true;
      deviceRef.current = result.device || null;
      setPoints(firstPage);
      setDevice(result.device || null);
      setSource(result.source || 'api');
      setTotal(Number(result.total || 0));
      setNextCursor(result.nextCursor || null);
      setLoadedRange(appliedRange);
      setHasLoadedMore(false);
      setError('');
      setLiveError('');
      setLiveErrorKind('');
      setPageAnnouncement(loadedRowsAnnouncement(firstPage.length));
      setThresholdAnnouncement('');
      setLoadedKey(appliedKey);
    }).catch(failure => {
      if (!active || controller.signal.aborted) return;
      setError(failure.message || 'Log perangkat tidak dapat dimuat.');
      setLoadedKey(appliedKey);
    });

    return () => {
      active = false;
      controller.abort();
      moreRequestRef.current?.abort();
      refreshRequestRef.current?.abort();
      exportRequestRef.current?.abort();
      if (initialRequestRef.current === controller) initialRequestRef.current = null;
    };
  }, [id, appliedKey, appliedRange, filters.sensor, attempt]);

  const refreshPageOne = useCallback(async () => {
    if (!pageOneRef.current || refreshBusyRef.current || source !== 'api') return;
    refreshBusyRef.current = true;
    refreshRequestRef.current?.abort();
    const controller = new AbortController();
    refreshRequestRef.current = controller;
    const range = rangeForQuickFilter(filters.range);
    if (!range) {
      refreshBusyRef.current = false;
      return;
    }
    try {
      const result = await iotApi.getDeviceLog(id, {
        from: range.from,
        to: range.to,
        sensor: filters.sensor || undefined,
        limit: 50,
        signal: controller.signal,
      });
      if (controller.signal.aborted || !pageOneRef.current) return;
      const refreshed = uniquePoints(result.points || []).slice(0, 2000);
      const nextStates = readingStates(refreshed[0]);
      if (thresholdsReadyRef.current) {
        const changes = [...nextStates].filter(([sensor, state]) => thresholdStatesRef.current.has(sensor) && thresholdStatesRef.current.get(sensor) !== state);
        if (changes.length) {
          const names = new Map((result.device?.sensors || deviceRef.current?.sensors || []).map(sensor => [sensor.code, sensor.name || sensor.label || sensor.code]));
          setThresholdAnnouncement(changes.map(([sensor, state]) => `${names.get(sensor) || sensor}: ${READING_STATES[state] || READING_STATES.unknown}`).join('. '));
        }
      }
      if (refreshed.length) {
        thresholdStatesRef.current = nextStates;
        thresholdsReadyRef.current = true;
      }
      pointsRef.current = refreshed;
      deviceRef.current = result.device || deviceRef.current;
      setPoints(refreshed);
      if (result.device) setDevice(result.device);
      setTotal(Number(result.total || 0));
      setNextCursor(result.nextCursor || null);
      setLoadedRange(range);
      setLiveError('');
      setLiveErrorKind('');
    } catch (failure) {
      if (!controller.signal.aborted) {
        setLiveError(failure.message || 'Log perangkat tidak dapat diperbarui.');
        setLiveErrorKind('refresh');
      }
    } finally {
      refreshBusyRef.current = false;
      if (refreshRequestRef.current === controller) refreshRequestRef.current = null;
    }
  }, [id, filters.range, filters.sensor, source, setDevice, setLiveError, setLiveErrorKind, setLoadedRange, setNextCursor, setPoints, setThresholdAnnouncement, setTotal]);

  useEffect(() => {
    if (loadedKey !== appliedKey || source !== 'api' || filters.range === 'custom' || hasLoadedMore || error) return undefined;
    let active = true;
    const stop = iotStreamClient.subscribe({
      onStatus: status => { if (active) setStreamStatus(status); },
      onRefresh: () => { if (active && pageOneRef.current) void refreshPageOne(); },
      onReading: frame => {
        if (active && frame.deviceId === id && pageOneRef.current) void refreshPageOne();
      },
    });
    return () => {
      active = false;
      stop();
      refreshRequestRef.current?.abort();
      refreshBusyRef.current = false;
    };
  }, [id, appliedKey, loadedKey, source, filters.range, filters.sensor, hasLoadedMore, error, refreshPageOne]);

  useEffect(() => () => {
    moreRequestRef.current?.abort();
    refreshRequestRef.current?.abort();
    exportRequestRef.current?.abort();
    if (exportTimerRef.current !== null) {
      clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    if (exportUrlRef.current) {
      URL.revokeObjectURL(exportUrlRef.current);
      exportUrlRef.current = null;
    }
  }, [appliedKey]);

  const sensors = device?.sensors || [];
  const from = loadedRange?.from || appliedRange?.from;
  const to = loadedRange?.to || appliedRange?.to;
  const rangeError = validateLogRange(from, to);
  const visibleExportStatus = exportStatus.key === appliedKey ? exportStatus : { status: 'ready' };
  const exportView = getExportButtonState({
    source,
    total,
    validationError: rangeError || appliedError,
    status: visibleExportStatus.status,
    error: visibleExportStatus.error,
    filename: visibleExportStatus.filename,
  });
  const exportCopy = `Ekspor ${total ?? 0} sampel, ${formatRangeTime(from)} sampai ${formatRangeTime(to)} (${zone.label})`;

  function updatePointList(next) {
    pointsRef.current = next;
    setPoints(next);
  }

  function updateDraft(changes) {
    setDraftState(current => ({
      ...(current.search === locationSearch ? current : draft),
      ...changes,
      search: locationSearch,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    let nextFilters;
    if (draft.range === 'custom') {
      const fromValue = localDateTimeToUtc(draft.from, zone.iana);
      const toValue = localDateTimeToUtc(draft.to, zone.iana);
      const validation = validateLogRange(fromValue, toValue);
      if (validation) {
        updateDraft({ error: validation });
        return;
      }
      nextFilters = { range: 'custom', from: fromValue, to: toValue, sensor: draft.sensor };
    } else {
      nextFilters = { range: draft.range, sensor: draft.sensor };
    }
    updateDraft({ error: '' });
    const query = serializeLogQuery({
      ...nextFilters,
      sensor: device?.type?.kind === 'paket' ? nextFilters.sensor : '',
    });
    setSearchParams(new URLSearchParams(query));
  }

  async function loadMore() {
    if (!nextCursor || moreBusyRef.current || pointsRef.current.length >= 2000) return;
    moreBusyRef.current = true;
    setLoadingMore(true);
    setPageAnnouncement('');
    moreRequestRef.current?.abort();
    const controller = new AbortController();
    moreRequestRef.current = controller;
    try {
      const result = await iotApi.getDeviceLog(id, {
        from: loadedRange.from,
        to: loadedRange.to,
        sensor: filters.sensor || undefined,
        cursor: nextCursor,
        limit: Math.min(50, 2000 - pointsRef.current.length),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const existing = pointsRef.current;
      const combined = uniquePoints([...existing, ...(result.points || [])]).slice(0, 2000);
      const loadedCount = combined.length - existing.length;
      updatePointList(combined);
      setNextCursor(result.nextCursor || null);
      pageOneRef.current = false;
      setHasLoadedMore(true);
      setPageAnnouncement(loadedRowsAnnouncement(loadedCount));
      setLiveError('');
      setLiveErrorKind('');
    } catch (failure) {
      if (!controller.signal.aborted) {
        setLiveError(failure.message || 'Baris berikutnya tidak dapat dimuat.');
        setLiveErrorKind('more');
      }
    } finally {
      moreBusyRef.current = false;
      setLoadingMore(false);
      if (moreRequestRef.current === controller) moreRequestRef.current = null;
    }
  }

  async function exportLog() {
    if (exportView.disabled) return;
    if (exportTimerRef.current !== null) {
      clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    if (exportUrlRef.current) {
      URL.revokeObjectURL(exportUrlRef.current);
      exportUrlRef.current = null;
    }
    exportRequestRef.current?.abort();
    const controller = new AbortController();
    exportRequestRef.current = controller;
    setExportStatus({ key: appliedKey, status: 'pending' });
    try {
      const result = await iotApi.exportDeviceLog(id, {
        from,
        to,
        sensor: filters.sensor || undefined,
        tz: zone.iana,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const blobUrl = URL.createObjectURL(result.blob);
      exportUrlRef.current = blobUrl;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.filename;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      exportTimerRef.current = setTimeout(() => {
        if (exportUrlRef.current === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          exportUrlRef.current = null;
        }
        exportTimerRef.current = null;
      }, 1000);
      setExportStatus({ key: appliedKey, status: 'success', filename: result.filename });
    } catch (failure) {
      if (controller.signal.aborted || failure.name === 'AbortError') setExportStatus({ key: appliedKey, status: 'aborted' });
      else setExportStatus({ key: appliedKey, status: 'failure', error: failure.message || 'Ekspor tidak dapat disiapkan.' });
    } finally {
      if (exportRequestRef.current === controller) exportRequestRef.current = null;
    }
  }

  function retryInitial() {
    setError('');
    setLoadedKey('');
    setAttempt(value => value + 1);
  }

  function retryLiveRequest() {
    const retry = liveErrorKind;
    setLiveError('');
    setLiveErrorKind('');
    if (retry === 'more') void loadMore();
    else void refreshPageOne();
  }

  if (loading) return <DeviceLogState id={id} loading />;
  if (error) return <DeviceLogState id={id} error={error} retry={retryInitial} />;

  const rangeChoices = [...RANGE_OPTIONS, { value: 'custom', label: 'Pilih sendiri' }];
  const status = source === 'local' ? 'local' : filters.range === 'custom' ? 'idle' : streamStatus === 'idle' ? 'connecting' : streamStatus;

  return (
    <div className="iot-touch-targets min-w-0 space-y-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <DeviceLogBackLink id={id} />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <LiveIndicator status={status} />
        </div>
      </div>

      <Card>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge icon={device?.type?.kind === 'paket' ? 'deployed_code' : 'sensors'}>
                {device?.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {device?.type?.code || 'Tipe tidak tersedia'}
              </Badge>
              <ConnectionBadge status={device?.status} />
            </div>
            <h1 className="mt-2 break-words text-2xl font-extrabold text-on-surface">{device?.name || 'Log perangkat'}</h1>
            <p className="mt-1 break-all font-mono text-sm text-on-surface-variant">{device?.code || id}</p>
          </div>
        </div>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={applyFilters}>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rentang waktu</p>
            <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Pilih rentang waktu log">
              {rangeChoices.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={draft.range === option.value}
                  onClick={() => updateDraft({ range: option.value, error: '' })}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${draft.range === option.value ? 'border-primary button-primary text-white' : 'border-outline-variant/60 text-on-surface hover:bg-primary/5'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {draft.range === 'custom' && (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Field label="Dari">
                <Input type="datetime-local" value={draft.from} onChange={value => updateDraft({ from: value, error: '' })} />
              </Field>
              <Field label="Sampai">
                <Input type="datetime-local" value={draft.to} onChange={value => updateDraft({ to: value, error: '' })} />
              </Field>
              <p className="text-xs text-on-surface-variant sm:col-span-2">Waktu lokal browser: {zone.label} ({zone.iana})</p>
            </div>
          )}

          {device?.type?.kind === 'paket' && (
            <Field label="Sensor">
              <Select
                value={draft.sensor}
                onChange={value => updateDraft({ sensor: value })}
                options={[
                  { value: '', label: 'Semua sensor' },
                  ...sensors.map(sensor => ({ value: sensor.code, label: sensor.name || sensor.label || sensor.code })),
                ]}
              />
            </Field>
          )}

          {draft.error && <p role="alert" className="text-sm font-semibold text-red-800 dark:text-red-200">{draft.error}</p>}
          <Button type="submit" icon="filter_alt" className="min-h-11">Terapkan</Button>
        </form>
      </Card>

      <Card>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-on-surface">
              Menampilkan {total ?? 0} sampel dari {formatRangeTime(from)} sampai {formatRangeTime(to)} ({zone.label})
            </p>
            {device?.hasReadings === false && points.length === 0 ? (
              <p className="mt-2 text-sm text-on-surface-variant">Belum ada data. Pastikan alat sudah diprovisioning dan tersambung WiFi.</p>
            ) : points.length === 0 ? (
              <p className="mt-2 text-sm text-on-surface-variant">Tidak ada data pada rentang ini. Coba perlebar rentang waktu.</p>
            ) : null}
          </div>
          <div className="flex min-w-0 max-w-full flex-col items-start gap-1">
            <span role={visibleExportStatus.status === 'pending' ? 'status' : undefined} aria-live={visibleExportStatus.status === 'pending' ? 'polite' : undefined}>
              <Button icon="download" disabled={exportView.disabled} onClick={exportLog} title={exportView.reason || exportCopy} className="min-h-11">
                {visibleExportStatus.status === 'pending' ? 'Menyiapkan file...' : 'Ekspor ke Excel'}
              </Button>
            </span>
            <p className="max-w-full break-words text-xs text-on-surface-variant">{exportCopy}</p>
            {exportView.reason && <p className="max-w-full break-words text-xs font-semibold text-on-surface-variant">{exportView.reason}</p>}
            {exportView.message && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p role={visibleExportStatus.status === 'failure' ? 'alert' : 'status'} className="max-w-full break-words text-xs text-on-surface-variant">{exportView.message}</p>
                {exportView.retry && <Button variant="ghost" size="sm" icon="refresh" onClick={exportLog}>Coba lagi</Button>}
              </div>
            )}
          </div>
        </div>

        {liveError && <div className="mt-4"><ErrorMessage message={liveError} retry={retryLiveRequest} /></div>}
        <p className="sr-only" aria-live="polite">{pageAnnouncement}</p>
        <p className="sr-only" aria-live="polite">{thresholdAnnouncement}</p>

        {points.length > 0 && (
          <div className="mt-4">
            <LogTable
              points={points}
              sensors={sensors}
              selectedSensor={device?.type?.kind === 'paket' ? filters.sensor : ''}
            />
          </div>
        )}

        {points.length > 0 && nextCursor && points.length < 2000 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="ghost" icon="expand_more" disabled={loadingMore} onClick={loadMore} className="min-h-11">
              {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
            </Button>
            <span className="text-xs text-on-surface-variant">{points.length} dari {total ?? points.length} baris dimuat</span>
          </div>
        )}
        {points.length >= 2000 && nextCursor && (
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">Untuk data lebih banyak, ekspor ke Excel</p>
        )}
      </Card>
    </div>
  );
}
