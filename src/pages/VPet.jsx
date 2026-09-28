import { ambangUntuk, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, SectionTitle, Table, Select } from '../components/ui';

export default function VPet() {
  const { pet, feedPet, playPet, cleanPet, healPet, decayPet, areasSaya, applyPetToArea, devices, categoryOf } = useSmart();
  const areas = areasSaya;

  const status = [
    { key: 'hunger', label: 'Kenyang', value: pet.hunger, icon: 'restaurant', low: 'Lapar — beri pakan' },
    { key: 'happiness', label: 'Kebahagiaan', value: pet.happiness, icon: 'mood', low: 'Murung — ajak bermain' },
    { key: 'hygiene', label: 'Kebersihan', value: pet.hygiene, icon: 'shower', low: 'Kotor — bersihkan kolam' },
    { key: 'health', label: 'Kesehatan', value: pet.health, icon: 'favorite', low: 'Lemah — butuh perawatan' },
  ];

  const area = areas.find((a) => a.id === pet.appliedToAreaId);
  const areaDevices = devices.filter((d) => d.areaId === pet.appliedToAreaId);
  // Ambang memakai helper bersama: sebelumnya halaman ini menyimpan angka
  // sendiri (pH 6,5–7,5 / suhu 25–29 / TDS 400–900) sehingga penilaian kondisi
  // air pet bisa berbeda dari dashboard dan statistik harian.
  const waterQuality = () =>
    areaDevices
      .filter((d) => METRIC_META[d.metric?.key])
      .map((d) => {
        const ambang = ambangUntuk(area, categoryOf(d.categoryId), d.metric.key);
        return {
          key: d.metric.key,
          label: METRIC_META[d.metric.key].label.replace(' Air', ''),
          unit: METRIC_META[d.metric.key].unit,
          value: d.metric.value,
          ambang,
          ok: nilaiTerhadapAmbang(d.metric.value, ambang) === 'dalam',
        };
      });
  const readings = waterQuality();
  const avgHealth = Math.round(status.reduce((sum, row) => sum + row.value, 0) / status.length);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr,2fr]">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent text-center">
          <SectionTitle eyebrow="Virtual Pet" title={pet.name} subtitle={`${pet.species} · Level ${pet.level} · Tahap ${pet.stage}`} />
          <div className="my-4 flex justify-center">
            <div className="relative w-40 h-40 rounded-full panel-inset border-4 border-primary/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '76px' }}>
                {pet.species?.toLowerCase().includes('lele') ? 'phishing' : 'set_meal'}
              </span>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary text-white text-[11px] font-bold px-3 py-1 shadow-emerald-glow">
                Level {pet.level}
              </span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant">
            Kondisi rata-rata: <strong className="text-on-surface">{avgHealth}%</strong>
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-on-surface-variant">Progres ke level {pet.level + 1}</span>
              <span className="text-on-surface">
                {pet.xp}/{pet.xpNext} xp
              </span>
            </div>
            <Bar value={pet.xp} max={pet.xpNext} />
          </div>
          <p className="mt-3 text-[11px] text-on-surface-variant">
            {pet.lastFed ? `Terakhir diberi pakan: ${pet.lastFed}` : 'Pet belum diberi pakan hari ini.'}
          </p>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Perawatan" title="Rawat pet Anda" subtitle="Setiap tindakan perawatan memberi +10 point dan menambah pengalaman pet." />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <Button icon="restaurant" onClick={feedPet} className="justify-center">Beri pakan</Button>
              <Button icon="sports_esports" variant="soft" onClick={playPet} className="justify-center">Ajak main</Button>
              <Button icon="cleaning_services" variant="soft" onClick={cleanPet} className="justify-center">Bersihkan</Button>
              <Button icon="healing" variant="ghost" onClick={healPet} className="justify-center">Rawat</Button>
            </div>
            <div className="space-y-3">
              {status.map((row) => (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px]">{row.icon}</span>
                      {row.label}
                    </span>
                    <span className={row.value < 40 ? 'text-red-600 font-bold' : 'text-on-surface'}>{row.value}%</span>
                  </div>
                  <Bar value={row.value} tone={row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand'} />
                  {row.value < 40 && <p className="text-[11px] text-red-600 mt-1">{row.low}</p>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" icon="schedule" onClick={decayPet}>Lewati waktu (uji penurunan)</Button>
              <p className="text-[11px] text-on-surface-variant">
                Tombol ini mensimulasikan beberapa jam berlalu, seperti sistem tanpa perawatan.
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle
              eyebrow="Pemantauan Farm"
              title="Kualitas air area pet"
              subtitle="Kesehatan pet mengikuti kualitas air area yang ditautkan."
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,240px),1fr] sm:items-start">
              <div className="grid grid-cols-3 gap-3 sm:order-2">
                {readings.length === 0 ? (
                  <p className="col-span-3 text-sm text-on-surface-variant">Belum ada sensor air di area ini.</p>
                ) : (
                  readings.map((read) => (
                    <div key={read.key} className="rounded-xl border border-outline-variant/40 p-3 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{read.label}</p>
                      <p className="text-lg font-extrabold text-on-surface">
                        {read.value} <small className="text-[11px] font-semibold text-on-surface-variant">{read.unit}</small>
                      </p>
                      <Badge tone={read.ok ? 'ok' : 'warn'}>{read.ok ? 'Aman' : 'Cek'}</Badge>
                      {read.ambang && (
                        <p className="text-[10px] text-outline mt-1">
                          Ideal {read.ambang[0]}–{read.ambang[1]}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
              {/* Pemilih area diletakkan SEJAJAR dengan kartu metrik (order-2 di
                  atas), bukan di bawahnya. Sebelumnya ia jatuh sebagai satu-satunya
                  elemen baris kedua sehingga tampak "menempel" di bawah kartu. */}
              <div className="sm:order-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Area pemantauan
                </p>
                <Select
                  value={pet.appliedToAreaId || ''}
                  onChange={applyPetToArea}
                  placeholder="Pilih area pemantauan…"
                  options={areas.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-2">
              Area aktif: <strong className="text-on-surface">{area?.name || 'belum dipilih'}</strong>
            </p>
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle eyebrow="Riwayat Perawatan" title="Jurnal virtual pet" />
        {pet.log.length === 0 ? (
          <Empty title="Belum ada aktivitas" icon="pets" hint="Mulai dengan memberi pakan virtual pet." />
        ) : (
          <Table head={['Waktu', 'Aktivitas', 'Perubahan']}>
            {pet.log.map((row) => (
              <tr key={row.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">{row.at}</td>
                <td className="px-3 py-2 text-on-surface">{row.text}</td>
                <td className="px-3 py-2 font-semibold text-primary">{row.delta}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
