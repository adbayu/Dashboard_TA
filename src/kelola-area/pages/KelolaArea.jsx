import { formatRupiah, METRIC_META, useSmart } from '../../shared/store/SmartStore';
import { Alert, Card, EmptyState, PageHeader, StatusPill, Table, Tautan } from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { areaTone } from '../model/areaTone.js';
import { formatNilaiSensor, ikonJenisArea, labelJenisArea, ringkasStatusAlat } from '../model/areaTampil.js';

const angkaId = (nilai) => Number(nilai || 0).toLocaleString('id-ID');

/**
 * Kartu satu area: identitas, angka pokok, status alat, HPP, dan tautan ke
 * detail. Warna area datang dari `areaTone(area.type)` lewat `data-area` Card.
 */
export function KartuArea({ area, total = 0, perUnit = 0, jumlahAlat = 0, statusAlat = [], catatan = 0, panen = 0, mati = 0 }) {
  const jumlahItem = area.hpp?.length || 0;
  return (
    <Card
      area={areaTone(area.type)}
      className="flex flex-col"
      title={(
        <span className="flex items-center gap-2">
          <span data-ui="area-icon" className="inline-flex shrink-0 items-center">
            <IkonSlot icon={ikonJenisArea(area.type)} size={20} />
          </span>
          {area.name}
        </span>
      )}
      subtitle={`${labelJenisArea(area.type)} · ${area.location}`}
    >
      <div className="flex flex-1 flex-col gap-3">
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-4 gap-y-2">
          <div className="min-w-0">
            <dt className="text-sm text-text-2">Komoditas</dt>
            <dd className="m-0 font-semibold">{area.commodity}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-text-2">Populasi</dt>
            <dd className="m-0 font-semibold">{angkaId(area.population)} {area.populationUnit}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-text-2">Volume</dt>
            <dd className="m-0 font-semibold">{angkaId(area.volume)} {area.unit}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-text-2">Alat IoT</dt>
            <dd className="m-0 font-semibold">{jumlahAlat} unit</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-y border-border py-2.5">
          <span className="text-sm text-text-2">Status alat</span>
          {statusAlat.map((s) => (
            <StatusPill key={s.text} tone={s.tone} icon={s.icon}>{s.text}</StatusPill>
          ))}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-semibold">HPP tercatat</span>
          <span className="font-num text-lg font-semibold tabular-nums">{formatRupiah(total)}</span>
        </div>
        <p className="-mt-1.5 text-sm text-text-2">
          {perUnit
            ? `${formatRupiah(perUnit)} per ${area.populationUnit} · ${jumlahItem} item biaya`
            : `${jumlahItem} item biaya · isi populasi untuk hitung per unit`}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-2">
            {catatan} catatan pemantauan · {panen} catatan panen
            {area.type === 'kolam' && (
              <>
                {' '}·{' '}
                {mati > 0
                  ? <StatusPill tone="warn" icon="triangle-alert">{mati} ekor mati hari ini</StatusPill>
                  : 'belum ada laporan kematian'}
              </>
            )}
          </span>
          <Tautan to={`/area/${area.id}`} aria-label={`Buka area ${area.name}`}>Buka area</Tautan>
        </div>
      </div>
    </Card>
  );
}

