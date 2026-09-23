import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah, useSmart } from '../store/SmartStore';
import { Badge, Bar, Card, Empty, SectionTitle, StatCard, STATUS_LABEL, STATUS_TONE, Table } from '../components/ui';

export default function Dashboard() {
  const { areas, devices, monitoring, hppTotal, pet, points, activeAlerts, missions } = useSmart();

  const metrics = useMemo(() => {
    const byKey = (key) => devices.find((d) => d.metric?.key === key);
    return { ph: byKey('ph'), doVal: byKey('do'), temp: byKey('temp'), tds: byKey('tds') };
  }, [devices]);

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const doneMissions = missions.filter((m) => m.done).length;
  const waterVolume = areas.reduce((sum, a) => sum + Number(a.volume || 0), 0);

  const sensorHealth = (device) => {
    if (!device?.metric) return { tone: 'muted', text: 'Belum ada data' };
    const { value } = device.metric;
    if (device.metric.key === 'ph') return value >= 6.5 && value <= 7.5 ? { tone: 'ok', text: 'Ideal' } : { tone: 'warn', text: 'Keluar ambang' };
    if (device.metric.key === 'do') return value >= 5.5 ? { tone: 'ok', text: 'Aman' } : { tone: 'bad', text: 'Rendah' };
    if (device.metric.key === 'temp') return value >= 25 && value <= 29 ? { tone: 'ok', text: 'Ideal' } : { tone: 'warn', text: 'Ekstrem' };
    return { tone: 'info', text: 'Terpantau' };
  };

  return (
    <div className="space-y-6">
      {/* Sambutan + kondisi utama */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <SectionTitle
            eyebrow="Ringkasan Hari Ini"
            title="Kondisi farm aquaponik Anda"
            subtitle="Sistem kolam + IoT yang menyatukan budidaya ikan dan sayur dalam satu siklus air."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Area Aktif" value={areas.filter((a) => a.status === 'aktif').length} unit={`/ ${areas.length}`} icon="water" hint="Kolam, growbed, tandon" />
            <StatCard label="Device Online" value={devices.filter((d) => d.status === 'online').length} unit={`/ ${devices.length}`} icon="sensors" hint="Telemetri 5 detik" />
            <StatCard label="Total Poin" value={points.toLocaleString('id-ID')} icon="stars" hint={`${doneMissions}/${missions.length} misi selesai`} />
            <StatCard
              label="Perlu Perhatian"
              value={activeAlerts.length}
              icon="warning"
              tone={activeAlerts.length ? 'bad' : 'ok'}
              hint={activeAlerts.length ? 'Cek daftar device' : 'Semua device sehat'}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Virtual Pet" title={pet.name} subtitle={`${pet.species} · Level ${pet.level} (${pet.stage})`} />
          <div className="space-y-3">
            {[
              { label: 'Kenyang', value: pet.hunger, tone: pet.hunger < 40 ? 'bad' : 'brand' },
              { label: 'Kebahagiaan', value: pet.happiness, tone: 'info' },
              { label: 'Kebersihan', value: pet.hygiene, tone: pet.hygiene < 40 ? 'warn' : 'brand' },
              { label: 'Kesehatan', value: pet.health, tone: pet.health < 50 ? 'bad' : 'brand' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-on-surface-variant">{row.label}</span>
                  <span className="text-on-surface">{row.value}%</span>
                </div>
                <Bar value={row.value} tone={row.tone} />
              </div>
            ))}
          </div>
          <Link to="/v-pet" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Rawat pet sekarang <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </Card>
      </div>

      {/* Pembacaan sensor kunci */}
      <Card>
        <SectionTitle
          eyebrow="Telemetri Kunci"
          title="Parameter air & lingkungan"
          subtitle="Nilai bergerak otomatis tiap 5 detik untuk simulasi perangkat yang terpasang."
          action={
            <Link to="/iot" className="text-sm font-bold text-primary hover:underline">
              Lihat semua device
            </Link>
          }
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'ph', label: 'pH Air', unit: 'pH', icon: 'science' },
            { key: 'do', label: 'Oksigen Terlarut', unit: 'mg/L', icon: 'bubble_chart' },
            { key: 'temp', label: 'Suhu Air', unit: '°C', icon: 'device_thermostat' },
            { key: 'tds', label: 'TDS Nutrisi', unit: 'ppm', icon: 'water_ec' },
          ].map((item) => {
            const device = metrics[item.key] || metrics[item.key === 'do' ? 'doVal' : item.key];
            const health = sensorHealth(device);
            return (
              <div key={item.key} className="rounded-2xl border border-outline-variant/40 p-4 bg-white/50 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary text-[22px]">{item.icon}</span>
                  <Badge tone={health.tone}>{health.text}</Badge>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-on-surface">
                  {device?.metric?.value ?? '—'} <small className="text-xs font-semibold text-on-surface-variant">{item.unit}</small>
                </p>
                <p className="text-xs font-semibold text-on-surface-variant">{item.label}</p>
                <p className="text-[11px] text-outline mt-1">{device ? device.code : 'Belum terpasang'}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Area & HPP */}
      <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        <Card>
          <SectionTitle
            eyebrow="Kelola Area"
            title="Area produksi & HPP"
            subtitle="Harga pokok dihitung otomatis dari item biaya yang Anda input."
            action={
              <Link to="/area" className="text-sm font-bold text-primary hover:underline">
                Kelola area
              </Link>
            }
          />
          {areas.length === 0 ? (
            <Empty title="Belum ada area" hint="Tambahkan kolam atau growbed di menu Kelola Area." icon="water" />
          ) : (
            <Table head={['Area', 'Komoditas', 'Device', 'HPP', 'Per Unit']}>
              {areas.map((area) => {
                const { total, perUnit } = hppTotal(area.id);
                return (
                  <tr key={area.id} className="hover:bg-primary/5">
                    <td className="px-3 py-2">
                      <Link to="/area" className="font-bold text-on-surface hover:text-primary">
                        {area.name}
                      </Link>
                      <p className="text-[11px] text-on-surface-variant">{area.location}</p>
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">{area.commodity}</td>
                    <td className="px-3 py-2">
                      <Badge tone="info">{area.deviceIds.length} unit</Badge>
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatRupiah(total)}</td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {perUnit ? `${formatRupiah(perUnit)} / ${area.populationUnit}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-on-surface-variant">
            <span>
              Total biaya tercatat: <strong className="text-on-surface">{formatRupiah(totalHpp)}</strong>
            </span>
            <span>
              Volume air dikelola: <strong className="text-on-surface">{waterVolume.toLocaleString('id-ID')} L</strong>
            </span>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Catatan Terbaru" title="Pemantauan & kondisi device" />
          <div className="space-y-3">
            {activeAlerts.length > 0 && (
              <div className="space-y-2">
                {activeAlerts.map((device) => (
                  <div key={device.id} className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">{device.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {device.code} · {STATUS_LABEL[device.status]}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[device.status]} className="ml-auto">
                      {device.battery}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {monitoring.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-outline-variant/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-on-surface">{entry.note || 'Catatan pemantauan'}</p>
                  <span className="text-[11px] text-outline">{entry.at}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {entry.ph != null && `pH ${entry.ph}`}
                  {entry.doVal != null && ` · DO ${entry.doVal} mg/L`}
                  {entry.temp != null && ` · ${entry.temp} °C`}
                  {entry.ec != null && ` · EC ${entry.ec}`}
                </p>
              </div>
            ))}
            {monitoring.length === 0 && <Empty title="Belum ada catatan" hint="Catat pemantauan dari menu Kelola Area." icon="history" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
