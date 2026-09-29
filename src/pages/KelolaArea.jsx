import { Link } from 'react-router-dom';
import { formatRupiah, useSmart } from '../store/SmartStore';
import { Badge, Card, Empty, SectionTitle, StatCard, Table } from '../components/ui';

const TYPE_LABEL = { kolam: 'Kolam Ikan', growbed: 'Growbed Sayur', tandon: 'Tandon Nutrisi' };
const TYPE_TONE = { kolam: 'info', growbed: 'ok', tandon: 'brand' };

export default function KelolaArea() {
  const { areasSaya, devicesByArea, hppTotal, monitoring, harvests, kematian, kematianArea, totalKematianHariIni } = useSmart();
  const areas = areasSaya;

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const totalPopulasi = areas.reduce((sum, a) => sum + Number(a.population || 0), 0);
  const totalVolume = areas.reduce((sum, a) => sum + Number(a.volume || 0), 0);
  const matiHariIni = totalKematianHariIni();
  const listKematian = [...(kematian || [])].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  // Tabel "pemantauan terbaru" hanya boleh memuat catatan dari AREA YANG DIAMPU.
  // Semua catatan bukan berarti boleh dilihat: operator lain punya catatannya
  // sendiri, dan sebelumnya isinya bocor ke halaman ini.
  const idAreaSaya = new Set(areas.map((a) => a.id));
  const monitoringSaya = monitoring.filter((m) => idAreaSaya.has(m.areaId));
  const kematianSaya = listKematian.filter((k) => idAreaSaya.has(k.areaId));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Area Produksi" value={areas.length} icon="water" hint="Kolam, growbed & tandon" />
        <StatCard label="Populasi Tercatat" value={totalPopulasi.toLocaleString('id-ID')} icon="set_meal" hint="Ikan & lubang tanam" />
        <StatCard label="Volume Air" value={totalVolume.toLocaleString('id-ID')} unit="L" icon="opacity" hint="Kapasitas total sistem" />
        <StatCard label="Total HPP" value={formatRupiah(totalHpp)} icon="payments" hint="Akumulasi biaya tercatat" />
      </div>

      {matiHariIni > 0 && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-600/10 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600">heart_broken</span>
          <div className="text-sm">
            <p className="font-bold text-on-surface">
              {matiHariIni.toLocaleString('id-ID')} ekor ikan dilaporkan mati hari ini
            </p>
            <p className="text-on-surface-variant text-[12px] mt-0.5">
              Buka kolam bersangkutan untuk memperbarui jumlahnya. Satu kolam dicatat satu kali per hari.
            </p>
          </div>
        </div>
      )}

      <Card>
        <SectionTitle
          eyebrow="Kelola Area"
          title="Area aquaponik Anda"
          subtitle="Klik area untuk mengisi item HPP (harga pokok produksi) dan mencatat pemantauan harian kolam."
        />
        {areas.length === 0 ? (
          <Empty title="Belum ada area" hint="Hubungi pengelola untuk mendaftarkan kolam atau growbed." icon="water" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
            {/* Tiga kolom (dulu empat) supaya kolom lebih lebar dan nama area serta
                lokasinya tidak terpotong elipsis padahal kartu masih punya ruang.
                items-stretch: kartu dalam satu baris sama tinggi. */}
            {areas.map((area) => {
              const { total, perUnit } = hppTotal(area.id);
              const areaDevices = devicesByArea(area.id);
              const notes = monitoring.filter((m) => m.areaId === area.id).length;
              const mati = kematianArea(area.id).reduce((sum, k) => sum + Number(k.jumlah || 0), 0);
              return (
                <Link key={area.id} to={`/area/${area.id}`} className="glass-card rounded-2xl p-4 min-w-0 hover:shadow-glass-elevated transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge tone={TYPE_TONE[area.type]}>{TYPE_LABEL[area.type]}</Badge>
                      <h3 className="mt-2 text-lg font-bold text-on-surface truncate">{area.name}</h3>
                      <p className="text-[11px] text-on-surface-variant truncate">{area.location}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary shrink-0">arrow_forward</span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {/* Komoditas memakai baris penuh: di lebar 841px kolom kartu
                        hanya 93px, sedangkan "Kangkung & Pakcoy" butuh 125px,
                        sehingga dulu terpotong elipsis padahal ruangnya ada. */}
                    <div className="col-span-2">
                      <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Komoditas</dt>
                      <dd className="font-semibold text-on-surface truncate">{area.commodity}</dd>
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
                    {/* flex-wrap + min-w-0: nominal rupiah yang panjang tidak lagi
                        meluber keluar kartu di kolom sempit, melainkan turun baris. */}
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
                      <span className="font-bold text-primary flex items-center gap-1 min-w-0">
                        <span className="material-symbols-outlined text-[16px] shrink-0">payments</span> HPP tercatat
                      </span>
                      <span className="font-extrabold text-on-surface tabular-nums">{formatRupiah(total)}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      {perUnit
                        ? `${formatRupiah(perUnit)} per ${area.populationUnit} · ${area.hpp.length} item biaya`
                        : `${area.hpp.length} item biaya · isi populasi untuk hitung per unit`}
                    </p>
                  </div>

                  <p className="mt-3 text-[11px] text-on-surface-variant">
                    {notes} catatan pemantauan · {harvests.filter((h) => h.areaId === area.id).length} catatan panen
                    {area.type === 'kolam' && (
                      <span className={mati > 0 ? 'text-amber-600 font-semibold' : ''}>
                        {' '}· {mati > 0 ? `${mati} ekor mati hari ini` : 'belum ada laporan kematian'}
                      </span>
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow="Pemantauan Terbaru" title="Catatan harian semua area" />
        {monitoringSaya.length === 0 ? (
          <Empty title="Belum ada catatan" hint="Buka salah satu area untuk mencatat pemantauan." icon="history" />
        ) : (
          <Table head={['Waktu', 'Area', 'pH', 'Suhu', 'TDS', 'Catatan']}>
            {monitoringSaya.slice(0, 8).map((note) => (
              <tr key={note.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">{note.at}</td>
                <td className="px-3 py-2 font-semibold text-on-surface">{note.areaName}</td>
                <td className="px-3 py-2">{note.ph ?? '·'}</td>
                <td className="px-3 py-2">{note.temp ?? '·'}</td>
                <td className="px-3 py-2">{note.tds ?? '·'}</td>
                <td className="px-3 py-2 text-on-surface-variant">{note.note || '·'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {kematianSaya.length > 0 && (
        <Card>
          <SectionTitle
            eyebrow="Kematian Ikan"
            title="Laporan ikan mati hari ini"
            subtitle="Diisi manual per kolam. Mengubah angka di hari yang sama akan memperbarui baris, bukan menambah."
          />
          <Table head={['Kolam', 'Tanggal', 'Jumlah', 'Dicatat oleh', 'Catatan']}>
            {kematianSaya.map((k) => (
              <tr key={k.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 font-semibold text-on-surface">{k.areaName}</td>
                <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{k.tanggal}</td>
                <td className="px-3 py-2 font-bold text-amber-600">{k.jumlah} ekor</td>
                <td className="px-3 py-2 text-on-surface-variant">{k.by || '·'}</td>
                <td className="px-3 py-2 text-on-surface-variant">{k.catatan || '·'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
