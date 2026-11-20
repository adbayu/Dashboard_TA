import { ambangSah, ambangUntuk, formatRupiah, METRIC_KEYS, nilaiMetrik, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { EmptyState, PageHeader, StatusPill, Table, Tautan, TautanTombol } from '../../shared/components/ui';
import { daftarTindakan } from '../model/daftarTindakan.js';
import { pillStatusAkun } from '../../kelola-user/model/statusAkun.js';

const tanggalHariIni = () =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

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
    // null/'' berarti belum ada data, bukan 0 (nilaiMetrik mengembalikan null).
    .filter((d) => d.status === 'online' && d.metric && METRIC_KEYS.includes(d.metric.key) && nilaiMetrik(d.metric) !== null)
    .map((device) => {
      const area = areas.find((a) => a.id === device.areaId);
      const mentah = ambangUntuk(area, categories.find((c) => c.id === device.categoryId), device.metric.key);
      const ambang = ambangSah(mentah) ? mentah : null;
      const value = nilaiMetrik(device.metric);
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
