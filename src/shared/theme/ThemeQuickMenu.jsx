import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../components/ui';
import { ModeToggle } from './ModeToggle.jsx';
import { ThemePicker } from './ThemePicker.jsx';
import { useTampilan } from './TampilanProvider.jsx';
import { namaTema } from './temaInfo.js';

/**
 * Tombol tema cepat di top bar: "<nama tema> v" membuka popover berisi
 * ThemePicker ringkas dan ModeToggle. Esc menutup dan mengembalikan fokus ke
 * tombol; klik di luar atau fokus pindah keluar juga menutup. Pilihan langsung
 * berlaku, popover tetap terbuka agar tema lain bisa dicoba.
 */
export function ThemeQuickMenu() {
  const { tema, mode, resolvedMode, setTema, setMode } = useTampilan();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    // Fokus masuk ke radio tema yang tercentang saat popover dibuka.
    wrapRef.current?.querySelector('[role="dialog"] [role="radio"][aria-checked="true"]')?.focus();

    const closeOnOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function closeWhenFocusLeaves(event) {
    if (open && event.relatedTarget && !wrapRef.current?.contains(event.relatedTarget)) setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative shrink-0" onBlur={closeWhenFocusLeaves}>
      <Button
        ref={buttonRef}
        variant="secondary"
        size="sm"
        icon={resolvedMode === 'dark' ? 'moon' : 'sun'}
        iconRight="chevron-down"
        title="Ganti tema"
        aria-label={`Ganti tema: ${namaTema(tema)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {/* Di layar sempit nama tema disembunyikan agar judul halaman tetap terbaca. */}
        <span className="hidden sm:inline">{namaTema(tema)}</span>
      </Button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Tampilan"
          data-ui="theme-menu"
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw_-_2rem))] space-y-4 rounded-card border border-border bg-surface p-4 text-text"
        >
          <ThemePicker compact value={tema} onChange={setTema} mode={resolvedMode} label="Tema" />
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-semibold leading-5">Mode warna</p>
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeQuickMenu;
