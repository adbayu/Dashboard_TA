import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEFAULT_PALETTE = {
  muted: '#56695d',
  grid: '#dce5dc',
  tooltipBackground: '#193e30',
  tooltipText: '#ffffff',
};

export default function TelemetryLineChart({
  ariaLabel,
  labels,
  datasets,
  palette = DEFAULT_PALETTE,
  height = 220,
  yAxisLabel = '',
  tooltipTitle,
  tooltipLabel,
}) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'bottom',
        labels: { color: palette.muted, usePointStyle: false, boxWidth: 14, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: palette.tooltipBackground,
        titleColor: palette.tooltipText,
        bodyColor: palette.tooltipText,
        borderColor: palette.grid,
        borderWidth: 1,
        callbacks: {
          title: (items) => tooltipTitle?.(items) ?? items[0]?.label ?? '',
          label: (context) => tooltipLabel?.(context) ?? `${context.dataset.label}: ${context.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: palette.muted, maxTicksLimit: 3, maxRotation: 0, autoSkip: true },
      },
      y: {
        beginAtZero: false,
        grid: { color: palette.grid },
        ticks: { color: palette.muted },
        title: { display: Boolean(yAxisLabel), text: yAxisLabel, color: palette.muted },
      },
    },
  };

  return (
    <div className="min-w-0" style={{ height }}>
      <Line
        role="img"
        aria-label={ariaLabel}
        data={{ labels, datasets }}
        options={options}
      />
    </div>
  );
}
