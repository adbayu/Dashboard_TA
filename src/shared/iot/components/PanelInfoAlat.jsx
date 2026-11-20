import { ambangUntuk, ambilKodeAlat, METRIC_META, nilaiTerhadapAmbang } from '../../store/SmartStore';
import { formatRentangAmbang } from '../../../utils/iotPresentation.js';
import AksiQr from '../../qr/components/AksiQr';
import QrCode from '../../qr/components/QrCode';
import { Badge, Card, Table, TautanTombol, STATUS_LABEL, STATUS_TONE } from '../../components/ui';
import { Icon } from '../../components/Icon.jsx';
import SensorReading from '../../../components/iot/SensorReading.jsx';

// Panel penjelasan alat hasil pemindaian QR — dipakai BERSAMA oleh role pengguna
// (/detail-informasi) dan role pengelola (/admin/detail-informasi).
//
// Kenapa satu komponen: sebelumnya penjelasan alat ada DUA tempat dengan isi
// berbeda — halaman pengguna menjelaskan semuanya, sementara modal "QR alat" di
// Kelola IoT hanya menampilkan nama/kategori/fungsi. Akibatnya penjelasan yang
// dibaca pengelola tidak sama dengan yang dibaca pengguna. Semua penjelasan
// sekarang berbunyi dari sini, jadi menyunting teks di satu tempat cukup.
//
// Sumber penjelasan = DATA (kategori + perangkat), bukan teks mati: kalau
// pengelola mengubah fungsi/kategori/ambang alat, penjelasan ikut berubah.

// oxlint-disable-next-line react/only-export-components -- Shared QR labels stay beside their existing consumer.
export const LABEL_BENTUK = {
  url: 'Tautan halaman perangkat',
  'kode-ringkas': 'Kode ringkas JagoFarm',
  'kode-alat': 'Kode alat',
  kosong: 'Kosong',
  'url-tak-dikenal': 'Tautan tidak dikenali',
};

const CARA_LABEL = { id: 'ID perangkat', kode: 'kode alat', nama: 'nama perangkat' };

// Arti tiap status — dipakai tabel "Arti Status".
const ARTI_STATUS = {
  online: 'Mengirim data normal. Tidak perlu tindakan.',
  warning: 'Nilai menyimpang atau baterai lemah. Periksa probe dan daya.',
  maintenance: 'Sedang dikalibrasi/dibersihkan. Data sementara tidak dipakai.',
  offline: 'Tidak terhubung. Cek kabel, daya, dan jangkauan sinyal.',
};

// Catatan perawatan dibedakan per jenis parameter, supaya pemilik alat pH tidak
// disuruh mengkalibrasi larutan TDS.
// oxlint-disable-next-line react/only-export-components -- Shared care notes stay beside their existing consumer.
export function catatanPerawatan(metricKey) {
  const umum = [
    'Bersihkan ujung probe dari biofilm seminggu sekali, karena lapisan ini penyebab utama angka melenceng.',
    'Periksa tanggal kalibrasi terakhir di kartu atas; lakukan bila sudah lebih dari 1 bulan.',
    'Amati tren harian di Dashboard: lonjakan mendadak lebih penting daripada satu angka.',
    'Laporkan ke pengelola bila status berubah ke "Perlu perhatian" atau "Tidak terhubung".',
  ];
  if (metricKey === 'ph') {
    return [
      ...umum.slice(0, 2),
      'Kalibrasi ulang pH dengan larutan buffer 4,0 dan 7,0 (dua titik) agar pembacaan tetap akurat.',
      ...umum.slice(2),
    ];
  }
  if (metricKey === 'temp') {
    return [
      ...umum.slice(0, 2),
      'Rendam probe suhu di air es + air hangat untuk memastikan selisihnya di bawah 0,5 °C.',
      ...umum.slice(2),
    ];
  }
  return [
    ...umum.slice(0, 2),
    'Kalibrasi TDS memakai larutan standar 707 ppm (atau 1413 ppm untuk rentang tinggi).',
    ...umum.slice(2),
  ];
}

// Penjelasan singkat per parameter: apa fungsinya, dan arti angkanya bagi kolam.
const ARTI_PARAMETER = {
  ph: 'Mengukur tingkat keasaman air. pH di luar ambang membuat ikan stres dan penyerapan nutrisi sayur terganggu.',
  temp: 'Mengukur suhu air. Suhu menentukan nafsu makan ikan serta kecepatan pertumbuhan akar dan daun.',
  tds: 'Mengukur kepekatan zat terlarut (nutrisi). Terlalu rendah membuat sayur kurang nutrisi, terlalu tinggi menumpuk racun.',
};

