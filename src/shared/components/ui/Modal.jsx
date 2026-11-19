import clsx from 'clsx';
import { useEffect, useId, useRef } from 'react';
import { IconButton } from './Button.jsx';

// Perilaku fokus dipertahankan persis dari versi sebelumnya: fokus awal ke
// kontrol pertama (bukan tombol tutup), Tab/Shift+Tab terkurung di dialog,
// Esc menutup kecuali `closeDisabled`, dan fokus kembali ke `returnFocusRef`
// atau elemen yang aktif sebelum dialog terbuka. Hanya tampilannya yang baru.
export function Modal({ open, onClose, title, children, footer, wide, closeDisabled = false, returnFocusRef }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const returnFocusTarget = returnFocusRef?.current;
    const previousFocus = returnFocusTarget || document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...(dialog?.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])]
      .filter(element => element.getAttribute('aria-hidden') !== 'true');
    const initialTarget = dialog?.querySelector('[autofocus],input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]):not(.modal-close)') || dialog;
    initialTarget?.focus();

    const onKey = event => {
      if (event.key === 'Escape') {
        if (!closeDisabled) closeRef.current?.();
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const focusTarget = returnFocusTarget || previousFocus;
      if (focusTarget instanceof HTMLElement && focusTarget.isConnected) focusTarget.focus();
    };
  }, [open, closeDisabled, returnFocusRef]);
  if (!open) return null;
  return (
    <div
      className="modal-overlay custom-scrollbar fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      onClick={() => { if (!closeDisabled) closeRef.current?.(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-ui="modal"
        className={clsx(
          'my-auto flex w-full flex-col rounded-card border border-border bg-surface text-text focus:outline-none',
          wide ? 'max-w-3xl' : 'max-w-xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pl-5 pr-4 pt-4">
          <h3 id={titleId} className="mt-1 min-w-0 font-head text-[19px] font-bold leading-[26px] text-text">{title}</h3>
          <IconButton icon="x" onClick={() => closeRef.current?.()} title="Tutup" tone="netral" size="sm" disabled={closeDisabled} className="modal-close" />
        </div>
        <div className="px-5 pb-5 pt-3">{children}</div>
        {footer && (
          <div data-ui="modal-foot" className="flex flex-wrap justify-end gap-2 rounded-b-card border-t border-border bg-surface-2 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
