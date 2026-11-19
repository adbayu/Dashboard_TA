import { useEffect, useId, useState } from 'react';
import { Chart as ChartJS, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Empty } from '../../shared/components/ui.jsx';
import { useTampilan } from '../../shared/theme/TampilanProvider.jsx';
import { formatSensorNumber, summarizeHistory } from '../../utils/iotPresentation.js';
import { buildReadingChart, readChartPalette } from './readingChartConfig.js';

ChartJS.register(CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

const samePalette = (a, b) => Object.keys(a).every(key => a[key] === b[key]);

/**
 * Grafik 24 jam. Warna dibaca dari variable tema lewat readThemeColor dan dibaca
 * ulang saat tema atau mode terhitung berganti. Pembacaan ada di effect, bukan
 * saat render: TampilanProvider menulis atribut `data-theme`/`data-mode` di
 * layout effect induk, yang jalan SETELAH render anak, jadi render langsung
 * akan membaca warna tema sebelumnya.
 *
 * `area` ('water' | 'leaf') memilih warna deret; prop lama `theme` tidak lagi
 * dipakai (warna mengikuti tema aktif) tetapi tetap diterima agar pemanggil lama
 * tidak rusak.
 */
export default function ReadingChart({ sensor, points = [], threshold, area }) {
  const titleId = useId();
  const { tema, resolvedMode } = useTampilan();
  const [palette, setPalette] = useState(() => readChartPalette(area));
  useEffect(() => {
    const next = readChartPalette(area);
    // oxlint-disable-next-line react/set-state-in-effect -- menyelaraskan dengan variable CSS di DOM (sistem luar), yang baru benar setelah layout effect provider.
    setPalette(current => (samePalette(current, next) ? current : next));
  }, [tema, resolvedMode, area]);

  const summary = summarizeHistory(points);
  if (!points.length) {
    return <Empty title="Belum ada riwayat sensor" hint="Grafik akan terisi setelah perangkat mengirim pembacaan." icon="chart-line" />;
  }

  const unit = sensor.unit || '';
  const decimals = sensor.decimals ?? 2;
  const { data, options } = buildReadingChart({ sensor, points, threshold, palette });

  return (
    <figure className="min-w-0" role="group" aria-labelledby={titleId}>
      <figcaption id={titleId} className="mb-2 text-sm font-semibold text-text">
        {sensor.name || sensor.label || sensor.code}, 24 jam terakhir
      </figcaption>
      <div className="h-56 min-w-0 sm:h-64">
        <Line data={data} options={options} role="img" aria-label={`Grafik ${sensor.name || sensor.code} selama 24 jam dengan rata-rata, rentang minimum dan maksimum, serta ambang efektif`} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ backgroundColor: palette.line }} />Rata-rata</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm" style={{ backgroundColor: palette.fill }} />Min sampai maks</span>
        {threshold?.low != null && <span>Ambang bawah {formatSensorNumber(threshold.low, decimals)} {unit}</span>}
        {threshold?.high != null && <span>Ambang atas {formatSensorNumber(threshold.high, decimals)} {unit}</span>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-text-2">
        Terakhir {formatSensorNumber(summary.latest, decimals)} {unit}. Min {formatSensorNumber(summary.min, decimals)} {unit}. Maks {formatSensorNumber(summary.max, decimals)} {unit}. {summary.count} titik agregat.
      </p>
    </figure>
  );
}
