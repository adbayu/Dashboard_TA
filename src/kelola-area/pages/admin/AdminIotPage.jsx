import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AksiBaris, Alert, Button, EmptyState, Field, IconButton, Input, Modal, NumberInput, PageHeader, Select, StatusPill, Table, Tabs,
} from '../../../shared/components/ui';
import { IkonSlot } from '../../../shared/components/ui/IkonSlot.jsx';
import { FOKUS } from '../../../shared/components/ui/tones.js';
import { kelasTombol } from '../../../shared/components/ui/tombol.js';
import { iotApi } from '../../../services/iotApi.js';
import { STATUS_KONEKSI } from '../../../utils/monitoring.js';
import { canRotateDeviceCredential, credentialRevealCanClose, performActivationLabelAction } from '../../../utils/adminIotActions.js';

const EMPTY_DEVICE = { typeCode: '', name: '', areaRef: '', firmware: '' };
const EMPTY_TYPE = { code: '', name: '', kind: 'satuan', description: '', sensors: [] };
const EMPTY_SENSOR = { code: '', name: '', unit: '', min: '', max: '', decimals: 2, warnLow: '', warnHigh: '' };
const EMPTY_LIST = [];
export const DEVICE_TYPE_CODE_PATTERN = '[A-Z0-9\\x2D]{3,32}';
export function RotationBusyState() {
  return <p role="status" className="text-sm text-text-2">Merotasi credential</p>;
}

// Kotak centang dan radio bawaan tetap jadi anak langsung <label> supaya
// aturan 44 px .iot-touch-targets (label:has(> input)) berlaku.
const KONTROL_PILIH = `h-4 w-4 shrink-0 accent-primary ${FOKUS}`;
const LABEL_KOLOM = 'mb-1.5 block text-sm font-semibold text-text';
const GALAT = 'text-sm font-semibold text-bad-fg';
const KOTAK_INFO = 'flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 p-3';

function KepalaKelolaIot({ sample }) {
  return (
    <PageHeader
      title="Kelola IoT"
      subtitle="Daftarkan device, terbitkan kode aktivasi, cetak label QR, dan kelola credential."
      sample={sample}
    />
  );
}

function formatRelative(value) {
  if (!value) return 'Belum ada data';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Belum ada data';
  const seconds = Math.round((time - Date.now()) / 1000);
  const unit = Math.abs(seconds) < 60 ? ['second', seconds]
    : Math.abs(seconds) < 3600 ? ['minute', Math.round(seconds / 60)]
      : Math.abs(seconds) < 86400 ? ['hour', Math.round(seconds / 3600)]
        : ['day', Math.round(seconds / 86400)];
  return new Intl.RelativeTimeFormat('id', { numeric: 'auto' }).format(unit[1], unit[0]);
}

function formattedNumber(value) {
  if (value === null || value === undefined || value === '') return 'Belum diatur';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value);
}

function toNullableNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

async function copyText(value) {
  if (!navigator.clipboard?.writeText) throw new Error('Fitur salin tidak tersedia di browser ini. Pilih teks lalu salin secara manual.');
  await navigator.clipboard.writeText(value);
}

