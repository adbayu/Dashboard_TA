import { Link } from 'react-router-dom';
import { ambangUntuk, ambilKodeAlat, METRIC_META, nilaiTerhadapAmbang } from '../store/SmartStore';
import AksiQr from './AksiQr';
import QrCode from './QrCode';
import { Badge, Card, SectionTitle, Table, STATUS_LABEL, STATUS_TONE } from './ui';

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

export default function PanelInfoAlat({ device, cari, kategori, area, aksi }) {
  if (!device) return null;

  const ambang = ambangUntuk(area, kategori, device.metric?.key);
  const posisi = nilaiTerhadapAmbang(device.metric?.value, ambang);
  const meta = METRIC_META[device.metric?.key];

  return (
    <div className="space-y-4">
      {/* Dari mana alat ini dikenali — hanya saat datang dari hasil pemindaian */}
      {cari && (
        <Card>
          <SectionTitle eyebrow="Hasil Pemindaian" title="Alat berhasil dikenali" />
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone="ok" icon="check_circle">
              Cocok lewat {CARA_LABEL[cari.cara] || cari.cara}
            </Badge>
            <Badge tone="muted">Bentuk QR: {LABEL_BENTUK[cari.bentuk] || cari.bentuk}</Badge>
            <Badge tone={STATUS_TONE[device.status]}>{STATUS_LABEL[device.status]}</Badge>
            <span className="text-on-surface-variant break-all">
              Isi QR: <span className="font-mono text-on-surface">{cari.mentah}</span>
            </span>
          </div>
        </Card>
      )}

      {/* Penjelasan utama alat */}
      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">
              {kategori?.name || 'Perangkat IoT'}
            </p>
            <h2 className="text-2xl font-extrabold text-on-surface mt-0.5">{device.name}</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Kode alat <strong className="text-on-surface">{device.code}</strong> · model {device.model} · firmware {device.firmware}
            </p>
            <p className="text-sm text-on-surface-variant mt-3 max-w-2xl">{device.description}</p>
          </div>
          <div className="flex flex-col items-start gap-2 shrink-0">
            <Badge tone="info" icon="place">
              {area ? area.name : 'Belum ditempatkan'}
            </Badge>
            <Badge tone={device.battery < 40 ? 'bad' : 'ok'} icon="battery_full">
              Baterai {device.battery}%
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Fungsi Alat" title="Apa yang dikerjakan alat ini" />
          <ul className="space-y-2">
            {(device.functions || []).map((fn) => (
              <li key={fn} className="flex items-start gap-2 text-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span>
                {fn}
              </li>
            ))}
          </ul>
          {kategori?.description && (
            <p className="mt-3 rounded-xl panel-inset p-3 text-[12px] text-on-surface-variant">
              <strong className="text-on-surface">Jenis perangkat:</strong> {kategori.description}
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle
            eyebrow="Parameter Diukur"
            title="Yang dibaca & ambang idealnya"
            subtitle="Nilai yang tampil di dashboard dibandingkan dengan ambang ini."
          />
          <Table head={['Parameter', 'Satuan', 'Ambang ideal']}>
            {(kategori?.metrics || []).map((m) => {
              const dipakai = m.key === device.metric?.key;
              const batas = ambangUntuk(area, kategori, m.key);
              return (
                <tr key={m.key} className={dipakai ? 'bg-primary/5' : ''}>
                  <td className="px-3 py-2 font-semibold text-on-surface">
                    {m.label}
                    {dipakai && (
                      <Badge tone="brand" className="ml-2">
                        Dibaca alat ini
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">{m.unit}</td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {batas ? `${batas[0]} – ${batas[1]} ${m.unit}` : '·'}
                  </td>
                </tr>
              );
            })}
          </Table>
          {area?.targets?.[device.metric?.key] && (
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Untuk {area.name}, ambangnya diatur khusus oleh pengelola, bukan ambang bawaan kategori.
            </p>
          )}
          {ARTI_PARAMETER[device.metric?.key] && (
            <p className="mt-2 rounded-xl panel-inset p-3 text-[12px] text-on-surface-variant">
              <strong className="text-on-surface">Artinya bagi kolam:</strong> {ARTI_PARAMETER[device.metric.key]}
            </p>
          )}
        </Card>
      </div>

      {/* Pembacaan saat ini */}
      <Card>
        <SectionTitle
          eyebrow="Pembacaan Saat Ini"
          title="Nilai yang sedang dikirim alat"
          subtitle="Nilai bergerak otomatis tiap 5 detik (simulasi) selama perangkat berstatus terhubung."
        />
        <div className="grid gap-3 sm:grid-cols-3 items-stretch">
          <div className="rounded-2xl panel-inset p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              {meta?.label || device.metric?.key}
            </p>
            <p className="text-3xl font-extrabold text-on-surface mt-1">
              {device.metric?.value ?? '·'}{' '}
              <small className="text-xs font-semibold text-on-surface-variant">{meta?.unit}</small>
            </p>
            <Badge tone={posisi === null ? 'muted' : posisi === 'dalam' ? 'ok' : 'bad'} className="mt-2">
              {posisi === null
                ? 'Tanpa ambang'
                : posisi === 'dalam'
                  ? 'Dalam ambang ideal'
                  : posisi === 'atas'
                    ? 'Di atas ambang ideal'
                    : 'Di bawah ambang ideal'}
            </Badge>
          </div>
          <div className="rounded-2xl panel-inset p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Rentang ideal</p>
            <p className="text-lg font-extrabold text-on-surface mt-1">
              {ambang ? `${ambang[0]} – ${ambang[1]} ${meta?.unit || ''}` : '·'}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-2">
              Ditetapkan pengelola di Kategori Device / Kelola Area.
            </p>
          </div>
          <div className="rounded-2xl panel-inset p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Sinyal & kalibrasi</p>
            <p className="text-sm font-semibold text-on-surface mt-1">{device.signal}</p>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Kalibrasi terakhir: <strong className="text-on-surface">{device.lastCalibration}</strong>
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Dipasang: <strong className="text-on-surface">{device.installedAt}</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Arti status + perawatan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Arti Status" title="Cara membaca kondisi alat" />
          <Table head={['Status', 'Artinya']}>
            {Object.entries(STATUS_LABEL).map(([nilai, teks]) => (
              <tr key={nilai} className={nilai === device.status ? 'bg-primary/5' : ''}>
                <td className="px-3 py-2">
                  <Badge tone={STATUS_TONE[nilai]}>{teks}</Badge>
                </td>
                <td className="px-3 py-2 text-on-surface-variant">{ARTI_STATUS[nilai] || '·'}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <SectionTitle eyebrow="Perawatan" title="Yang perlu dilakukan pemilik alat" />
          <ul className="space-y-2 text-sm text-on-surface-variant">
            {catatanPerawatan(device.metric?.key).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">chevron_right</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-on-surface-variant">
            Tanggal kalibrasi & status hanya bisa diubah pengelola lewat menu Kelola IoT.
          </p>
        </Card>
      </div>

      {/* Contoh QR + tautan halaman alat — aksi mengikuti role yang membuka */}
      <Card>
        <SectionTitle
          eyebrow="Kode QR Alat"
          title="Label yang dipasang di perangkat"
          subtitle="QR ini bisa langsung dipindai dari halaman Detail Information, dan isinya sama dengan yang dicetak pengelola."
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <QrCode value={ambilKodeAlat(device)} size={128} caption={device.code} />
          </div>
          <div className="min-w-0 flex-1 text-[12px] text-on-surface-variant">
            <p className="font-bold text-on-surface">Isi QR: {ambilKodeAlat(device)}</p>
            <p className="mt-1">
              Dipakai menu <strong className="text-on-surface">Detail Information</strong> (role pengguna) dan tombol QR di{' '}
              <strong className="text-on-surface">Kelola IoT</strong> (role pengelola): satu format untuk kedua role.
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
          <p className="text-sm text-on-surface-variant">
            Penjelasan ini sama untuk pengguna dan pengelola. Pengguna membukanya lewat menu{' '}
            <strong className="text-on-surface">Detail Information</strong>; pengelola lewat tombol QR di{' '}
            <strong className="text-on-surface">Kelola IoT</strong>.
          </p>
          <Link to="/detail-informasi" className="inline-flex">
            <Badge tone="brand" icon="open_in_new">
              Buka sebagai pengguna
            </Badge>
          </Link>
        </div>
      </Card>
    </div>
  );
}
