import { useSmart } from '../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, SectionTitle, Table } from '../components/ui';

export default function VPet() {
  const { pet, feedPet, playPet, cleanPet, healPet, decayPet, areas, applyPetToArea, devices } = useSmart();

  const status = [
    { key: 'hunger', label: 'Kenyang', value: pet.hunger, icon: 'restaurant', low: 'Lapar — beri pakan' },
    { key: 'happiness', label: 'Kebahagiaan', value: pet.happiness, icon: 'mood', low: 'Murung — ajak bermain' },
    { key: 'hygiene', label: 'Kebersihan', value: pet.hygiene, icon: 'shower', low: 'Kotor — bersihkan kolam' },
    { key: 'health', label: 'Kesehatan', value: pet.health, icon: 'favorite', low: 'Lemah — butuh perawatan' },
  ];

  const area = areas.find((a) => a.id === pet.appliedToAreaId);
  const areaDevices = devices.filter((d) => d.areaId === pet.appliedToAreaId);
  const waterQuality = () => {
    const ph = areaDevices.find((d) => d.metric?.key === 'ph');
    const doVal = areaDevices.find((d) => d.metric?.key === 'do');
    const temp = areaDevices.find((d) => d.metric?.key === 'temp');
    const notes = [];
    if (ph) notes.push({ label: 'pH', value: ph.metric.value, ok: ph.metric.value >= 6.5 && ph.metric.value <= 7.5 });
    if (doVal) notes.push({ label: 'DO', value: doVal.metric.value, ok: doVal.metric.value >= 5.5 });
    if (temp) notes.push({ label: 'Suhu', value: temp.metric.value, ok: temp.metric.value >= 25 && temp.metric.value <= 29 });
    return notes;
  };
  const readings = waterQuality();
  const avgHealth = Math.round(status.reduce((sum, row) => sum + row.value, 0) / status.length);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr,2fr]">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent text-center">
          <SectionTitle eyebrow="Virtual Pet" title={pet.name} subtitle={`${pet.species} · Level ${pet.level} · Tahap ${pet.stage}`} />
          <div className="my-4 flex justify-center">
            <div className="relative w-40 h-40 rounded-full bg-white/60 dark:bg-white/10 border-4 border-primary/20 flex items-center justify-center">
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
            <div className="grid gap-3 sm:grid-cols-[1fr,auto] items-end">
              <div className="grid grid-cols-3 gap-3">
                {readings.length === 0 ? (
                  <p className="col-span-3 text-sm text-on-surface-variant">Belum ada sensor air di area ini.</p>
                ) : (
                  readings.map((read) => (
                    <div key={read.label} className="rounded-xl border border-outline-variant/40 p-3 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{read.label}</p>
                      <p className="text-lg font-extrabold text-on-surface">{read.value}</p>
                      <Badge tone={read.ok ? 'ok' : 'warn'}>{read.ok ? 'Aman' : 'Cek'}</Badge>
                    </div>
                  ))
                )}
              </div>
              <select
                value={pet.appliedToAreaId || ''}
                onChange={(event) => applyPetToArea(event.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-sm text-on-surface"
              >
                <option value="">Pilih area pemantauan…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
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
