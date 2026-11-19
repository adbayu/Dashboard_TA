import clsx from 'clsx';
import { UKURAN } from '../ui.jsx';
import { IkonSlot } from './IkonSlot.jsx';
import { FOKUS } from './tones.js';

/** Keping filter yang bisa dinyalakan; status aktif diumumkan lewat aria-pressed. */
export function FilterChip({ active = false, count, onClick, disabled, icon, children, className = '' }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      data-ui="chip"
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border font-semibold disabled:cursor-not-allowed disabled:opacity-60',
        UKURAN.sm.kontrol,
        active ? 'border-primary bg-primary text-on-primary' : 'border-text-2 bg-surface text-text enabled:hover:bg-surface-2',
        FOKUS,
        className,
      )}
    >
      <IkonSlot icon={icon} size={16} />
      {children}
      {count != null && <span className="font-num font-medium tabular-nums">{count}</span>}
    </button>
  );
}
