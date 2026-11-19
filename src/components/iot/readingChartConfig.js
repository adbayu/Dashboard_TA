import { readThemeColor } from '../../shared/theme/readThemeColor.js';
import { formatSensorNumber } from '../../utils/iotPresentation.js';

// Warna deret mengikuti area: growbed `leaf-fg`, kolam `water-fg`, selain itu
// `chart-1`. Ambang `warn-fg`, grid `border`, label sumbu `text-2`. Semua dibaca
// dari variable tema aktif lewat readThemeColor (tidak ada hex di sini).
const SERIES_TOKEN = { leaf: 'leaf-fg', water: 'water-fg' };

export function readChartPalette(area) {
  const series = SERIES_TOKEN[area] || 'chart-1';
  return {
    line: readThemeColor(series),
    fill: readThemeColor(series, 0.14),
    grid: readThemeColor('border'),
    tick: readThemeColor('text-2'),
    threshold: readThemeColor('warn-fg'),
  };
}

export function chartTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function buildReadingChart({ sensor, points, threshold, palette }) {
  const unit = sensor.unit || '';
  const decimals = sensor.decimals ?? 2;
  const labels = points.map(point => chartTime(point.t));
  const values = key => points.map(point => point[key]);
  const datasets = [
    { label: 'Minimum', data: values('min'), borderColor: palette.line, borderDash: [2, 3], borderWidth: 1, pointRadius: 0, fill: false },
    { label: 'Maksimum', data: values('max'), borderColor: palette.line, borderDash: [2, 3], borderWidth: 1, backgroundColor: palette.fill, pointRadius: 0, fill: { target: 0 } },
    { label: 'Rata-rata', data: values('avg'), borderColor: palette.line, backgroundColor: palette.line, borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, tension: 0.15 },
  ];
  for (const side of ['low', 'high']) {
    if (threshold?.[side] == null) continue;
    datasets.push({
      label: side === 'low' ? 'Ambang bawah' : 'Ambang atas',
      data: points.map(() => threshold[side]),
      borderColor: palette.threshold,
      borderDash: [5, 4],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    });
  }

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
      x: { grid: { color: palette.grid }, ticks: { color: palette.tick, maxTicksLimit: 6, maxRotation: 0, autoSkip: true } },
      y: { grid: { color: palette.grid }, ticks: { color: palette.tick, callback: value => formatSensorNumber(value, decimals) } },
    },
  };

  return { data: { labels, datasets }, options };
}
