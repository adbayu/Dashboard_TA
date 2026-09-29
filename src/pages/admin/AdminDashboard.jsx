import { Link } from 'react-router-dom';
import { formatRupiah, useSmart } from '../../store/SmartStore';
import { Badge, Card, Empty, SectionTitle, StatCard, Table, STATUS_LABEL, STATUS_TONE } from '../../components/ui';

export default function AdminDashboard() {
  const { devices, areas, users, categories, pet, pointRules, badges, activeAlerts, hppTotal, leaderboard, kematian, totalKematianHariIni } = useSmart();

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const orphan = devices.filter((d) => !d.areaId);
  const activeRules = pointRules.filter((r) => r.active).length;
  const hariIni = new Date().toLocaleDateString('en-CA');
  const kematianHariIni = (kematian || []).filter((k) => k.tanggal === hariIni);

  const shortcut = [
    { to: '/admin/pengguna', label: 'Kelola User', icon: 'group', desc: `${users.length} akun terdaftar`, tone: 'brand' },
    { to: '/admin/iot', label: 'Kelola IoT', icon: 'devices', desc: `${devices.length} perangkat · ${orphan.length} belum ditempatkan`, tone: 'info' },
    { to: '/admin/kategori', label: 'Kategori Device', icon: 'category', desc: `${categories.length} kategori alat`, tone: 'ok' },
    { to: '/admin/area', label: 'Kelola Area', icon: 'water', desc: `${areas.length} area kolam/growbed`, tone: 'warn' },
    { to: '/admin/v-pet', label: 'Kelola Virtual Pet', icon: 'pets', desc: `${pet.name} · level ${pet.level}`, tone: 'muted' },
    { to: '/admin/point', label: 'Sistem Point', icon: 'stars', desc: `${activeRules} aturan aktif · ${badges.length} badge`, tone: 'brand' },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <SectionTitle
          eyebrow="Mode Pengelola"
          title="Ringkasan pengelolaan sistem aquaponik"
          subtitle="Kelola pengguna, perangkat IoT beserta QR penjelasannya, kategori alat, area yang sudah dipasangi sensor, virtual pet, dan sistem poin."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <StatCard label="Pengguna" value={users.length} icon="group" hint={`${users.filter((u) => u.status === 'aktif').length} aktif`} />
          <StatCard label="Perangkat IoT" value={devices.length} icon="devices" hint={`${devices.filter((d) => d.status === 'online').length} terhubung`} />
          <StatCard label="Area Terpasang IoT" value={areas.filter((a) => a.deviceIds.length > 0).length} unit={`/ ${areas.length}`} icon="water" hint="Kolam & growbed" />
          <StatCard label="Ikan Mati Hari Ini" value={totalKematianHariIni()} unit="ekor" icon="heart_broken" tone={totalKematianHariIni() > 0 ? 'warn' : 'ok'} hint="Dilaporkan pengguna" />
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          Nilai HPP sistem: <strong className="text-on-surface">{formatRupiah(totalHpp)}</strong>, akumulasi biaya yang dicatat pengguna.
        </p>
      </Card>

      <Card>
        <SectionTitle eyebrow="Pintasan" title="Menu pengelolaan" subtitle="Setiap menu mengelola bagian berbeda dari sistem." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcut.map((item) => (
            <Link key={item.to} to={item.to} className="glass-card rounded-2xl p-4 hover:shadow-glass-elevated transition-all group">
              <div className="flex items-start justify-between">
                <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                </span>
                <span className="material-symbols-outlined text-outline group-hover:text-primary">arrow_forward</span>
              </div>
              <p className="mt-3 font-bold text-on-surface">{item.label}</p>
              <p className="text-[11px] text-on-surface-variant">{item.desc}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            eyebrow="Kondisi Perangkat"
            title="Unit yang butuh tindakan"
            action={
              <Link to="/admin/iot" className="text-sm font-bold text-primary hover:underline">
                Kelola IoT
              </Link>
            }
          />
          {activeAlerts.length === 0 ? (
            <Empty title="Semua perangkat sehat" hint="Tidak ada unit offline, perawatan, atau peringatan." icon="verified" />
          ) : (
            <Table head={['Kode', 'Perangkat', 'Status', 'Baterai']}>
              {activeAlerts.map((device) => (
                <tr key={device.id} className="hover:bg-primary/5">
                  <td className="px-3 py-2 font-mono text-xs text-on-surface-variant">{device.code}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-on-surface">{device.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {areas.find((a) => a.id === device.areaId)?.name || 'Belum ditempatkan'}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[device.status]}>{STATUS_LABEL[device.status]}</Badge>
                  </td>
                  <td className={`px-3 py-2 font-semibold ${device.battery < 40 ? 'text-red-600' : 'text-on-surface-variant'}`}>
                    {device.battery}%
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <SectionTitle
            eyebrow="Catatan Ikan Mati"
            title="Laporan kematian hari ini"
            subtitle="Diisi manual oleh pengguna dari menu Kelola Area."
            action={
              <Link to="/admin/area" className="text-sm font-bold text-primary hover:underline">
                Kelola Area
              </Link>
            }
          />
          {kematianHariIni.length === 0 ? (
            <Empty title="Tidak ada laporan kematian" hint="Belum ada pengguna yang mencatat ikan mati hari ini." icon="verified" />
          ) : (
            <Table head={['Kolam', 'Jumlah', 'Catatan']}>
              {kematianHariIni.map((row) => (
                <tr key={row.id} className="hover:bg-primary/5">
                  <td className="px-3 py-2 font-semibold text-on-surface">
                    {areas.find((a) => a.id === row.areaId)?.name || row.areaId}
                  </td>
                  <td className="px-3 py-2 font-bold text-on-surface">{row.jumlah} ekor</td>
                  <td className="px-3 py-2 text-on-surface-variant">{row.catatan || '·'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <SectionTitle
            eyebrow="Poin Pengguna"
            title="Peringkat akun pengguna"
            action={
              <Link to="/admin/point" className="text-sm font-bold text-primary hover:underline">
                Sistem Point
              </Link>
            }
          />
          {leaderboard.length === 0 ? (
            <Empty title="Belum ada saldo poin" icon="leaderboard" />
          ) : (
            <Table head={['Pengguna', 'Area', 'Poin', 'Akun']}>
              {[...leaderboard]
                .sort((a, b) => b.points - a.points)
                .map((row) => {
                  const user = users.find((u) => u.id === row.id);
                  return (
                    <tr key={row.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 font-semibold text-on-surface">{row.name}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{row.area}</td>
                      <td className="px-3 py-2 font-bold text-primary">{row.points.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2">
                        <Badge tone={user?.status === 'aktif' ? 'ok' : 'muted'}>{user?.status || 'terdaftar'}</Badge>
                      </td>
                    </tr>
                  );
                })}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
