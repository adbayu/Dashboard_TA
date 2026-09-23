import { Link } from 'react-router-dom';
import { formatRupiah, useSmart } from '../store/SmartStore';
import { Badge, Card, Empty, SectionTitle, StatCard, Table } from '../components/ui';

const TYPE_LABEL = { kolam: 'Kolam Ikan', growbed: 'Growbed Sayur', tandon: 'Tandon Nutrisi' };
const TYPE_TONE = { kolam: 'info', growbed: 'ok', tandon: 'brand' };

export default function KelolaArea() {
  const { areas, devicesByArea, hppTotal, monitoring, harvests } = useSmart();

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const totalPopulasi = areas.reduce((sum, a) => sum + Number(a.population || 0), 0);
  const totalVolume = areas.reduce((sum, a) => sum + Number(a.volume || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Area Produksi" value={areas.length} icon="water" hint="Kolam, growbed & tandon" />
        <StatCard label="Populasi Tercatat" value={totalPopulasi.toLocaleString('id-ID')} icon="set_meal" hint="Ikan & lubang tanam" />
        <StatCard label="Volume Air" value={totalVolume.toLocaleString('id-ID')} unit="L" icon="opacity" hint="Kapasitas total sistem" />
        <StatCard label="Total HPP" value={formatRupiah(totalHpp)} icon="payments" hint="Akumulasi biaya tercatat" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kelola Area"
          title="Area aquaponik Anda"
          subtitle="Klik area untuk mengisi item HPP (harga pokok produksi) dan mencatat pemantauan harian kolam."
        />
        {areas.length === 0 ? (
          <Empty title="Belum ada area" hint="Hubungi pengelola untuk mendaftarkan kolam atau growbed." icon="water" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {areas.map((area) => {
              const { total, perUnit } = hppTotal(area.id);
              const areaDevices = devicesByArea(area.id);
              const notes = monitoring.filter((m) => m.areaId === area.id).length;
              return (
                <Link key={area.id} to={`/area/${area.id}`} className="glass-card rounded-2xl p-4 hover:shadow-glass-elevated transition-all groups">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge tone={TYPE_TONE[area.type]}>{TYPE_LABEL[area.type]}</Badge>
                      <h3 className="mt-2 text-lg font-bold text-on-surface">{area.name}</h3>
                      <p className="text-[11px] text-on-surface-variant">{area.location}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary">arrow_forward</span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Komoditas</dt>
                      <dd className="font-semibold text-on-surface">{area.commodity}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Populasi</dt>
                      <dd className="font-semibold text-on-surface">
                        {Number(area.population).toLocaleString('id-ID')} {area.populationUnit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Volume</dt>
                      <dd className="font-semibold text-on-surface">
                        {Number(area.volume).toLocaleString('id-ID')} {area.unit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Device IoT</dt>
                      <dd className="font-semibold text-on-surface">{areaDevices.length} unit</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-xl bg-primary/5 border border-primary/15 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">payments</span> HPP tercatat
                      </span>
                      <span className="font-extrabold text-on-surface">{formatRupiah(total)}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      {perUnit
                        ? `${formatRupiah(perUnit)} per ${area.populationUnit} · ${area.hpp.length} item biaya`
                        : `${area.hpp.length} item biaya · isi populasi untuk hitung per unit`}
                    </p>
                  </div>

                  <p className="mt-3 text-[11px] text-on-surface-variant">
                    {notes} catatan pemantauan · {harvests.filter((h) => h.areaId === area.id).length} catatan panen
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow="Pemantauan Terbaru" title="Catatan harian semua area" />
        {monitoring.length === 0 ? (
          <Empty title="Belum ada catatan" hint="Buka salah satu area untuk mencatat pemantauan." icon="history" />
        ) : (
          <Table head={['Waktu', 'Area', 'pH', 'DO', 'Suhu', 'EC', 'Catatan']}>
            {monitoring.slice(0, 8).map((note) => (
              <tr key={note.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">{note.at}</td>
                <td className="px-3 py-2 font-semibold text-on-surface">{note.areaName}</td>
                <td className="px-3 py-2">{note.ph ?? '—'}</td>
                <td className="px-3 py-2">{note.doVal ?? '—'}</td>
                <td className="px-3 py-2">{note.temp ?? '—'}</td>
                <td className="px-3 py-2">{note.ec ?? '—'}</td>
                <td className="px-3 py-2 text-on-surface-variant">{note.note || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
