import { useId } from 'react';
import { Chart as ChartJS, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Empty } from '../ui.jsx';
import { formatSensorNumber, summarizeHistory } from '../../utils/iotPresentation.js';

ChartJS.register(CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

function chartTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function ReadingChart({ sensor, points = [], threshold, theme = 'light' }) {
  const titleId = useId();
  const summary = summarizeHistory(points);
  if (!points.length) {
    return <Empty title="Belum ada riwayat sensor" hint="Grafik akan terisi setelah perangkat mengirim pembacaan." icon="show_chart" />;
  }

  const dark = theme === 'dark';
  const line = dark ? '#95d4b3' : '#0f5238';
  const grid = dark ? 'rgba(158,170,162,0.25)' : 'rgba(92,101,95,0.22)';
  const text = dark ? '#e9eeea' : '#191c1d';
  const thresholdColor = dark ? '#fcd34d' : '#b45309';
  const unit = sensor.unit || '';
  const decimals = sensor.decimals ?? 2;
  const labels = points.map(point => chartTime(point.t));
  const values = data => points.map(point => point[data]);
  const datasets = [
    { label: 'Minimum', data: values('min'), borderColor: line, borderDash: [2, 3], borderWidth: 1, pointRadius: 0, fill: false },
    { label: 'Maksimum', data: values('max'), borderColor: line, borderDash: [2, 3], borderWidth: 1, backgroundColor: dark ? 'rgba(149,212,179,0.18)' : 'rgba(15,82,56,0.14)', pointRadius: 0, fill: { target: 0 } },
    { label: 'Rata-rata', data: values('avg'), borderColor: line, backgroundColor: line, borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, tension: 0.15 },
  ];
  for (const side of ['low', 'high']) {
    if (threshold?.[side] == null) continue;
    datasets.push({
      label: side === 'low' ? 'Ambang bawah' : 'Ambang atas',
      data: points.map(() => threshold[side]),
      borderColor: thresholdColor,
      borderDash: [5, 4],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    });
  }

  const data = { labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => chartTime(points[items[0]?.dataIndex]?.t),
          label: context => `${context.dataset.label}: ${formatSensorNumber(context.parsed.y, decimals)}${unit ? ` ${unit}` : ''}`,
        },
      },
    },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, maxTicksLimit: 6, maxRotation: 0, autoSkip: true } },
      y: { grid: { color: grid }, ticks: { color: text, callback: value => formatSensorNumber(value, decimals) } },
    },
  };

  return (
    <figure className="min-w-0" role="group" aria-labelledby={titleId}>
      <figcaption id={titleId} className="mb-2 text-sm font-semibold text-on-surface">
        {sensor.name || sensor.label || sensor.code}, 24 jam terakhir
      </figcaption>
      <div className="h-56 min-w-0 sm:h-64">
        <Line data={data} options={options} role="img" aria-label={`Grafik ${sensor.name || sensor.code} selama 24 jam dengan rata-rata, rentang minimum dan maksimum, serta ambang efektif`} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-primary dark:bg-inverse-primary" />Rata-rata</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-primary/20 dark:bg-inverse-primary/20" />Min sampai maks</span>
        {threshold?.low != null && <span>Ambang bawah {formatSensorNumber(threshold.low, decimals)} {unit}</span>}
        {threshold?.high != null && <span>Ambang atas {formatSensorNumber(threshold.high, decimals)} {unit}</span>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
        Terakhir {formatSensorNumber(summary.latest, decimals)} {unit}. Min {formatSensorNumber(summary.min, decimals)}. Maks {formatSensorNumber(summary.max, decimals)}. {summary.count} titik agregat.
      </p>
    </figure>
  );
}
