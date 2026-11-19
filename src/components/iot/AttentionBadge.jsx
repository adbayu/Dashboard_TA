import { attentionBadgeLabel } from '../../utils/monitoring.js';

export default function AttentionBadge({ count }) {
  if (count < 1) return null;

  return (
    <span
      data-ui="attention-badge"
      role="status"
      aria-live="polite"
      aria-label={attentionBadgeLabel(count)}
      className="mt-0.5 inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-pill border border-warn-line bg-warn-bg px-1.5 text-[11px] font-extrabold tabular-nums text-warn-fg"
    >{count}</span>
  );
}
