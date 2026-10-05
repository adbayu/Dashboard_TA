import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QrScanner from '../components/QrScanner';
import { iotApi, parseIotInput } from '../services/iotApi.js';
import { Badge, Button, Card, Empty, Field, Input, SectionTitle } from '../components/ui';

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
    <div className="space-y-5 min-w-0">
      <Card>
        <SectionTitle
          eyebrow="Detail Information"
          title="Pindai atau masukkan kode alat"
          subtitle="Pratinjau publik hanya menampilkan identitas dasar alat dan status klaim. QR yang memuat tautan klaim akan membuka halaman klaim."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            icon="qr_code_scanner"
            variant={isScanning ? 'ghost' : 'primary'}
            onClick={() => setIsScanning(value => !value)}
            aria-expanded={isScanning}
          >
            {isScanning ? 'Tutup pemindai' : 'Pindai QR alat'}
          </Button>
          <Link to="/iot" className="inline-flex">
            <Button variant="ghost" icon="sensors">Lihat perangkat saya</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Pemindai QR"
          title={isScanning ? 'Arahkan kamera ke kode QR' : 'Masukkan kode alat'}
          subtitle="Kamera tidak didukung di semua browser. Kode alat bisa dimasukkan secara manual."
        />
        {isScanning && <QrScanner onHasil={lookup} onBatal={() => setIsScanning(false)} />}
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
          <Button type="submit" icon="search" disabled={isLoading} className="w-full sm:w-auto">
            Cari perangkat
          </Button>
        </form>
      </Card>

      {isLoading && <Card><p className="text-sm text-on-surface-variant" role="status">Memuat pratinjau perangkat...</p></Card>}

      {error && (
        <Card>
          <div role="alert" className="space-y-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
              <span>{error}</span>
            </p>
            {lastCode && <Button variant="ghost" icon="refresh" onClick={retry}>Coba lagi</Button>}
          </div>
        </Card>
      )}

      {preview && (
        <Card>
          {preview.label && <p className="mb-3 text-xs font-bold text-on-surface-variant">{preview.label}</p>}
          <SectionTitle eyebrow="Pratinjau publik" title={preview.device.name} />
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl panel-inset p-3">
              <dt className="text-xs text-on-surface-variant">Kode alat</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-on-surface break-all">{preview.device.code}</dd>
            </div>
            <div className="min-w-0 rounded-xl panel-inset p-3">
              <dt className="text-xs text-on-surface-variant">Tipe</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface break-words">
                {preview.device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {preview.device.type?.code || 'Tidak tersedia'}
              </dd>
            </div>
            <div className="min-w-0 rounded-xl panel-inset p-3">
              <dt className="text-xs text-on-surface-variant">Status klaim</dt>
              <dd className="mt-2">
                <Badge tone={preview.device.claimed ? 'muted' : 'info'} icon={preview.device.claimed ? 'lock' : 'hourglass_top'}>
                  {preview.device.claimed ? 'Sudah diklaim' : 'Belum diklaim'}
                </Badge>
              </dd>
            </div>
            <div className="min-w-0 rounded-xl panel-inset p-3">
              <dt className="text-xs text-on-surface-variant">Validitas kode aktivasi</dt>
              <dd className="mt-2">
                <Badge tone={preview.device.activationValid ? 'ok' : 'warn'} icon={preview.device.activationValid ? 'check_circle' : 'schedule'}>
                  {preview.device.activationValid ? 'Berlaku' : 'Tidak diperiksa tanpa QR aktivasi'}
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-on-surface">Sensor yang tersedia</h3>
            {preview.device.sensors.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {preview.device.sensors.map(sensor => (
                  <li key={sensor.code}>
                    <Badge icon="sensors">{sensor.name || sensor.label || sensor.code}{sensor.unit ? ` (${sensor.unit})` : ''}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-on-surface-variant">Informasi sensor belum tersedia.</p>}
          </div>
          {preview.source === 'local' && <p className="mt-4 text-xs text-on-surface-variant">Data contoh. Perubahan demo hanya berlaku selama sesi ini.</p>}
        </Card>
      )}

      {!isLoading && !error && !preview && !isScanning && (
        <Card>
          <Empty title="Belum ada alat yang dicari" hint="Pindai QR atau masukkan kode alat untuk memuat pratinjau publik." icon="qr_code_scanner" />
        </Card>
      )}
    </div>
  );
}
