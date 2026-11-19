import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from '../components/QrScanner';
import { iotApi, parseIotInput } from '../../services/iotApi.js';
import { Alert, Badge, Button, Card, Empty, Field, Input, PageHeader, TautanTombol } from '../../shared/components/ui';
import PublicAreaLabel from '../../components/iot/PublicAreaLabel.jsx';

export default function DetailInformation() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const lookup = useCallback(async value => {
    const parsed = parseIotInput(value);
    setIsScanning(false);
    setInput(value.trim());
    setError('');
    setPreview(null);
    setLastCode('');

    if (parsed.kind === 'empty') {
      setError('Isi QR kosong. Pindai ulang atau masukkan kode alat.');
      return;
    }
    if (parsed.kind === 'claim') {
      navigate(parsed.path);
      return;
    }
    if (parsed.kind === 'invalid') {
      setError('Tautan QR tidak dikenal. Gunakan tautan klaim atau kode alat.');
      return;
    }

    setLastCode(parsed.code);
    setIsLoading(true);
    try {
      const result = await iotApi.getQrPreview(parsed.code);
      setPreview(result);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const retry = () => {
    if (lastCode) void lookup(lastCode);
  };

  return (
    <div className="iot-touch-targets min-w-0">
      <PageHeader
        title="Pindai QR alat"
        subtitle="Pindai label QR atau masukkan kode alat. Pratinjau hanya menampilkan identitas dasar alat dan status klaim."
        actions={<TautanTombol to="/iot" variant="secondary" icon="radio">Lihat alat saya</TautanTombol>}
      />

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <Card
          title={isScanning ? 'Arahkan kamera ke QR pada alat' : 'Masukkan kode alat'}
          subtitle="QR yang memuat tautan klaim akan membuka halaman klaim. Kamera tidak didukung di semua browser, jadi kode alat juga bisa diketik."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              icon={isScanning ? 'x' : 'scan-qr-code'}
              variant={isScanning ? 'secondary' : 'primary'}
              onClick={() => setIsScanning(value => !value)}
              aria-expanded={isScanning}
            >
              {isScanning ? 'Tutup pemindai' : 'Pindai QR alat'}
            </Button>
          </div>
          {isScanning && <div className="mt-4"><QrScanner onHasil={lookup} onBatal={() => setIsScanning(false)} /></div>}
          <form
            onSubmit={event => {
              event.preventDefault();
              void lookup(input);
            }}
            className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr),auto] sm:items-end"
          >
            <Field label="Tautan QR atau kode alat">
              <Input value={input} onChange={setInput} placeholder="AQ-PKT-001" autoComplete="off" />
            </Field>
            <Button type="submit" variant="secondary" icon="search" disabled={isLoading} className="w-full sm:w-auto">
              Cari perangkat
            </Button>
          </form>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {isLoading && <Card><p className="text-sm text-text-2" role="status">Memuat pratinjau perangkat...</p></Card>}

          {error && (
            <Alert
              tone="bad"
              action={lastCode && <Button variant="secondary" size="sm" icon="refresh-cw" onClick={retry}>Coba lagi</Button>}
            >
              {error}
            </Alert>
          )}

          {preview && (
            <Card title={preview.device.name} subtitle="Pratinjau publik">
              {preview.label && <p className="mb-3 text-sm text-text-2">{preview.label}</p>}
              <PublicAreaLabel areaRef={preview.device.areaRef} />
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-control bg-surface-2 p-3">
                  <dt className="text-sm text-text-2">Kode alat</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-semibold text-text">{preview.device.code}</dd>
                </div>
                <div className="min-w-0 rounded-control bg-surface-2 p-3">
                  <dt className="text-sm text-text-2">Tipe</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-text">
                    {preview.device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {preview.device.type?.code || 'Tidak tersedia'}
                  </dd>
                </div>
                <div className="min-w-0 rounded-control bg-surface-2 p-3">
                  <dt className="text-sm text-text-2">Status klaim</dt>
                  <dd className="mt-2">
                    <Badge tone={preview.device.claimed ? 'muted' : 'info'} icon={preview.device.claimed ? 'lock' : 'hourglass'}>
                      {preview.device.claimed ? 'Sudah diklaim' : 'Belum diklaim'}
                    </Badge>
                  </dd>
                </div>
                <div className="min-w-0 rounded-control bg-surface-2 p-3 sm:col-span-2">
                  <dt className="text-sm text-text-2">Validitas kode aktivasi</dt>
                  <dd className="mt-2">
                    <Badge tone={preview.device.activationValid ? 'ok' : 'warn'} icon={preview.device.activationValid ? 'circle-check' : 'clock'}>
                      {preview.device.activationValid ? 'Berlaku' : 'Tidak diperiksa tanpa QR aktivasi'}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-text">Sensor yang tersedia</h3>
                {preview.device.sensors.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {preview.device.sensors.map(sensor => (
                      <li key={sensor.code}>
                        <Badge icon="activity">{sensor.name || sensor.label || sensor.code}{sensor.unit ? ` (${sensor.unit})` : ''}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-text-2">Informasi sensor belum tersedia.</p>}
              </div>
              {preview.source === 'local' && <p className="mt-4 text-sm text-text-2">Data contoh. Perubahan demo hanya berlaku selama sesi ini.</p>}
            </Card>
          )}

          {!isLoading && !error && !preview && !isScanning && (
            <Empty title="Belum ada alat yang dicari" hint="Pindai QR atau masukkan kode alat untuk memuat pratinjau publik." icon="qr-code" />
          )}
        </div>
      </div>
    </div>
  );
}
