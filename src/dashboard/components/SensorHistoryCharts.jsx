import { ambangUntuk, METRIC_KEYS, METRIC_META, nilaiTerhadapAmbang } from '../../shared/store/SmartStore';
import { Empty } from '../../shared/components/ui';
import { buildSensorPoints } from '../model/sensorHistoryChart.js';
import TelemetryLineChart from '../../shared/components/TelemetryLineChart.jsx';

const COLORS = {
  light: { ph: '#0f5238', temp: '#b45309', tds: '#0e7490' },
  dark: { ph: '#69d2a4', temp: '#ffc16b', tds: '#71c7dc' },
};
const PALETTES = {
  light: { muted: '#404943', grid: 'rgba(191, 201, 193, 0.55)', tooltipBackground: '#2e3132', tooltipText: '#eff1f2' },
  dark: { muted: '#bac7be', grid: 'rgba(74, 86, 76, 0.7)', tooltipBackground: '#e9eeea', tooltipText: '#171c19' },
};

const STATUS_TEXT = { dalam: 'Dalam ambang', bawah: 'Di bawah ambang', atas: 'Di atas ambang' };

const labelWaktu = (value) => new Date(value).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default function SensorHistoryCharts({ area, readings, devices, categories, history, theme }) {
  const palette = theme === 'dark' ? PALETTES.dark : PALETTES.light;
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  const dateKeys = history.map((row) => row.tanggal);

  return (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        {METRIC_KEYS.map((key) => {
          const meta = METRIC_META[key];
          const device = devices.find((item) => item.areaId === area.id && item.metric?.key === key);
          const category = categories.find((item) => item.id === device?.categoryId);
          const threshold = ambangUntuk(area, category, key);
          const points = buildSensorPoints(readings, area.id, key, dateKeys);
          const hasValue = points.some((point) => point.value !== null);
          const seriesColor = colors[key];
          const datasets = [
            {
              label: 'Nilai',
              data: points.map((point) => point.value),
              borderColor: seriesColor,
              backgroundColor: seriesColor,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 3,
              tension: 0.22,
              spanGaps: false,
            },
          ];

          if (threshold) {
            datasets.push(
              {
                label: 'Min',
                tooltipName: 'Batas minimum',
                kind: 'threshold',
                data: points.map(() => threshold[0]),
                borderColor: palette.muted,
                borderDash: [5, 4],
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0,
              },
              {
                label: 'Maks',
                tooltipName: 'Batas maksimum',
                kind: 'threshold',
                data: points.map(() => threshold[1]),
                borderColor: palette.muted,
                borderDash: [2, 3],
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0,
              },
            );
          }

          const tooltipLabel = (context) => {
            const value = context.parsed.y;
            if (context.dataset.kind === 'threshold') {
              return `${context.dataset.tooltipName}: ${Number(value).toLocaleString('id-ID')} ${meta.unit}`;
            }
            if (value == null) return `${meta.label}: Data tidak tersedia`;
            const status = nilaiTerhadapAmbang(value, threshold);
            const nilai = Number(value).toLocaleString('id-ID', { maximumFractionDigits: meta.precision });
            return `${meta.label}: ${nilai} ${meta.unit} · ${STATUS_TEXT[status] || 'Tanpa ambang'}`;
          };

          return (
            <section key={key} className="panel-inset min-w-0 rounded-2xl p-3 sm:p-4" aria-labelledby={`sensor-history-${key}`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id={`sensor-history-${key}`} className="font-bold text-on-surface">{meta.label}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {threshold
                      ? `Ambang ${threshold[0]}–${threshold[1]} ${meta.unit}`
                      : 'Ambang belum diatur'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-outline-variant/50 px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
                  {device?.code || 'Sensor area'}
                </span>
              </div>
              {hasValue ? (
                <TelemetryLineChart
                  ariaLabel={`Riwayat ${meta.label} di ${area.name}, 14 hari`}
                  labels={points.map((point) => new Date(point.at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }))}
                  datasets={datasets}
                  palette={palette}
                  height={220}
                  yAxisLabel={meta.unit}
                  tooltipTitle={(items) => {
                    const at = points[items[0]?.dataIndex]?.at;
                    return at ? labelWaktu(at) : '';
                  }}
                  tooltipLabel={tooltipLabel}
                />
              ) : (
                <Empty title="Belum ada data" hint={`Belum ada pembacaan ${meta.label.toLowerCase()} pada periode ini.`} icon="sensors_off" />
              )}
            </section>
          );
        })}
      </div>
  );
}
