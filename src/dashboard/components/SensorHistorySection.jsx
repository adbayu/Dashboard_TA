import { useState } from 'react';
import { METRIC_META } from '../../shared/store/SmartStore';
import { Badge, Card, Empty, SectionTitle, Select, Table } from '../../shared/components/ui';
import { WARNA_STATUS, TEKS_STATUS } from '../model/thresholdStatus.js';
import SensorHistoryCharts from './SensorHistoryCharts.jsx';

export default function SensorHistorySection({ areas, devices, categories, readings, theme, historiArea, formatNumber }) {
  const areaBerSensor = areas.filter((area) => devices.some((device) => device.areaId === area.id && device.metric));
  const [historyMode, setHistoryMode] = useState('chart');
  const sensorAreaKey = areaBerSensor.map((area) => area.id).join('|');
  const [historySelection, setHistorySelection] = useState(null);
  const areaIds = sensorAreaKey.split('|').filter(Boolean);
  const selectedHistoryAreaId = historySelection?.sensorAreaKey === sensorAreaKey && areaIds.includes(historySelection.id)
    ? historySelection.id
    : areaIds[0] || '';
  const selectedHistoryArea = areaBerSensor.find((area) => area.id === selectedHistoryAreaId) || null;

  return (
    <Card pad="sm">
      <SectionTitle
        eyebrow="Riwayat Sensor"
        title="Tren kualitas air kolam"
        subtitle="Data sementara dari simulator lokal. Pantau pH, suhu air, dan TDS selama 14 hari, atau buka tabel ringkasan per tanggal."
      />
      {areaBerSensor.length === 0 ? (
        <Empty
          title="Belum ada kolam dengan sensor"
          hint="Histori harian muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area."
          icon="sensors_off"
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tampilan riwayat sensor">
              {['chart', 'table'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={historyMode === mode}
                  onClick={() => setHistoryMode(mode)}
                  className={`min-h-11 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${historyMode === mode ? 'bg-primary-action text-white' : 'panel-inset text-on-surface'}`}
                >
                  {mode === 'chart' ? 'Grafik' : 'Tabel'}
                </button>
              ))}
            </div>
            {historyMode === 'chart' && selectedHistoryArea && (areaBerSensor.length > 1 ? (
              <label className="block min-w-[12rem]">
                <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Area grafik</span>
                <Select
                  aria-label="Pilih area grafik"
                  value={selectedHistoryAreaId}
                  onChange={(id) => setHistorySelection({ sensorAreaKey, id })}
                  options={areaBerSensor.map((area) => ({ value: area.id, label: area.name }))}
                  className="min-h-11"
                />
              </label>
            ) : <p className="text-sm font-semibold text-on-surface-variant">Area: {selectedHistoryArea.name}</p>)}
          </div>
          {historyMode === 'chart' && selectedHistoryArea ? (
            <SensorHistoryCharts
              area={selectedHistoryArea}
              readings={readings}
              devices={devices}
              categories={categories}
              history={historiArea(selectedHistoryArea.id, 14)}
              theme={theme}
            />
          ) : (
            <>
              {areaBerSensor.map((area) => {
                const histori = historiArea(area.id, 14);
                return (
                  <div key={area.id}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-on-surface">{area.name}</h3>
                      <span className="text-[11px] text-on-surface-variant">
                        {histori.filter((row) => row.adaData).length} hari tercatat ·{' '}
                        {formatNumber(histori.reduce((sum, row) => sum + row.jumlah, 0), 0)} pembacaan tersimpan
                      </span>
                    </div>
                    <Table head={['Tanggal', 'pH rata-rata', 'Suhu rata-rata', 'TDS rata-rata', 'Rentang hari ini', 'Ikan mati']}>
                      {histori.map((row) => (
                        <tr key={row.tanggal} className={row.hariIni ? 'bg-primary/5' : 'hover:bg-primary/5'}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-semibold text-on-surface">{row.label}</span>
                            {row.hariIni && <Badge tone="brand" className="ml-2">Hari ini</Badge>}
                          </td>
                          {row.metrik.map((metric) => {
                            const meta = METRIC_META[metric.key];
                            const stats = metric.stats;
                            return (
                              <td key={metric.key} className="px-3 py-2 whitespace-nowrap">
                                {stats ? (
                                  <>
                                    <span className="font-semibold text-on-surface">{formatNumber(stats.avg, meta.precision)}</span>{' '}
                                    <span className="text-[11px] text-on-surface-variant">{meta.unit}</span>
                                    <span className="block text-[11px] text-on-surface-variant">
                                      {formatNumber(stats.min, meta.precision)}–{formatNumber(stats.max, meta.precision)}
                                    </span>
                                  </>
                                ) : <span className="text-[11px] text-on-surface-variant">·</span>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {row.metrik.map((metric) => (
                                <Badge key={metric.key} tone={WARNA_STATUS[metric.status] || 'muted'}>
                                  {METRIC_META[metric.key].label.replace(' Air', '').replace(' Nutrisi', '')}{' '}
                                  {TEKS_STATUS[metric.status] || 'Tanpa data'}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.matiEkor > 0
                              ? <span className="font-bold text-amber-600">{row.matiEkor} ekor</span>
                              : <span className="text-[11px] text-on-surface-variant">·</span>}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                );
              })}
              <p className="text-[11px] text-on-surface-variant">
                Rentang hari ini = nilai terendah–tertinggi sepanjang hari itu. Status memakai ambang ideal yang sama dengan statistik di atas. Angka kematian diisi manual di Detail Kolam, bukan dari sensor.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
