import { ambangUntuk, formatRupiah, METRIC_KEYS, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { EmptyState, PageHeader, STATUS_LABEL, StatusPill, Table, Tautan, TautanTombol } from '../../shared/components/ui';
import { formatSensorNumber } from '../../utils/iotPresentation.js';
import { pillStatusAkun } from '../../kelola-user/model/statusAkun.js';

// Masalah alat menurut status: selalu teks + ikon, tidak pernah hanya warna.
const MASALAH_ALAT = {
  offline: { tone: 'bad', icon: 'wifi-off', saran: 'Cek daya, kabel, dan jangkauan sinyal.' },
  warning: { tone: 'warn', icon: 'triangle-alert', saran: 'Periksa pembacaan dan kondisi alat.' },
  maintenance: { tone: 'info', icon: 'wrench', saran: 'Selesaikan perawatan lalu aktifkan kembali.' },
};
const URUTAN_STATUS = ['offline', 'warning', 'maintenance'];

const tanggalHariIni = () =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/**
 * Daftar "Perlu ditangani": satu baris per masalah, urut dari yang paling
 * mendesak. Fungsi murni supaya urutan dan isinya bisa diuji tanpa store.
 * `luarBatas`: [{ device, area, key, value, ambang, posisi }] dari bacaan sensor.
 */
// oxlint-disable-next-line react/only-export-components -- Pure helper is tested beside its page.
export function daftarTindakan({ devices = [], areas = [], users = [], kematianHariIni = [], luarBatas = [] }) {
  const namaArea = (id) => areas.find((a) => a.id === id)?.name;
  const hasil = [];

  for (const status of URUTAN_STATUS) {
    for (const device of devices.filter((d) => d.status === status)) {
      const info = MASALAH_ALAT[status];
      const baterai = typeof device.battery === 'number' ? ` Baterai ${device.battery}%.` : '';
      hasil.push({
        id: `alat-${device.id}`,
        masalah: STATUS_LABEL[status],
        tone: info.tone,
        icon: info.icon,
        kode: device.code,
        judul: device.name,
        rincian: `${namaArea(device.areaId) || 'Belum ditempatkan'}.${baterai} ${info.saran}`,
        to: '/admin/iot',
        aksi: 'Periksa alat',
      });
    }
  }

  for (const b of luarBatas) {
    const meta = METRIC_META[b.key];
    const f = (n) => formatSensorNumber(n, meta.precision);
    hasil.push({
      id: `batas-${b.device.id}`,
      masalah: 'Di luar batas',
      tone: 'warn',
      icon: 'triangle-alert',
      judul: `${meta.label} ${b.area?.name || b.device.code} ${f(b.value)} ${meta.unit}`,
      rincian: `Batas area ${f(b.ambang[0])}–${f(b.ambang[1])} ${meta.unit}, nilai ${b.posisi === 'atas' ? 'di atas' : 'di bawah'} batas.`,
      to: '/monitoring',
      aksi: 'Lihat monitoring',
    });
  }

  for (const row of kematianHariIni) {
    hasil.push({
      id: `mati-${row.id}`,
      masalah: 'Ikan mati',
      tone: 'warn',
      icon: 'fish',
      judul: `${namaArea(row.areaId) || row.areaId}, ${row.jumlah} ekor hari ini`,
      rincian: row.catatan ? `Catatan pengguna: ${row.catatan}` : 'Dicatat manual oleh pengguna atau pengelola.',
      to: '/admin/area',
      aksi: 'Buka area',
    });
  }

  for (const device of devices.filter((d) => !d.areaId)) {
    hasil.push({
      id: `tanpa-area-${device.id}`,
      masalah: 'Belum ditempatkan',
      tone: 'info',
      icon: 'inbox',
      kode: device.code,
      judul: device.name,
      rincian: 'Alat sudah terdaftar tetapi belum dipasang ke area mana pun.',
      to: '/admin/area',
      aksi: 'Tempatkan ke area',
    });
  }

  for (const user of users.filter((u) => u.status === 'menunggu')) {
    hasil.push({
      id: `akun-${user.id}`,
      masalah: 'Menunggu persetujuan',
      tone: 'info',
      icon: 'clock',
      judul: `${user.name}, akun Pengelola`,
      rincian: `Mengajukan akun pada ${user.joinedAt}. Belum bisa masuk sebelum disetujui.`,
      to: '/admin/pengguna',
      aksi: 'Tinjau pengajuan',
    });
  }

  return hasil;
}

const KOLOM_TINDAKAN = [
  {
    key: 'masalah',
    label: 'Masalah',
    render: (row) => <StatusPill tone={row.tone} icon={row.icon}>{row.masalah}</StatusPill>,
  },
  {
    key: 'rincian',
    label: 'Rincian',
    render: (row) => (
      <div className="min-w-[14rem]">
        <p className="font-semibold">
          {row.kode && <span className="font-num text-sm">{row.kode} </span>}
          {row.judul}
        </p>
        <p className="mt-0.5 text-sm text-text-2">{row.rincian}</p>
      </div>
    ),
  },
  {
    key: 'aksi',
    label: 'Tindakan',
    align: 'end',
    render: (row) => <TautanTombol to={row.to} variant="secondary" size="sm">{row.aksi}</TautanTombol>,
  },
];

const KOLOM_PERINGKAT = [
  { key: 'name', label: 'Pengguna', render: (row) => <span className="font-semibold">{row.name}</span> },
  { key: 'area', label: 'Area', render: (row) => <span className="text-text-2">{row.area}</span> },
  { key: 'points', label: 'Poin', align: 'end', num: true, render: (row) => row.points.toLocaleString('id-ID') },
  {
    key: 'akun',
    label: 'Akun',
    render: (row) => {
      const pill = pillStatusAkun(row.status);
      return <StatusPill tone={pill.tone} icon={pill.icon}>{pill.text}</StatusPill>;
    },
  },
];

export default function AdminDashboard() {
  const { devices, areas, users, categories, pet, pets, pointRules, badges, hppTotal, leaderboard, kematian } = useSmart();

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const hariIni = new Date().toLocaleDateString('en-CA');
  const kematianHariIni = (kematian || []).filter((k) => k.tanggal === hariIni);

  // Bacaan yang keluar dari ambang memakai helper bersama store, sama dengan Pantauan.
  const luarBatas = devices
    // null/'' berarti belum ada data, bukan 0.
    .filter((d) => d.status === 'online' && d.metric && METRIC_KEYS.includes(d.metric.key)
      && d.metric.value !== null && d.metric.value !== '' && Number.isFinite(Number(d.metric.value)))
    .map((device) => {
      const area = areas.find((a) => a.id === device.areaId);
      const ambang = ambangUntuk(area, categories.find((c) => c.id === device.categoryId), device.metric.key);
      const value = Number(device.metric.value);
      return { device, area, key: device.metric.key, value, ambang, posisi: nilaiTerhadapAmbang(value, ambang) };
    })
    .filter((b) => b.posisi === 'atas' || b.posisi === 'bawah');

  const tindakan = daftarTindakan({ devices, areas, users, kematianHariIni, luarBatas });

  const menunggu = users.filter((u) => u.status === 'menunggu').length;
  const aktif = users.filter((u) => u.status === 'aktif').length;
  const online = devices.filter((d) => d.status === 'online').length;
  const totalParameter = categories.reduce((n, c) => n + (c.metrics?.length || 0), 0);
  const areaBerAlat = areas.filter((a) => a.deviceIds?.length > 0).length;
  const aturanAktif = pointRules.filter((r) => r.active).length;

  const menu = [
    { to: '/admin/pengguna', label: 'Pengguna', desc: `${users.length} akun · ${menunggu ? `${menunggu} menunggu persetujuan` : `${aktif} aktif`}` },
    { to: '/admin/iot', label: 'Alat IoT', desc: `${devices.length} alat · ${online} terhubung` },
    { to: '/admin/detail-informasi', label: 'Detail informasi', desc: 'Penjelasan alat yang dibaca pengguna' },
    { to: '/admin/kategori', label: 'Kategori alat', desc: `${categories.length} kategori · ${totalParameter} parameter` },
    { to: '/admin/area', label: 'Area', desc: `${areas.length} area · ${areaBerAlat} sudah dipasangi alat · HPP ${formatRupiah(totalHpp)}` },
    { to: '/admin/v-pet', label: 'V-Pet', desc: `${(pets || []).length} pet farm · ${pet.name} level ${pet.level}` },
    { to: '/admin/point', label: 'Sistem poin', desc: `${aturanAktif} dari ${pointRules.length} aturan aktif · ${badges.length} badge` },
  ];

  const peringkat = [...leaderboard]
    .sort((a, b) => b.points - a.points)
    .map((row) => ({ ...row, status: users.find((u) => u.id === row.id)?.status }));

  return (
    <div>
      <PageHeader
        title="Perlu ditangani hari ini"
        subtitle={`${tanggalHariIni()} · ${tindakan.length ? `${tindakan.length} hal menunggu tindakan` : 'tidak ada yang menunggu tindakan'}`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="tindakan-judul" className="flex min-w-0 flex-col gap-3">
            <h2 id="tindakan-judul" className="font-head text-base font-bold leading-[22px] text-text">Daftar tindakan</h2>
            {tindakan.length === 0 ? (
              <EmptyState title="Tidak ada yang perlu ditangani" icon="circle-check">
                Semua alat terhubung, bacaan dalam batas, tidak ada laporan ikan mati, dan tidak ada pengajuan akun.
              </EmptyState>
            ) : (
              <Table columns={KOLOM_TINDAKAN} rows={tindakan} />
            )}
          </section>

          <section aria-labelledby="peringkat-judul" className="flex min-w-0 flex-col gap-3">
            <h2 id="peringkat-judul" className="font-head text-base font-bold leading-[22px] text-text">Peringkat poin pengguna</h2>
            {peringkat.length === 0 ? (
              <EmptyState title="Belum ada saldo poin" icon="trophy" />
            ) : (
              <Table columns={KOLOM_PERINGKAT} rows={peringkat} />
            )}
          </section>
        </div>

        <section aria-labelledby="menu-judul" className="flex min-w-0 flex-col gap-1">
          <h2 id="menu-judul" className="font-head text-base font-bold leading-[22px] text-text">Menu pengelolaan</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {menu.map((item) => (
              <li key={item.to} className="flex flex-col gap-0.5 border-t border-border py-2.5 first:border-t-0">
                <span><Tautan to={item.to}>{item.label}</Tautan></span>
                <span className="text-sm text-text-2">{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
