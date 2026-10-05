import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';
import { iotApi } from '../services/iotApi.js';
import { Badge, Button, Card, Empty, Field, Input, SectionTitle, Select, StatCard } from '../components/ui';
import { areaFilterOptions } from '../utils/frontendReview.js';

const STATUS = {
  online: { label: 'Terhubung', tone: 'ok', icon: 'wifi' },
  stale: { label: 'Data tertunda', tone: 'warn', icon: 'schedule' },
  offline: { label: 'Tidak terhubung', tone: 'bad', icon: 'wifi_off' },
};

function DeviceStatus({ status }) {
  const info = STATUS[status] || { label: 'Status tidak diketahui', tone: 'muted', icon: 'help' };
  return <Badge tone={info.tone} icon={info.icon}>{info.label}</Badge>;
}

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

  useEffect(() => {
    let current = true;
    iotApi.getDevices({ userId: currentUser?.id }).then(data => {
      if (!current) return;
      setResult(data);
      setState('ready');
    }).catch(failure => {
      if (!current) return;
      setError(failure.message);
      setState('error');
    });
    return () => { current = false; };
  }, [attempt, currentUser?.id]);

  const devices = result?.devices ?? EMPTY_DEVICES;
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
          subtitle="Daftar identitas dan status perangkat. Nilai pembacaan belum tersedia di tahap ini."
          action={(
            <Link
              to="/detail-informasi"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-white hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">qr_code_scanner</span>
              Scan QR alat
            </Link>
          )}
        />

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
                className="glass-card rounded-2xl p-4 min-w-0 hover:shadow-glass-elevated transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="material-symbols-outlined text-[24px] text-primary" aria-hidden="true">sensors</span>
                  <DeviceStatus status={device.status} />
                </div>
                <h2 className="mt-3 font-bold text-on-surface break-words">{device.name}</h2>
                <p className="mt-1 text-xs text-on-surface-variant break-all font-mono">{device.code}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge icon={device.type?.kind === 'paket' ? 'deployed_code' : 'sensors'}>
                    {device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {device.type?.name || device.type?.code}
                  </Badge>
                </div>
                {device.type?.sensors?.length > 0 && (
                  <p className="mt-3 text-xs text-on-surface-variant break-words">
                    Sensor: {device.type.sensors.map(sensor => sensor.name || sensor.label || sensor.code).join(', ')}
                  </p>
                )}
                <div className="mt-4 rounded-xl panel-inset p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Pembacaan</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">Belum ada data</p>
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
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [loadedId, setLoadedId] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    iotApi.getDevice(id).then(data => {
      if (!current) return;
      setResult(data);
      setLoadedId(id);
      setState('ready');
    }).catch(failure => {
      if (!current) return;
      setError(failure.message);
      setLoadedId(id);
      setState('error');
    });
    return () => { current = false; };
  }, [id, attempt]);

  if (state === 'loading' || loadedId !== id) {
    return <Card><p className="text-sm text-on-surface-variant" role="status">Memuat detail perangkat...</p></Card>;
  }

  if (state === 'error') return <ErrorState message={error} retry={() => {
    setState('loading');
    setError('');
    setAttempt(value => value + 1);
  }} />;

  const { device } = result;
  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/iot" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Kembali ke List IoT
        </Link>
        {result.label && <p className="text-xs font-bold text-on-surface-variant">{result.label}</p>}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary dark:text-inverse-primary">
              {device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {device.type?.name || device.type?.code}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-on-surface break-words">{device.name}</h2>
            <p className="mt-1 font-mono text-sm text-on-surface-variant break-all">{device.code}</p>
          </div>
          <DeviceStatus status={device.status} />
        </div>
        <p className="mt-4 rounded-xl panel-inset p-3 text-sm font-semibold text-on-surface">Pembacaan: Belum ada data</p>
      </Card>

      <Card>
        <SectionTitle eyebrow="Sensor" title="Sensor dan ambang" subtitle="Konfigurasi berasal dari tipe perangkat dan ambang efektif yang tersedia." />
        {device.sensors?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {device.sensors.map(sensor => (
              <li key={sensor.code} className="min-w-0 rounded-xl panel-inset p-4">
                <p className="font-bold text-on-surface break-words">{sensor.name || sensor.label || sensor.code}</p>
                <p className="mt-1 font-mono text-xs text-on-surface-variant">{sensor.code}</p>
                <p className="mt-3 text-sm text-on-surface">Belum ada data {sensor.unit ? `(${sensor.unit})` : ''}</p>
                {sensor.threshold ? (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Ambang: {sensor.threshold.low ?? 'tanpa batas bawah'} sampai {sensor.threshold.high ?? 'tanpa batas atas'} {sensor.unit || ''}
                    {sensor.threshold.source === 'area' ? ' · ambang area' : ' · ambang bawaan'}
                  </p>
                ) : <p className="mt-2 text-xs text-on-surface-variant">Ambang belum tersedia.</p>}
              </li>
            ))}
          </ul>
        ) : <Empty title="Konfigurasi sensor belum tersedia" icon="sensors" />}
      </Card>

      <Card>
        <SectionTitle eyebrow="Kesehatan unit" title="Informasi yang tersedia" />
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Firmware', device.firmware || 'Belum tersedia'],
            ['Sinyal RSSI', device.rssi == null ? 'Belum tersedia' : `${device.rssi} dBm`],
            ['Kalibrasi terakhir', formatDate(device.calibratedAt)],
            ['Pengukuran terakhir', formatDate(device.lastMeasuredAt)],
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
