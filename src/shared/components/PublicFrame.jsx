import clsx from 'clsx';
import { ThemeQuickMenu } from '../theme/ThemeQuickMenu.jsx';
import { Icon } from './Icon.jsx';

/**
 * Kerangka halaman publik (Masuk, Daftar, Klaim alat): merek di kiri, tombol
 * tema cepat di kanan, supaya pilihan tampilan berlaku juga sebelum masuk.
 * Perlakuan Lumina untuk merek dan panel ada di theme-surfaces.css lewat
 * `data-ui="brand-mark"` dan `data-ui="public-panel"`.
 */
export function PublicHeader({ className = '' }) {
  return (
    <header className={clsx('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2.5 font-head text-lg font-bold leading-6 text-text">
        <span data-ui="brand-mark" className="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-mark-bg text-mark-fg">
          <Icon name="sprout" size={18} />
        </span>
        JagoFarm
      </div>
      <ThemeQuickMenu />
    </header>
  );
}

/** Halaman dua kolom di tengah layar, dengan kepala publik di atasnya. */
export function PublicFrame({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader className="mx-auto w-full max-w-[1080px] px-4 py-5 sm:px-8" />
      <main className="flex flex-1 items-center justify-center px-4 pb-14 pt-4 sm:px-8">{children}</main>
    </div>
  );
}

/** Panel gelap (warna sidebar) berisi pengantar halaman; `children` disusun vertikal. */
export function PublicPanel({ children, className = '' }) {
  return (
    <section
      data-ui="public-panel"
      className={clsx('flex flex-col justify-between gap-10 rounded-card border border-side-line bg-side-bg p-8 text-side-text sm:p-10', className)}
    >
      {children}
    </section>
  );
}

/** Tanda "Data contoh" untuk layar yang memakai data lokal. */
export function SampleTag() {
  return (
    <span className="whitespace-nowrap rounded-control border border-dashed border-text-2 px-2 py-0.5 text-[13px] leading-[18px] text-text-2">
      Data contoh
    </span>
  );
}