export default function KelolaArea() {
  const { areasSaya, devicesByArea, hppTotal, monitoring, harvests, kematian, kematianArea, totalKematianHariIni } = useSmart();
  const areas = areasSaya;

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const matiHariIni = totalKematianHariIni();
  const listKematian = [...(kematian || [])].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  // Tabel "pemantauan terbaru" hanya boleh memuat catatan dari AREA YANG DIAMPU.
  // Semua catatan bukan berarti boleh dilihat: operator lain punya catatannya
  // sendiri, dan sebelumnya isinya bocor ke halaman ini.
  const idAreaSaya = new Set(areas.map((a) => a.id));
  const monitoringSaya = monitoring.filter((m) => idAreaSaya.has(m.areaId));
  const kematianSaya = listKematian.filter((k) => idAreaSaya.has(k.areaId));
  // Catatan contoh tidak membawa `areaName`; nama dicari dari areanya.
  const namaArea = (catatan) => catatan.areaName || areas.find((a) => a.id === catatan.areaId)?.name || '·';
  const areaKematian = areas.filter((a) => kematianArea(a.id).length > 0).map((a) => a.name);

  const ringkasan = areas.length > 0
    ? `Buka area untuk mengisi item HPP dan mencatat pemantauan harian kolam. ${areas.length} area, total HPP tercatat ${formatRupiah(totalHpp)}.`
    : 'Buka area untuk mengisi item HPP dan mencatat pemantauan harian kolam.';

  return (
    <div>
      <PageHeader title="Area & kolam" subtitle={ringkasan} />

      <div className="flex flex-col gap-6">
        {matiHariIni > 0 && (
          <Alert
            tone="warn"
            icon="heart-crack"
            title={`${matiHariIni.toLocaleString('id-ID')} ekor ikan dilaporkan mati hari ini.`}
            meta={areaKematian.length > 0 ? areaKematian.join(', ') : null}
          >
            Buka kolam bersangkutan untuk memperbarui jumlahnya. Satu kolam dicatat satu kali per hari.
          </Alert>
        )}

        {areas.length === 0 ? (
          <EmptyState title="Belum ada area" icon="waves">
            Hubungi pengelola untuk mendaftarkan kolam atau growbed.
          </EmptyState>
        ) : (
          // items-stretch: kartu dalam satu baris sama tinggi. Dua kolom dari
          // 460 px supaya nama area, lokasi, dan komoditas tidak terpotong.
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-stretch gap-5">
            {areas.map((area) => {
              const { total, perUnit } = hppTotal(area.id);
              const areaDevices = devicesByArea(area.id);
              return (
                <KartuArea
                  key={area.id}
                  area={area}
                  total={total}
                  perUnit={perUnit}
                  jumlahAlat={areaDevices.length}
                  statusAlat={ringkasStatusAlat(areaDevices)}
                  catatan={monitoring.filter((m) => m.areaId === area.id).length}
                  panen={harvests.filter((h) => h.areaId === area.id).length}
                  mati={kematianArea(area.id).reduce((sum, k) => sum + Number(k.jumlah || 0), 0)}
                />
              );
            })}
          </div>
        )}

        <Card title="Catatan harian semua area" subtitle="Pemantauan terbaru dari area yang Anda ampu.">
          {monitoringSaya.length === 0 ? (
            <EmptyState title="Belum ada catatan" icon="history">
              Buka salah satu area untuk mencatat pemantauan.
            </EmptyState>
          ) : (
            <Table
              columns={[
                { key: 'at', label: 'Waktu' },
                { key: 'area', label: 'Area' },
                { key: 'ph', label: 'pH', align: 'end', num: true },
                { key: 'temp', label: 'Suhu', align: 'end', num: true },
                { key: 'tds', label: 'TDS', align: 'end', num: true },
                { key: 'note', label: 'Catatan' },
              ]}
              rows={monitoringSaya.slice(0, 8).map((note) => ({
                id: note.id,
                at: note.at,
                area: namaArea(note),
                ph: formatNilaiSensor(note.ph, METRIC_META.ph.precision),
                temp: formatNilaiSensor(note.temp, METRIC_META.temp.precision),
                tds: formatNilaiSensor(note.tds, METRIC_META.tds.precision),
                note: note.note || '·',
              }))}
            />
          )}
        </Card>

        {kematianSaya.length > 0 && (
          <Card
            title="Laporan ikan mati hari ini"
            subtitle="Diisi manual per kolam. Mengubah angka di hari yang sama akan memperbarui baris, bukan menambah."
          >
            <Table
              columns={[
                { key: 'area', label: 'Kolam' },
                { key: 'tanggal', label: 'Tanggal' },
                { key: 'jumlah', label: 'Jumlah', align: 'end', num: true },
                { key: 'oleh', label: 'Dicatat oleh' },
                { key: 'catatan', label: 'Catatan' },
              ]}
              rows={kematianSaya.map((k) => ({
                id: k.id,
                area: namaArea(k),
                tanggal: k.tanggal,
                jumlah: `${k.jumlah} ekor`,
                oleh: k.by || '·',
                catatan: k.catatan || '·',
              }))}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