// Ikon status alat: status tidak pernah hanya warna.
const STATUS_ICON = { online: 'wifi', warning: 'triangle-alert', maintenance: 'wrench', offline: 'wifi-off' };
const POSISI_STATUS = { dalam: 'normal', atas: 'high', bawah: 'low' };

function StatusAlat({ status }) {
  return <Badge tone={STATUS_TONE[status]} icon={STATUS_ICON[status] || 'circle-help'}>{STATUS_LABEL[status] || 'Status tidak diketahui'}</Badge>;
}

export default function PanelInfoAlat({ device, cari, kategori, area, aksi }) {
  if (!device) return null;

  const ambang = ambangUntuk(area, kategori, device.metric?.key);
  const meta = METRIC_META[device.metric?.key];
  const ambangValid = Array.isArray(ambang) && Number.isFinite(Number(ambang[0])) && Number.isFinite(Number(ambang[1])) && Number(ambang[0]) < Number(ambang[1]);
  // null/'' berarti belum ada pembacaan; Number(null) akan menjadi 0.
  const mentah = device.metric?.value;
  const nilai = mentah == null || mentah === '' || !Number.isFinite(Number(mentah)) ? null : Number(mentah);
  // Ambang terbalik/rusak tidak dipakai menilai bawah/atas.
  const posisi = ambangValid ? nilaiTerhadapAmbang(nilai, ambang) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Dari mana alat ini dikenali — hanya saat datang dari hasil pemindaian */}
      {cari && (
        <Card title="Alat berhasil dikenali">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="ok" icon="circle-check">
              Cocok lewat {CARA_LABEL[cari.cara] || cari.cara}
            </Badge>
            <Badge tone="muted" icon="qr-code">Bentuk QR: {LABEL_BENTUK[cari.bentuk] || cari.bentuk}</Badge>
            <StatusAlat status={device.status} />
            <span className="break-all text-text-2">
              Isi QR: <span className="font-mono text-text">{cari.mentah}</span>
            </span>
          </div>
        </Card>
      )}

      {/* Penjelasan utama alat */}
      <Card
        title={device.name}
        subtitle={`${kategori?.name || 'Perangkat IoT'} · kode alat ${device.code} · model ${device.model} · firmware ${device.firmware}`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" icon="map-pin">
              {area ? area.name : 'Belum ditempatkan'}
            </Badge>
            <Badge tone={device.battery < 40 ? 'bad' : 'ok'} icon="battery-full">
              Baterai {device.battery}%
            </Badge>
          </div>
        )}
      >
        <p className="max-w-2xl text-sm text-text-2">{device.description}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Apa yang dikerjakan alat ini">
          <ul className="flex flex-col gap-2">
            {(device.functions || []).map((fn) => (
              <li key={fn} className="flex items-start gap-2 text-sm text-text">
                <Icon name="circle-check" className="mt-0.5 shrink-0 text-ok-fg" />
                {fn}
              </li>
            ))}
          </ul>
          {kategori?.description && (
            <p className="mt-3 rounded-control bg-surface-2 p-3 text-sm text-text-2">
              <strong className="text-text">Jenis perangkat:</strong> {kategori.description}
            </p>
          )}
        </Card>

        <Card title="Yang dibaca dan ambang idealnya" subtitle="Nilai yang tampil di dashboard dibandingkan dengan ambang ini.">
          <Table head={['Parameter', 'Satuan', 'Ambang ideal']}>
            {(kategori?.metrics || []).map((m) => {
              const dipakai = m.key === device.metric?.key;
              const batas = ambangUntuk(area, kategori, m.key);
              return (
                <tr key={m.key} className={dipakai ? 'bg-surface-2' : ''}>
                  <td className="px-3 py-2 font-semibold text-text">
                    {m.label}
                    {dipakai && (
                      <span className="ml-2 inline-flex align-middle">
                        <Badge tone="info" icon="activity">Dibaca alat ini</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-2">{m.unit}</td>
                  <td className="px-3 py-2 text-text-2">
                    {formatRentangAmbang(batas, m.unit, METRIC_META[m.key]?.precision)}
                  </td>
                </tr>
              );
            })}
          </Table>
          {area?.targets?.[device.metric?.key] && (
            <p className="mt-2 text-sm text-text-2">
              Untuk {area.name}, ambangnya diatur khusus oleh pengelola, bukan ambang bawaan kategori.
            </p>
          )}
          {ARTI_PARAMETER[device.metric?.key] && (
            <p className="mt-2 rounded-control bg-surface-2 p-3 text-sm text-text-2">
              <strong className="text-text">Artinya bagi kolam:</strong> {ARTI_PARAMETER[device.metric.key]}
            </p>
          )}
        </Card>
      </div>

      {/* Pembacaan saat ini */}
      <Card title="Nilai yang sedang dikirim alat" subtitle="Nilai bergerak otomatis tiap 5 detik (simulasi) selama perangkat berstatus terhubung.">
        <div className="grid items-stretch gap-3 sm:grid-cols-3">
          <SensorReading
            name={meta?.label || device.metric?.key}
            device={device.code}
            value={nilai}
            decimals={meta?.precision ?? 2}
            unit={meta?.unit}
            min={ambangValid ? Number(ambang[0]) : undefined}
            max={ambangValid ? Number(ambang[1]) : undefined}
            status={posisi === null ? 'no-range' : POSISI_STATUS[posisi]}
          />
          <div className="rounded-card bg-surface-2 p-4">
            <p className="text-sm font-semibold text-text-2">Rentang ideal</p>
            <p className="mt-1 font-num text-lg font-semibold tabular-nums text-text">
              {formatRentangAmbang(ambang, meta?.unit, meta?.precision)}
            </p>
            <p className="mt-2 text-sm text-text-2">
              Ditetapkan pengelola di Kategori Device / Kelola Area.
            </p>
          </div>
          <div className="rounded-card bg-surface-2 p-4">
            <p className="text-sm font-semibold text-text-2">Sinyal dan kalibrasi</p>
            <p className="mt-1 text-sm font-semibold text-text">{device.signal}</p>
            <p className="mt-1 text-sm text-text-2">
              Kalibrasi terakhir: <strong className="text-text">{device.lastCalibration}</strong>
            </p>
            <p className="text-sm text-text-2">
              Dipasang: <strong className="text-text">{device.installedAt}</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Arti status + perawatan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cara membaca kondisi alat">
          <Table head={['Status', 'Artinya']}>
            {Object.entries(STATUS_LABEL).map(([status]) => (
              <tr key={status} className={status === device.status ? 'bg-surface-2' : ''}>
                <td className="px-3 py-2">
                  <StatusAlat status={status} />
                </td>
                <td className="px-3 py-2 text-text-2">{ARTI_STATUS[status] || '·'}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Yang perlu dilakukan pemilik alat">
          <ul className="flex flex-col gap-2 text-sm text-text-2">
            {catatanPerawatan(device.metric?.key).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon name="chevron-right" className="mt-0.5 shrink-0 text-text-2" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-2">
            Tanggal kalibrasi dan status hanya bisa diubah pengelola lewat menu Kelola IoT.
          </p>
        </Card>
      </div>

      {/* Contoh QR + tautan halaman alat — aksi mengikuti role yang membuka */}
      <Card
        title="Label yang dipasang di perangkat"
        subtitle="QR ini bisa langsung dipindai dari halaman Detail Information, dan isinya sama dengan yang dicetak pengelola."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <QrCode value={ambilKodeAlat(device)} size={128} caption={device.code} />
          </div>
          <div className="min-w-0 flex-1 text-sm text-text-2">
            <p className="font-semibold text-text">Isi QR: {ambilKodeAlat(device)}</p>
            <p className="mt-1">
              Dipakai menu <strong className="text-text">Detail Information</strong> (role pengguna) dan tombol QR di{' '}
              <strong className="text-text">Kelola IoT</strong> (role pengelola): satu format untuk kedua role.
            </p>
            {/* Tombol unduh/salin/cetak ada di SATU komponen bersama, dipakai
                keempat pintu masuk QR, supaya tidak ada role yang tombolnya
                berbeda atau ketinggalan. */}
            <AksiQr
              value={ambilKodeAlat(device)}
              kode={device.code}
              nama={`${device.name}${area ? ` · ${area.name}` : ''}`}
              className="mt-3"
            />
          </div>
          {aksi && <div className="shrink-0">{aksi}</div>}
        </div>
      </Card>

      {/* Rujukan silang antar role */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-2">
            Penjelasan ini sama untuk pengguna dan pengelola. Pengguna membukanya lewat menu{' '}
            <strong className="text-text">Detail Information</strong>; pengelola lewat tombol QR di{' '}
            <strong className="text-text">Kelola IoT</strong>.
          </p>
          <TautanTombol to="/detail-informasi" variant="secondary" size="sm" icon="external-link">
            Buka sebagai pengguna
          </TautanTombol>
        </div>
      </Card>
    </div>
  );
}