export default function AdminIotPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('device');
  const [search, setSearch] = useState('');

  const [deviceOpen, setDeviceOpen] = useState(false);
  const [deviceEditing, setDeviceEditing] = useState(null);
  const [deviceForm, setDeviceForm] = useState(EMPTY_DEVICE);
  const [provision, setProvision] = useState(null);
  const [provisionSaved, setProvisionSaved] = useState(false);
  const [copied, setCopied] = useState({});
  const [labelView, setLabelView] = useState(false);
  const [labelUrls, setLabelUrls] = useState({});
  const [labelConfirmation, setLabelConfirmation] = useState(null);
  const labelUrlsRef = useRef(new Set());
  const [rotationConfirmation, setRotationConfirmation] = useState(null);
  const [rotationReveal, setRotationReveal] = useState(null);
  const rotationTriggerRef = useRef(null);
  const [rotationBusy, setRotationBusy] = useState(false);
  const [rotationError, setRotationError] = useState('');
  const [rotationCopied, setRotationCopied] = useState(false);
  const [rotationSaved, setRotationSaved] = useState(false);

  const [calibrationDevice, setCalibrationDevice] = useState(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeEditing, setTypeEditing] = useState(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE);
  const [sensorOpen, setSensorOpen] = useState(false);
  const [sensorEditing, setSensorEditing] = useState(null);
  const [sensorForm, setSensorForm] = useState(EMPTY_SENSOR);
  const [sensorDelete, setSensorDelete] = useState(null);

  const clearLabelImages = () => {
    for (const url of labelUrlsRef.current) URL.revokeObjectURL(url);
    labelUrlsRef.current.clear();
    setLabelUrls({});
  };

  useEffect(() => () => {
    for (const url of labelUrlsRef.current) URL.revokeObjectURL(url);
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setLoading(true);
      setLoadError('');
    }
    try {
      const result = await iotApi.getDevices();
      setData(result);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Data Kelola IoT tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    iotApi.getDevices().then(result => {
      if (active) {
        setData(result);
        setLoadError('');
      }
    }).catch(error => {
      if (active) setLoadError(error.message || 'Data Kelola IoT tidak dapat dimuat.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const devices = data?.devices ?? EMPTY_LIST;
  const deviceTypes = data?.deviceTypes ?? EMPTY_LIST;
  const sensorTypes = data?.sensorTypes ?? EMPTY_LIST;
  const filteredDevices = useMemo(() => devices.filter(device =>
    !search || [device.name, device.code, device.type?.code, device.type?.name, device.areaRef]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [devices, search]);
  const sensorsByCode = useMemo(() => new Map(sensorTypes.map(sensor => [sensor.code, sensor])), [sensorTypes]);

  const runAction = async (action, successMessage, { refresh = true } = {}) => {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const result = await action();
      if (refresh) await load({ quiet: true });
      setNotice(successMessage);
      return result ?? true;
    } catch (error) {
      setActionError(error.message || 'Perubahan tidak dapat disimpan.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openNewDevice = () => {
    setDeviceEditing(null);
    setDeviceForm({ ...EMPTY_DEVICE, typeCode: deviceTypes.find(type => type.active)?.code || '' });
    setDeviceOpen(true);
  };

  const openEditDevice = device => {
    setDeviceEditing(device);
    setDeviceForm({
      typeCode: device.type?.code || '',
      name: device.name || '',
      areaRef: device.areaRef || '',
      firmware: device.firmware || '',
    });
    setDeviceOpen(true);
  };

  const submitDevice = async event => {
    event.preventDefault();
    const body = deviceEditing
      ? { name: deviceForm.name.trim(), areaRef: deviceForm.areaRef.trim() || null, firmware: deviceForm.firmware.trim() || null }
      : { typeCode: deviceForm.typeCode, name: deviceForm.name.trim(), areaRef: deviceForm.areaRef.trim() || null };
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      if (deviceEditing) {
        await iotApi.patchDevice(deviceEditing.id, body);
        setNotice('Perubahan device tersimpan.');
      } else {
        const result = await iotApi.createDevice(body);
        setProvision({
          deviceId: result.device.id,
          code: result.device.code,
          name: deviceForm.name.trim(),
          credential: result.credential,
          activationCode: result.activationCode,
          expiresAt: null,
        });
        setProvisionSaved(false);
        setCopied({});
      }
      setDeviceOpen(false);
      setDeviceEditing(null);
      setDeviceForm(EMPTY_DEVICE);
      await load({ quiet: true });
    } catch (error) {
      setActionError(error.message || 'Device tidak dapat disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const startActivationRenewal = async device => {
    clearLabelImages();
    const result = await runAction(
      () => iotApi.reissueActivationCode(device.id),
      'Kode aktivasi baru dibuat. Kode sebelumnya tidak berlaku lagi.',
      { refresh: false },
    );
    if (!result) return;
    setProvision({ deviceId: device.id, code: device.code, name: device.name, activationCode: result.activationCode, expiresAt: result.expiresAt });
    setProvisionSaved(false);
    setCopied({});
    setLabelView(false);
  };

  const openLabelForDevice = device => {
    setActionError('');
    setNotice('');
    setProvision(null);
    performActivationLabelAction('request', device, {
      onConfirmationChange: setLabelConfirmation,
      renewActivationCode: startActivationRenewal,
    });
  };

  const cancelLabelConfirmation = () => performActivationLabelAction('cancel', labelConfirmation, {
    onConfirmationChange: setLabelConfirmation,
    renewActivationCode: startActivationRenewal,
  });
  const confirmLabelRenewal = () => performActivationLabelAction('confirm', labelConfirmation, {
    onConfirmationChange: setLabelConfirmation,
    renewActivationCode: startActivationRenewal,
  });

  const openRotationConfirmation = device => {
    setRotationError('');
    setActionError('');
    setRotationConfirmation(device);
  };

  const cancelRotationConfirmation = () => {
    if (!rotationBusy) setRotationConfirmation(null);
  };

  const rotateCredential = async () => {
    if (!rotationConfirmation || rotationBusy) return;
    const device = rotationConfirmation;
    setRotationBusy(true);
    setRotationError('');
    try {
      const result = await iotApi.rotateDeviceCredential(device.id);
      setRotationConfirmation(null);
      setRotationCopied(false);
      setRotationSaved(false);
      setRotationReveal({ code: device.code, credential: result.credential, credentialSince: result.credentialSince });
    } catch (error) {
      setRotationError(error.message || 'Credential tidak dapat dirotasi.');
    } finally {
      setRotationBusy(false);
    }
  };

  const closeRotationReveal = () => {
    if (!credentialRevealCanClose({ credential: rotationReveal?.credential, copied: rotationCopied, saved: rotationSaved })) return;
    setRotationReveal(null);
    setRotationCopied(false);
    setRotationSaved(false);
    setRotationError('');
  };

  const generateLabel = async format => {
    if (!provision?.activationCode) return;
    setBusy(true);
    setActionError('');
    try {
      const blob = await iotApi.getQrImage(provision.deviceId, provision.activationCode, format);
      const url = URL.createObjectURL(blob);
      labelUrlsRef.current.add(url);
      setLabelUrls(current => ({ ...current, [format]: url }));
      setLabelView(true);
    } catch (error) {
      setActionError(error.message || 'Label QR tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  };

  const closeProvision = () => {
    const hasCredential = Boolean(provision?.credential);
    const isCopied = (!hasCredential || copied.credential) && copied.activation;
    if (!provisionSaved && !isCopied) return;
    setProvision(null);
    setProvisionSaved(false);
    setCopied({});
    setLabelView(false);
    clearLabelImages();
  };

  const copySecret = async (field, value) => {
    try {
      await copyText(value);
      setCopied(current => ({ ...current, [field]: true }));
      setActionError('');
    } catch (error) {
      setActionError(error.message);
    }
  };

  const recordCalibration = async () => {
    if (!calibrationDevice) return;
    const result = await runAction(
      () => iotApi.patchDevice(calibrationDevice.id, { calibratedAt: new Date().toISOString() }),
      `Kalibrasi ${calibrationDevice.code} dicatat.`,
    );
    if (result) setCalibrationDevice(null);
  };

  const openNewType = () => {
    const firstSensor = sensorTypes[0];
    setTypeEditing(null);
    setTypeForm({
      ...EMPTY_TYPE,
      sensors: firstSensor ? [{ code: firstSensor.code, label: firstSensor.name }] : [],
    });
    setTypeOpen(true);
  };

  const openEditType = type => {
    setTypeEditing(type);
    setTypeForm({ code: type.code, name: type.name, kind: type.kind, description: type.description || '', sensors: (type.sensors || []).map(sensor => ({ ...sensor })) });
    setTypeOpen(true);
  };

  const toggleTypeSensor = sensor => {
    setTypeForm(current => {
      const exists = current.sensors.some(item => item.code === sensor.code);
      return {
        ...current,
        sensors: exists
          ? current.sensors.filter(item => item.code !== sensor.code)
          : [...current.sensors, { code: sensor.code, label: sensor.name }],
      };
    });
  };

  const submitType = async event => {
    event.preventDefault();
    const linkedSensors = typeForm.kind === 'satuan' ? typeForm.sensors.slice(0, 1) : typeForm.sensors;
    if (!linkedSensors.length || (typeForm.kind === 'paket' && linkedSensors.length < 2)) {
      setActionError(typeForm.kind === 'paket' ? 'Paket butuh minimal 2 sensor.' : 'Pilih satu jenis sensor.');
      return;
    }
    const used = typeEditing && devices.some(device => device.type?.code === typeEditing.code);
    const body = typeEditing
      ? { name: typeForm.name.trim(), description: typeForm.description.trim() }
      : { code: typeForm.code.trim().toUpperCase(), name: typeForm.name.trim(), kind: typeForm.kind, description: typeForm.description.trim(), sensors: linkedSensors };
    if (typeEditing && !used) body.sensors = linkedSensors;
    const result = await runAction(
      () => typeEditing ? iotApi.patchDeviceType(typeEditing.id, body) : iotApi.createDeviceType(body),
      typeEditing ? 'Tipe IoT diperbarui.' : 'Tipe IoT dibuat.',
    );
    if (result) {
      setTypeOpen(false);
      setTypeEditing(null);
      setTypeForm(EMPTY_TYPE);
    }
  };

  const openNewSensor = () => {
    setSensorEditing(null);
    setSensorForm(EMPTY_SENSOR);
    setSensorOpen(true);
  };

  const openEditSensor = sensor => {
    setSensorEditing(sensor);
    setSensorForm({
      ...EMPTY_SENSOR,
      ...sensor,
      warnLow: sensor.warnLow ?? '',
      warnHigh: sensor.warnHigh ?? '',
    });
    setSensorOpen(true);
  };

  const submitSensor = async event => {
    event.preventDefault();
    const body = sensorEditing
      ? { name: sensorForm.name.trim(), decimals: Number(sensorForm.decimals), warnLow: toNullableNumber(sensorForm.warnLow), warnHigh: toNullableNumber(sensorForm.warnHigh) }
      : {
        code: sensorForm.code.trim().toLowerCase(),
        name: sensorForm.name.trim(),
        unit: sensorForm.unit.trim(),
        min: Number(sensorForm.min),
        max: Number(sensorForm.max),
        decimals: Number(sensorForm.decimals),
        warnLow: toNullableNumber(sensorForm.warnLow),
        warnHigh: toNullableNumber(sensorForm.warnHigh),
      };
    const result = await runAction(
      () => sensorEditing ? iotApi.patchSensorType(sensorEditing.code, body) : iotApi.createSensorType(body),
      sensorEditing ? 'Jenis sensor diperbarui.' : 'Jenis sensor dibuat.',
    );
    if (result) {
      setSensorOpen(false);
      setSensorEditing(null);
      setSensorForm(EMPTY_SENSOR);
    }
  };

  const deleteSensor = async () => {
    if (!sensorDelete) return;
    const result = await runAction(() => iotApi.deleteSensorType(sensorDelete.code), 'Jenis sensor dihapus.');
    if (result) setSensorDelete(null);
  };

  const toggleTypeActive = type => runAction(
    () => iotApi.patchDeviceType(type.id, { active: !type.active }),
    type.active ? 'Tipe IoT dinonaktifkan.' : 'Tipe IoT diaktifkan.',
  );

  if (loading) {
    return (
      <div className="iot-touch-targets min-w-0">
        <KepalaKelolaIot />
        <p role="status" className="text-sm text-text-2">Memuat data Kelola IoT...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="iot-touch-targets min-w-0">
        <KepalaKelolaIot />
        <Alert tone="bad">
          <p>{loadError}</p>
          <Button variant="secondary" size="sm" icon="refresh-cw" className="mt-2" onClick={() => load()}>Coba lagi</Button>
        </Alert>
      </div>
    );
  }

  const typeSensorCount = code => deviceTypes.filter(type => type.sensors?.some(sensor => sensor.code === code)).length;
  const hasUnsavedProvision = provision && !provisionSaved && !((!provision.credential || copied.credential) && copied.activation);

  const kolomDevice = [
    {
      key: 'device',
      label: 'Device',
      render: device => (
        <div className="min-w-[11rem] max-w-[15rem]">
          <p className="break-words font-semibold">{device.name}</p>
          <p className="font-num text-sm">{device.code}</p>
          <p className="break-all font-num text-xs text-text-2">{device.id}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipe',
      render: device => (
        <div>
          <p>{device.type?.kind === 'paket' ? 'Paket' : 'Satuan'}</p>
          <p className="font-num text-sm text-text-2">{device.type?.code || 'Belum diketahui'}</p>
        </div>
      ),
    },
    {
      key: 'area',
      label: 'Area',
      render: device => (device.areaRef
        ? <span className="block max-w-[12rem] break-words">{device.areaRef}</span>
        : <span className="text-text-2">Belum diisi</span>),
    },
    {
      key: 'status',
      label: 'Status',
      render: device => {
        const status = STATUS_KONEKSI[device.status] || STATUS_KONEKSI.offline;
        return <StatusPill tone={status.tone} icon={status.icon}>{status.label}</StatusPill>;
      },
    },
    {
      key: 'last',
      label: 'Kiriman terakhir',
      render: device => <span className="whitespace-nowrap text-text-2">{formatRelative(device.lastReceivedAt)}</span>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: device => (iotApi.canWrite ? (
        <AksiBaris>
          <IconButton icon="copy" size="sm" onClick={() => copyText(device.id).then(() => { setActionError(''); setNotice(`ID device ${device.code} tersalin.`); }).catch(error => setActionError(error.message))} label={`Salin ID device ${device.code}`} />
          <IconButton icon="qr-code" size="sm" onClick={() => openLabelForDevice(device)} label={`Buat label QR ${device.code}`} />
          <IconButton icon="pencil" size="sm" onClick={() => openEditDevice(device)} label={`Ubah ${device.code}`} />
          <IconButton icon="refresh-cw" size="sm" onClick={() => startActivationRenewal(device)} label={`Buat ulang kode aktivasi ${device.code}`} />
          {canRotateDeviceCredential(device) && <IconButton icon="lock" size="sm" onClick={event => { rotationTriggerRef.current = event.currentTarget; openRotationConfirmation(device); }} label={`Rotasi credential ${device.code}`} />}
          <IconButton icon="wrench" size="sm" onClick={() => setCalibrationDevice(device)} label={`Catat kalibrasi ${device.code}`} />
        </AksiBaris>
      ) : <span className="text-sm text-text-2">Hanya-baca</span>),
    },
  ];

  const kolomTipe = [
    { key: 'code', label: 'Kode', render: type => <span className="font-num text-sm font-semibold">{type.code}</span> },
    { key: 'name', label: 'Nama', render: type => <span className="block max-w-[14rem] break-words">{type.name}</span> },
    { key: 'kind', label: 'Jenis', render: type => (type.kind === 'paket' ? 'Paket' : 'Satuan') },
    {
      key: 'sensors',
      label: 'Sensor',
      render: type => {
        const sensorNames = (type.sensors || []).map(sensor => sensorsByCode.get(sensor.code)?.name || sensor.label || sensor.code).join(', ');
        return sensorNames ? <span className="block max-w-[16rem] break-words">{sensorNames}</span> : <span className="text-text-2">Belum ada sensor</span>;
      },
    },
    { key: 'devices', label: 'Device', align: 'end', num: true, render: type => devices.filter(device => device.type?.code === type.code).length },
    {
      key: 'status',
      label: 'Status',
      render: type => (
        <div>
          {type.active
            ? <StatusPill tone="ok" icon="circle-check">Aktif</StatusPill>
            : <StatusPill tone="muted" icon="circle-minus">Nonaktif</StatusPill>}
          {devices.some(device => device.type?.code === type.code) && (
            <span className="mt-1 flex items-center gap-1 text-sm text-text-2"><IkonSlot icon="lock" size={15} />Sensor terkunci</span>
          )}
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: type => (iotApi.canWrite ? (
        <AksiBaris>
          <Button size="sm" variant="ghost" onClick={() => openEditType(type)}>Ubah</Button>
          <Button size="sm" variant="ghost" onClick={() => toggleTypeActive(type)}>{type.active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
        </AksiBaris>
      ) : null),
    },
  ];

  const kolomSensor = [
    { key: 'code', label: 'Kode', render: sensor => <span className="font-num text-sm font-semibold">{sensor.code}</span> },
    { key: 'name', label: 'Nama', render: sensor => <span className="block max-w-[14rem] break-words">{sensor.name}</span> },
    { key: 'unit', label: 'Satuan' },
    { key: 'range', label: 'Rentang valid', render: sensor => <span className="whitespace-nowrap font-num">{formattedNumber(sensor.min)} sampai {formattedNumber(sensor.max)}</span> },
    { key: 'warn', label: 'Ambang default', render: sensor => <span className="whitespace-nowrap font-num">{formattedNumber(sensor.warnLow)} sampai {formattedNumber(sensor.warnHigh)}</span> },
    { key: 'used', label: 'Dipakai di', align: 'end', render: sensor => `${typeSensorCount(sensor.code)} tipe` },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: sensor => (iotApi.canWrite ? (
        <AksiBaris>
          <Button size="sm" variant="ghost" onClick={() => openEditSensor(sensor)}>Ubah</Button>
          {typeSensorCount(sensor.code) === 0 && <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => setSensorDelete(sensor)} label={`Hapus jenis sensor ${sensor.code}`} />}
        </AksiBaris>
      ) : null),
    },
  ];

  const panelDevice = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-[340px]">
          <Input value={search} onChange={setSearch} placeholder="Nama, kode, tipe, atau areaRef" type="search" aria-label="Cari device" />
        </div>
        {iotApi.canWrite && <Button icon="plus" onClick={openNewDevice}>Tambah device</Button>}
      </div>
      <p className="text-sm text-text-2">Riwayat pembacaan tetap terikat pada device. Area dapat diisi manual sebagai areaRef.</p>
      {filteredDevices.length === 0 ? (
        <EmptyState title={search ? 'Tidak ada device yang cocok' : 'Belum ada device'} icon={search ? 'search-x' : 'radio'}>
          {search ? 'Ubah kata pencarian.' : 'Device yang dibuat melalui API akan muncul di sini.'}
        </EmptyState>
      ) : (
        <Table columns={kolomDevice} rows={filteredDevices} />
      )}
    </div>
  );

  const panelTipe = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-2">Satuan berisi satu sensor. Paket berisi minimal dua sensor. Sensor terkunci setelah tipe dipakai device.</p>
        {iotApi.canWrite && <Button icon="plus" onClick={openNewType}>Tambah tipe</Button>}
      </div>
      {deviceTypes.length === 0
        ? <EmptyState title="Belum ada tipe IoT" icon="package">Buat tipe setelah tersedia jenis sensor.</EmptyState>
        : <Table columns={kolomTipe} rows={deviceTypes.map(type => ({ ...type, id: type.id || type.code }))} />}
    </div>
  );

  const panelSensor = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-2">Ambang default berlaku jika tidak ada ambang khusus area.</p>
        {iotApi.canWrite && <Button icon="plus" onClick={openNewSensor}>Tambah jenis sensor</Button>}
      </div>
      {sensorTypes.length === 0
        ? <EmptyState title="Belum ada jenis sensor" icon="radio">Jenis sensor dapat ditambahkan melalui API.</EmptyState>
        : <Table columns={kolomSensor} rows={sensorTypes.map(sensor => ({ ...sensor, id: sensor.code }))} />}
    </div>
  );

  const tabs = [
    { id: 'device', label: 'Device', count: devices.length, content: panelDevice },
    { id: 'type', label: 'Tipe IoT', count: deviceTypes.length, content: panelTipe },
    { id: 'sensor', label: 'Jenis sensor', count: sensorTypes.length, content: panelSensor },
  ];

  return (
    <div className="iot-touch-targets min-w-0">
      <KepalaKelolaIot sample={data?.label === 'Data contoh'} />
      <div className="flex min-w-0 flex-col gap-4">
        {actionError && <Alert tone="bad">{actionError}</Alert>}
        {notice && <Alert tone="ok">{notice}</Alert>}
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Bagian Kelola IoT" />
      </div>

      <Modal open={deviceOpen} onClose={() => setDeviceOpen(false)} title={deviceEditing ? `Ubah device ${deviceEditing.code}` : 'Tambah device'} wide>
        <form onSubmit={submitDevice} className="space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {!deviceEditing && <Field label="Tipe IoT">
              <Select value={deviceForm.typeCode} onChange={value => setDeviceForm(current => ({ ...current, typeCode: value }))} placeholder="Pilih tipe" options={deviceTypes.filter(type => type.active).map(type => ({ value: type.code, label: `${type.code} · ${type.name}` }))} required />
            </Field>}
            <Field label="Nama device">
              <Input value={deviceForm.name} onChange={value => setDeviceForm(current => ({ ...current, name: value }))} placeholder="Nama device" maxLength={100} required />
            </Field>
            <Field label="AreaRef" hint="Tidak ada pilihan area dari API. Isi nilai areaRef manual atau biarkan kosong.">
              <Input value={deviceForm.areaRef} onChange={value => setDeviceForm(current => ({ ...current, areaRef: value }))} placeholder="Kosongkan jika belum ditentukan" maxLength={100} />
            </Field>
            {deviceEditing && <Field label="Firmware">
              <Input value={deviceForm.firmware} onChange={value => setDeviceForm(current => ({ ...current, firmware: value }))} placeholder="Belum diatur" maxLength={32} />
            </Field>}
          </div>
          {!deviceEditing && <p className="text-sm text-text-2">Credential dan kode aktivasi akan tampil satu kali setelah device dibuat.</p>}
          {!deviceEditing && !deviceTypes.some(type => type.active) && <div className={KOTAK_INFO}><p className="text-sm text-text-2">Belum ada tipe aktif. Buat tipe IoT terlebih dahulu.</p><Button variant="secondary" onClick={() => { setDeviceOpen(false); setTab('type'); }}>Buka tab Tipe IoT</Button></div>}
          {actionError && deviceOpen && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeviceOpen(false)}>Batal</Button>
            <Button type="submit" icon="save" disabled={busy || (!deviceEditing && !deviceTypes.some(type => type.active))}>{busy ? 'Menyimpan...' : deviceEditing ? 'Simpan perubahan' : 'Buat device'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(labelConfirmation)}
        onClose={cancelLabelConfirmation}
        title="Buat label QR"
      >
        {labelConfirmation && <div className="space-y-4">
          <p className="text-text-2">
            Kode aktivasi lama untuk <strong className="text-text">{labelConfirmation.code}</strong> langsung tidak berlaku. Kode baru berlaku 24 jam.
          </p>
          {actionError && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={cancelLabelConfirmation}>Batal</Button>
            <Button icon="refresh-cw" disabled={busy} onClick={confirmLabelRenewal}>Terbitkan kode baru</Button>
          </div>
        </div>}
      </Modal>

      <Modal
        open={Boolean(rotationConfirmation)}
        onClose={cancelRotationConfirmation}
        title="Rotasi credential device"
        closeDisabled={rotationBusy}
        returnFocusRef={rotationTriggerRef}
      >
        {rotationConfirmation && <div className="space-y-4">
          <p className="text-text-2">
            Credential lama untuk <strong className="text-text">{rotationConfirmation.code}</strong> langsung tidak berlaku setelah rotasi. Perangkat harus diprovisioning ulang dengan credential baru.
          </p>
          {rotationBusy && <RotationBusyState />}
          {rotationError && <p role="alert" className={GALAT}>{rotationError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="lg" variant="ghost" disabled={rotationBusy} onClick={cancelRotationConfirmation}>Batal</Button>
            <Button size="lg" variant="danger" icon="lock" disabled={rotationBusy} onClick={rotateCredential}>{rotationBusy ? 'Merotasi...' : 'Rotasi credential'}</Button>
          </div>
        </div>}
      </Modal>

      <Modal
        open={Boolean(rotationReveal)}
        onClose={closeRotationReveal}
        title={`Credential baru ${rotationReveal?.code || ''}`}
        closeDisabled={!credentialRevealCanClose({ credential: rotationReveal?.credential, copied: rotationCopied, saved: rotationSaved })}
        returnFocusRef={rotationTriggerRef}
      >
        {rotationReveal && <div className="space-y-4">
          <Alert tone="warn" title="Credential ini hanya tampil sekali.">
            Credential lama sudah tidak berlaku. Perangkat perlu diprovisioning ulang sebelum mengirim data.
          </Alert>
          <div>
            <label htmlFor="rotated-device-credential" className={LABEL_KOLOM}>Credential device</label>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Input id="rotated-device-credential" readOnly value={rotationReveal.credential} className="min-w-0 flex-1 font-num text-xs" />
              <Button size="lg" variant="secondary" icon={rotationCopied ? 'check' : 'copy'} onClick={() => copyText(rotationReveal.credential).then(() => { setRotationCopied(true); setRotationError(''); }).catch(error => setRotationError(error.message))}>
                {rotationCopied ? 'Tersalin' : 'Salin'}
              </Button>
            </div>
            <p role="status" aria-live="polite" className="sr-only">{rotationCopied ? 'Credential tersalin.' : ''}</p>
            {rotationReveal.credentialSince && <p className="mt-1 text-sm text-text-2">Berlaku sejak {new Date(rotationReveal.credentialSince).toLocaleString('id-ID')}.</p>}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={rotationSaved} onChange={event => setRotationSaved(event.target.checked)} className={KONTROL_PILIH} />
            Sudah saya simpan di tempat aman
          </label>
          {rotationError && <p role="alert" className={GALAT}>{rotationError}</p>}
          <div className="flex justify-end">
            <Button size="lg" disabled={!credentialRevealCanClose({ credential: rotationReveal.credential, copied: rotationCopied, saved: rotationSaved })} onClick={closeRotationReveal}>
              {credentialRevealCanClose({ credential: rotationReveal.credential, copied: rotationCopied, saved: rotationSaved }) ? 'Tutup' : 'Salin atau tandai sudah disimpan'}
            </Button>
          </div>
        </div>}
      </Modal>

      <Modal
        open={Boolean(provision)}
        onClose={closeProvision}
        title={labelView ? 'Label QR' : provision?.credential ? `Device ${provision.code} dibuat` : `Kode aktivasi ${provision?.code || ''}`}
        wide
        closeDisabled={Boolean(hasUnsavedProvision)}
      >
        {provision && (labelView ? (
          <div className="space-y-4">
            <div className="iot-qr-print mx-auto flex max-w-lg flex-col items-center gap-3 rounded-card border border-border p-5 text-center">
              {(labelUrls.svg || labelUrls.png)
                ? <span className="qr-plate inline-block rounded-control border border-border p-2"><img className="h-48 w-48 object-contain" src={labelUrls.svg || labelUrls.png} alt={`Kode QR aktivasi device ${provision.code}`} /></span>
                : <p role="status" className="text-sm text-text-2">Buat file SVG atau PNG untuk menampilkan label.</p>}
              <div>
                <p className="font-num text-lg font-semibold text-text">{provision.code}</p>
                <p className="text-sm text-text-2">{provision.name}</p>
                <p className="text-sm font-semibold text-text">Scan untuk klaim</p>
                <p className="text-sm text-text-2">JagoFarm</p>
              </div>
            </div>
            {provision.expiresAt && <p className="text-sm text-text-2">Kode berlaku sampai {new Date(provision.expiresAt).toLocaleString('id-ID')}.</p>}
            {actionError && <p role="alert" className={GALAT}>{actionError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {labelUrls.svg ? <a data-ui="button" className={kelasTombol({ variant: 'secondary', tautan: true })} href={labelUrls.svg} download={`${provision.code}.svg`}>Unduh SVG</a> : <Button variant="ghost" icon="image" disabled={busy} onClick={() => generateLabel('svg')}>Buat label SVG</Button>}
              {labelUrls.png ? <a data-ui="button" className={kelasTombol({ variant: 'secondary', tautan: true })} href={labelUrls.png} download={`${provision.code}.png`}>Unduh PNG</a> : <Button variant="ghost" icon="image" disabled={busy} onClick={() => generateLabel('png')}>Buat label PNG</Button>}
              <Button variant="ghost" icon="printer" onClick={() => window.print()}>Cetak label</Button>
              <Button variant="secondary" onClick={() => setLabelView(false)}>Kembali</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert tone="warn" title="Hanya tampil sekali.">Credential dan kode aktivasi hanya tampil sekali. Simpan sebelum menutup jendela ini.</Alert>
            <div>
              <label htmlFor="provision-device-id" className={LABEL_KOLOM}>ID device</label>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Input id="provision-device-id" readOnly value={provision.deviceId} className="min-w-0 flex-1 font-num text-xs" />
                <Button variant="secondary" icon={copied.deviceId ? 'check' : 'copy'} onClick={() => copySecret('deviceId', provision.deviceId)}>{copied.deviceId ? 'Tersalin' : 'Salin'}</Button>
              </div>
              <p className="mt-1 text-sm text-text-2">Isi kolom "ID device" di portal alat dengan nilai ini. ID ini bukan rahasia dan tetap terlihat di tabel device.</p>
            </div>
            {provision.credential && <div>
              <label htmlFor="provision-credential" className={LABEL_KOLOM}>Credential device</label>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Input id="provision-credential" readOnly value={provision.credential} className="min-w-0 flex-1 font-num text-xs" />
                <Button variant="secondary" icon={copied.credential ? 'check' : 'copy'} onClick={() => copySecret('credential', provision.credential)}>{copied.credential ? 'Tersalin' : 'Salin'}</Button>
              </div>
            </div>}
            <div>
              <label htmlFor="provision-activation" className={LABEL_KOLOM}>Kode aktivasi</label>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Input id="provision-activation" readOnly value={provision.activationCode} className="min-w-0 flex-1 font-num text-xs" />
                <Button variant="secondary" icon={copied.activation ? 'check' : 'copy'} onClick={() => copySecret('activation', provision.activationCode)}>{copied.activation ? 'Tersalin' : 'Salin'}</Button>
              </div>
              <p className="mt-1 text-sm text-text-2">Kode aktivasi berlaku 24 jam.</p>
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={provisionSaved} onChange={event => setProvisionSaved(event.target.checked)} className={KONTROL_PILIH} />
              Sudah saya simpan di tempat aman
            </label>
            {actionError && <p role="alert" className={GALAT}>{actionError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" icon="qr-code" disabled={busy} onClick={() => { setActionError(''); setLabelView(true); }}>Lihat label QR</Button>
              <Button disabled={Boolean(hasUnsavedProvision)} onClick={closeProvision}>{hasUnsavedProvision ? 'Simpan kode atau beri tanda dulu' : 'Tutup'}</Button>
            </div>
          </div>
        ))}
      </Modal>

      <Modal open={Boolean(calibrationDevice)} onClose={() => setCalibrationDevice(null)} title="Catat kalibrasi">
        {calibrationDevice && <div className="space-y-4">
          <p className="text-text-2">Catat waktu sekarang sebagai kalibrasi terakhir untuk <strong className="text-text">{calibrationDevice.code}</strong>.</p>
          {actionError && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCalibrationDevice(null)}>Batal</Button>
            <Button icon="wrench" disabled={busy} onClick={recordCalibration}>Catat kalibrasi</Button>
          </div>
        </div>}
      </Modal>

      <Modal open={typeOpen} onClose={() => setTypeOpen(false)} title={typeEditing ? `Ubah tipe ${typeEditing.code}` : 'Tambah tipe IoT'} wide>
        <form onSubmit={submitType} className="space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {!typeEditing && <Field label="Kode tipe"><Input value={typeForm.code} onChange={value => setTypeForm(current => ({ ...current, code: value.toUpperCase() }))} placeholder="AQ-PH" pattern={DEVICE_TYPE_CODE_PATTERN} maxLength={32} required /></Field>}
            <Field label="Nama tipe"><Input value={typeForm.name} onChange={value => setTypeForm(current => ({ ...current, name: value }))} maxLength={100} required /></Field>
            {!typeEditing && <fieldset className="min-w-0">
              <legend className={LABEL_KOLOM}>Jenis tipe</legend>
              <div className="flex min-h-10 flex-wrap items-center gap-4">
                {['satuan', 'paket'].map(kind => <label key={kind} className="inline-flex items-center gap-2 text-sm text-text"><input type="radio" name="iot-type-kind" value={kind} checked={typeForm.kind === kind} onChange={() => setTypeForm(current => ({ ...current, kind, sensors: kind === 'satuan' ? current.sensors.slice(0, 1) : current.sensors }))} className={KONTROL_PILIH} />{kind === 'satuan' ? 'Satuan' : 'Paket'}</label>)}
              </div>
            </fieldset>}
            <Field label="Deskripsi"><Input value={typeForm.description} onChange={value => setTypeForm(current => ({ ...current, description: value }))} maxLength={500} /></Field>
          </div>
          {!typeEditing && sensorTypes.length === 0 && <div className={KOTAK_INFO}><p className="text-sm text-text-2">Belum ada jenis sensor. Tambahkan sensor terlebih dahulu.</p><Button variant="secondary" onClick={() => { setTypeOpen(false); setTab('sensor'); }}>Buka tab Jenis sensor</Button></div>}
          {typeEditing && devices.some(device => device.type?.code === typeEditing.code) ? (
            <p className="rounded-card border border-border bg-surface-2 px-3 py-2 text-sm text-text-2">Sensor tidak dapat diubah setelah tipe dipakai device.</p>
          ) : (
            <fieldset className="space-y-2">
              <legend className={LABEL_KOLOM}>{typeForm.kind === 'satuan' ? 'Pilih satu sensor' : 'Pilih sensor paket'}</legend>
              {sensorTypes.length === 0 ? <p className="text-sm text-text-2">Belum ada jenis sensor yang dapat dipilih.</p> : typeForm.kind === 'satuan' ? (
                <Field label="Jenis sensor"><Select value={typeForm.sensors[0]?.code || ''} onChange={code => {
                  const sensor = sensorTypes.find(item => item.code === code);
                  setTypeForm(current => ({ ...current, sensors: sensor ? [{ code, label: sensor.name }] : [] }));
                }} placeholder="Pilih sensor" options={sensorTypes.map(sensor => ({ value: sensor.code, label: `${sensor.name} (${sensor.unit})` }))} required /></Field>
              ) : sensorTypes.map(sensor => {
                const selected = typeForm.sensors.some(item => item.code === sensor.code);
                const link = typeForm.sensors.find(item => item.code === sensor.code);
                return <div key={sensor.code} className="grid min-w-0 gap-2 rounded-card border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <label className="flex min-h-10 items-center gap-2 text-sm text-text"><input type="checkbox" checked={selected} onChange={() => toggleTypeSensor(sensor)} className={KONTROL_PILIH} />{sensor.name} ({sensor.unit})</label>
                  {selected && <Field label={`Label ${sensor.name}`}><Input value={link?.label || ''} onChange={value => setTypeForm(current => ({ ...current, sensors: current.sensors.map(item => item.code === sensor.code ? { ...item, label: value } : item) }))} maxLength={100} required /></Field>}
                </div>;
              })}
              {typeForm.kind === 'paket' && typeForm.sensors.length > 0 && typeForm.sensors.length < 2 && <p className="flex items-center gap-1.5 text-sm text-warn-fg"><IkonSlot icon="triangle-alert" size={16} />Paket butuh minimal 2 sensor.</p>}
            </fieldset>
          )}
          {actionError && typeOpen && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => setTypeOpen(false)}>Batal</Button><Button type="submit" icon="save" disabled={busy || (!typeEditing && sensorTypes.length === 0)}>{busy ? 'Menyimpan...' : typeEditing ? 'Simpan perubahan' : 'Buat tipe'}</Button></div>
        </form>
      </Modal>

      <Modal open={sensorOpen} onClose={() => setSensorOpen(false)} title={sensorEditing ? `Ubah jenis sensor ${sensorEditing.code}` : 'Tambah jenis sensor'} wide>
        <form onSubmit={submitSensor} className="space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {!sensorEditing && <Field label="Kode sensor"><Input value={sensorForm.code} onChange={value => setSensorForm(current => ({ ...current, code: value.toLowerCase().replace(/\s/g, '_') }))} pattern="[a-z][a-z0-9_]{1,31}" maxLength={32} required /></Field>}
            <Field label="Nama sensor"><Input value={sensorForm.name} onChange={value => setSensorForm(current => ({ ...current, name: value }))} maxLength={100} required /></Field>
            {!sensorEditing && <Field label="Satuan"><Input value={sensorForm.unit} onChange={value => setSensorForm(current => ({ ...current, unit: value }))} maxLength={24} required /></Field>}
            {!sensorEditing && <Field label="Nilai minimum"><NumberInput value={sensorForm.min} onChange={value => setSensorForm(current => ({ ...current, min: value }))} step="any" required /></Field>}
            {!sensorEditing && <Field label="Nilai maksimum"><NumberInput value={sensorForm.max} onChange={value => setSensorForm(current => ({ ...current, max: value }))} step="any" required /></Field>}
            <Field label="Jumlah desimal"><NumberInput value={sensorForm.decimals} onChange={value => setSensorForm(current => ({ ...current, decimals: value }))} min="0" max="4" step="1" required /></Field>
            <Field label="Ambang bawah default"><NumberInput value={sensorForm.warnLow} onChange={value => setSensorForm(current => ({ ...current, warnLow: value }))} step="any" /></Field>
            <Field label="Ambang atas default"><NumberInput value={sensorForm.warnHigh} onChange={value => setSensorForm(current => ({ ...current, warnHigh: value }))} step="any" /></Field>
          </div>
          {sensorEditing && <p className="text-sm text-text-2">Rentang valid dan satuan tidak dapat diubah melalui route yang tersedia.</p>}
          {actionError && sensorOpen && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => setSensorOpen(false)}>Batal</Button><Button type="submit" icon="save" disabled={busy}>{busy ? 'Menyimpan...' : sensorEditing ? 'Simpan perubahan' : 'Buat jenis sensor'}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(sensorDelete)} onClose={() => setSensorDelete(null)} title="Hapus jenis sensor">
        {sensorDelete && <div className="space-y-4">
          <p className="text-text-2">Hapus jenis sensor <strong className="text-text">{sensorDelete.name}</strong>? Tindakan ini hanya tersedia jika sensor belum dipakai tipe IoT.</p>
          {actionError && <p role="alert" className={GALAT}>{actionError}</p>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSensorDelete(null)}>Batal</Button><Button variant="danger" icon="trash-2" disabled={busy} onClick={deleteSensor}>Hapus jenis sensor</Button></div>
        </div>}
      </Modal>
    </div>
  );
}
