import { attentionBadgeLabel } from '../../utils/monitoring.js';

export default function AttentionBadge({ count }) {
  if (count < 1) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={attentionBadgeLabel(count)}
      className="mt-0.5 inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-100 px-1.5 text-[11px] font-extrabold tabular-nums text-amber-950"
    >{count}</span>
  );
}
