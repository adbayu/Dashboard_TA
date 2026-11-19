import { IkonSlot } from './IkonSlot.jsx';

/**
 * Keadaan kosong: sebab (judul), langkah berikutnya (children atau `hint`
 * lama), dan paling banyak satu aksi.
 */
export function EmptyState({ title, hint, children, icon = 'inbox', action }) {
  const sebab = children ?? hint;
  return (
    <div
      data-ui="empty"
      className="flex flex-col items-center gap-2 rounded-card border border-dashed border-text-2 px-4 py-8 text-center text-text"
    >
      <span className="grid h-11 w-11 place-items-center rounded-control bg-surface-2 text-text-2">
        <IkonSlot icon={icon} size={22} />
      </span>
      <p className="mt-1 font-head text-base font-bold leading-[22px]">{title}</p>
      {sebab && <p className="max-w-[42ch] text-[15px] leading-[22px] text-text-2">{sebab}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
