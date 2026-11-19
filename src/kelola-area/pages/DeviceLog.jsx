import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Field, FilterChip, Input, PageHeader, Select, Tautan } from '../../shared/components/ui.jsx';
import LiveIndicator from '../../components/iot/LiveIndicator.jsx';
import LogTable from '../../components/iot/LogTable.jsx';
import { iotApi } from '../../services/iotApi.js';
import { iotStreamClient } from '../../services/iotStream.js';
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
} from '../../utils/deviceLog.js';

const RANGE_OPTIONS = [
  { value: '1h', label: '1 jam' },
  { value: '24h', label: '24 jam' },
  { value: '7d', label: '7 hari' },
  { value: '31d', label: '31 hari' },
];
const READING_STATES = { normal: 'Normal', low: 'Di bawah ambang', high: 'Di atas ambang', unknown: 'Tanpa ambang' };
const DEVICE_STATUS = {
  online: { label: 'Terhubung', tone: 'ok', icon: 'wifi' },
  stale: { label: 'Data tertunda', tone: 'warn', icon: 'clock' },
  offline: { label: 'Tidak terhubung', tone: 'bad', icon: 'wifi-off' },
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
  const info = DEVICE_STATUS[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'circle-help' };
  return <Badge tone={info.tone} icon={info.icon}>{info.label}</Badge>;
}

function ErrorMessage({ message, retry }) {
  return (
    <Alert tone="bad" action={retry && <Button variant="secondary" size="sm" icon="refresh-cw" onClick={retry}>Coba lagi</Button>}>
      <span className="break-words">{message}</span>
    </Alert>
  );
}

function DeviceLogBackLink({ id }) {
  return (
    <Tautan to={`/iot/${encodeURIComponent(id)}`} icon="arrow-left" className="mb-3 max-w-full text-sm">
      Kembali ke detail alat
    </Tautan>
  );
}

export function DeviceLogState({ id, loading = false, error = '', retry }) {
  if (!loading && !error) return null;

  return (
    <div className="iot-touch-targets min-w-0">
      <DeviceLogBackLink id={id} />
      <PageHeader title="Log sensor" />
      <Card>
        {loading
          ? <p className="text-sm text-text-2" role="status">Memuat log...</p>
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
  const paket = device?.type?.kind === 'paket';

  return (
    <div className="iot-touch-targets min-w-0">
      <DeviceLogBackLink id={id} />
      <PageHeader
        title="Log sensor"
        subtitle={<>
          <span className="font-semibold text-text">{device?.name || 'Alat'}</span>
          {' · '}<span className="break-all font-mono">{device?.code || id}</span>
          {' · '}{paket ? 'Paket' : 'Satuan'} · {device?.type?.code || 'Tipe tidak tersedia'}
        </>}
        actions={<>
          <ConnectionBadge status={device?.status} />
          <LiveIndicator status={status} />
        </>}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <Card title="Rentang waktu" subtitle={`Waktu lokal browser: ${zone.label} (${zone.iana})`}>
          <form className="flex flex-col gap-4" onSubmit={applyFilters}>
            <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Pilih rentang waktu log">
              {rangeChoices.map(option => (
                <FilterChip
                  key={option.value}
                  active={draft.range === option.value}
                  onClick={() => updateDraft({ range: option.value, error: '' })}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>

            {draft.range === 'custom' && (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Field label="Dari">
                  <Input type="datetime-local" value={draft.from} onChange={value => updateDraft({ from: value, error: '' })} />
                </Field>
                <Field label="Sampai">
                  <Input type="datetime-local" value={draft.to} onChange={value => updateDraft({ to: value, error: '' })} />
                </Field>
              </div>
            )}

            {paket && (
              <div className="max-w-xs">
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
              </div>
            )}

            {draft.error && <p role="alert" className="text-sm font-semibold text-bad-fg">{draft.error}</p>}
            <div><Button type="submit" variant="secondary" icon="funnel">Terapkan</Button></div>
          </form>
        </Card>

        <Card
          title={`Menampilkan ${total ?? 0} sampel`}
          subtitle={`Dari ${formatRangeTime(from)} sampai ${formatRangeTime(to)} (${zone.label})`}
          action={(
            <span role={visibleExportStatus.status === 'pending' ? 'status' : undefined} aria-live={visibleExportStatus.status === 'pending' ? 'polite' : undefined}>
              <Button icon="download" disabled={exportView.disabled} onClick={exportLog} title={exportView.reason || exportCopy}>
                {visibleExportStatus.status === 'pending' ? 'Menyiapkan file...' : 'Ekspor ke Excel'}
              </Button>
            </span>
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="max-w-full break-words text-sm text-text-2">{exportCopy}</p>
            {exportView.reason && <p className="max-w-full break-words text-sm font-semibold text-text-2">{exportView.reason}</p>}
            {exportView.message && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p role={visibleExportStatus.status === 'failure' ? 'alert' : 'status'} className={`max-w-full break-words text-sm ${visibleExportStatus.status === 'failure' ? 'font-semibold text-bad-fg' : 'text-text-2'}`}>{exportView.message}</p>
                {exportView.retry && <Button variant="ghost" size="sm" icon="refresh-cw" onClick={exportLog}>Coba lagi</Button>}
              </div>
            )}
            {device?.hasReadings === false && points.length === 0 ? (
              <p className="mt-2 text-sm text-text-2">Belum ada data. Pastikan alat sudah diprovisioning dan tersambung WiFi.</p>
            ) : points.length === 0 ? (
              <p className="mt-2 text-sm text-text-2">Tidak ada data pada rentang ini. Coba perlebar rentang waktu.</p>
            ) : null}
          </div>

          {liveError && <div className="mt-4"><ErrorMessage message={liveError} retry={retryLiveRequest} /></div>}
          <p className="sr-only" aria-live="polite">{pageAnnouncement}</p>
          <p className="sr-only" aria-live="polite">{thresholdAnnouncement}</p>

          {points.length > 0 && (
            <div className="mt-4">
              <LogTable
                points={points}
                sensors={sensors}
                selectedSensor={paket ? filters.sensor : ''}
              />
            </div>
          )}

          {points.length > 0 && nextCursor && points.length < 2000 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="ghost" icon="chevron-down" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
              </Button>
              <span className="font-num text-sm tabular-nums text-text-2">{points.length} dari {total ?? points.length} baris dimuat</span>
            </div>
          )}
          {points.length >= 2000 && nextCursor && (
            <p className="mt-4 text-sm font-semibold text-text-2">Untuk data lebih banyak, ekspor ke Excel</p>
          )}
        </Card>
      </div>
    </div>
  );
}
