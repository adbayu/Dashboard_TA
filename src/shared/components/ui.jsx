import { useEffect, useId, useRef } from 'react';
import { linkLabelToControl } from '../../utils/frontendReview.js';

// ── Sistem ukuran (satu skala untuk SELURUH aplikasi) ─────────────────────────
// Sebelumnya tinggi tombol berbeda-beda (20/24/30/33/36/38/60/66 px) karena tiap
// halaman menulis padding sendiri. Akibatnya baris tombol tampak melenceng.
// Aturannya sekarang: SEMUA kontrol memakai tinggi eksplisit dari skala berikut,
// jadi tidak mungkin lagi berbeda antar halaman.
//
//   sm = 32px   (chip, tombol di dalam tabel, aksi sekunder)
//   md = 40px   (bawaan: tombol, input, select)
//   lg = 44px   (aksi utama yang menonjol)
//
// Radius juga dipisah menurut peran: kartu 16px (rounded-2xl), kontrol 12px
// (rounded-xl), chip/badge penuh (rounded-full).
// oxlint-disable-next-line react/only-export-components -- Shared size tokens stay beside their existing consumers.
export const UKURAN = {
  sm: { kontrol: 'h-8 px-2.5 text-[13px]', ikon: 'h-8 w-8', teksIkon: 'text-[16px]' },
  md: { kontrol: 'h-10 px-3.5 text-sm', ikon: 'h-10 w-10', teksIkon: 'text-[18px]' },
  lg: { kontrol: 'h-11 px-4 text-sm', ikon: 'h-11 w-11', teksIkon: 'text-[20px]' },
};

const FOKUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-inverse-primary focus-visible:ring-offset-1 focus-visible:ring-offset-transparent';

// ── Kartu dasar bergaya kaca (tema Lumina Aqua) ───────────────────────────────
// min-w-0 wajib: tanpa ini kartu menolak menyusut di dalam CSS grid dan tabel di
// dalamnya mendorong halaman jadi bisa di-scroll ke samping di layar sempit.
export function Card({ children, className = '', as: Tag = 'section', pad = 'md' }) {
  const padding = pad === 'sm' ? 'p-4' : pad === 'none' ? '' : 'p-5';
  return <Tag className={`glass-card rounded-2xl ${padding} min-w-0 ${className}`}>{children}</Tag>;
}

// Judul bagian di dalam kartu. Garis pemisah tipis di bawahnya membuat seluruh
// halaman punya irama yang sama (dulu kartu hanya menumpuk judul, teks, tabel
// tanpa pemisah sehingga terasa padat dan tidak terstruktur).
export function SectionTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-4 border-b border-outline-variant/40">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">{eyebrow}</p>
        )}
        <h2 className="text-xl font-bold text-on-surface mt-0.5 leading-snug">{title}</h2>
        {subtitle && <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const TONES = {
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  warn: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800',
  bad: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800',
  info: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800',
  muted: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
  brand: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary-fixed-dim/10 dark:border-primary-fixed-dim/25 dark:text-primary-fixed-dim',
};

// Tinggi badge dipatok h-6 supaya deretan badge selalu sejajar, termasuk saat
// badge berdampingan dengan tombol berukuran sm.
//
// ── Avatar akun (R-23 / R-38) ─────────────────────────────────────────────────
// Identitas akun demo divalidasi: inisial nama di atas warna yang dipilih
// pengguna. Sebelumnya dipakai foto orang dari Unsplash, yaitu aset yang dibuat
// seolah identitas nyata padahal bukan. Bentuk data avatar = {id, warna, warnaTeks}.
export function Avatar({ avatar, nama = '', size = 40, className = '' }) {
  const inisial = (nama || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase();
  const gaya = {
    width: size, height: size, minWidth: size,
    backgroundColor: avatar?.warna || '#0f5238',
    color: avatar?.warnaTeks || '#eafff4',
    fontSize: Math.max(11, Math.round(size * 0.36)),
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-xl font-extrabold select-none ${className}`}
      style={gaya}
    >
      {inisial}
    </span>
  );
}

// Tombol pemilih avatar: bentuk yang sama dengan yang tampil di sidebar/profil,
// jadi yang dilihat pengguna di daftar pilihan persis sama dengan hasilnya.
export function AvatarPilih({ avatar, nama, terpilih, onClick, size = 48, label = 'Pilih avatar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={terpilih}
      className={`rounded-xl overflow-hidden border-2 transition-all ${
        terpilih ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/40'
      }`}
    >
      <Avatar avatar={avatar} nama={nama} size={size} className="rounded-xl" />
    </button>
  );
}

export function Badge({ children, tone = 'muted', icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap ${TONES[tone] || TONES.muted} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

// oxlint-disable-next-line react/only-export-components -- Shared status tokens stay beside their existing consumers.
export const STATUS_TONE = { online: 'ok', warning: 'warn', maintenance: 'info', offline: 'bad' };
// oxlint-disable-next-line react/only-export-components -- Shared status labels stay beside their existing consumers.
export const STATUS_LABEL = { online: 'Terhubung', warning: 'Perlu perhatian', maintenance: 'Perawatan', offline: 'Tidak terhubung' };

const TONE_IKON = { brand: 'text-primary', warn: 'text-amber-600', bad: 'text-red-600', info: 'text-sky-600' };

export function StatCard({ label, value, unit, icon, hint, tone = 'brand' }) {
  // h-full + jarak bawah tetap: kartu-kartu dalam satu baris tidak lagi berbeda
  // tinggi hanya karena panjang teks petunjuknya beda satu baris.
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-1 min-w-0 h-full">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant min-w-0">{label}</span>
        {icon && (
          <span className={`material-symbols-outlined text-[20px] shrink-0 ${TONE_IKON[tone] || TONE_IKON.brand}`}>{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-on-surface leading-none">{value}</span>
        {unit && <span className="text-xs font-semibold text-on-surface-variant">{unit}</span>}
      </div>
      {/* min-h menjaga tinggi kartu sama walau hint hanya satu baris */}
      <p className="text-[11px] text-on-surface-variant mt-auto pt-1 min-h-[1.35rem]">{hint}</p>
    </div>
  );
}

const VARIAN_TOMBOL = {
  primary: 'button-primary text-white shadow-emerald-glow',
  ghost: 'panel-inset button-ghost text-on-surface hover:border-primary/40',
  danger: 'bg-red-600 button-danger text-white hover:bg-red-700',
  soft: 'bg-primary/10 text-primary hover:bg-primary/20 dark:text-emerald-glow',
};

// size bawaan 'md'. Semua varian memakai tinggi eksplisit dari UKURAN sehingga
// tombol primary/ghost (yang punya border) tetap PERSIS sama tinggi.
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon,
  disabled,
  className = '',
  title,
}) {
  const u = UKURAN[size] || UKURAN.md;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${u.kontrol} ${VARIAN_TOMBOL[variant] || VARIAN_TOMBOL.primary} ${FOKUS} ${className}`}
    >
      {icon && <span className={`material-symbols-outlined ${u.teksIkon}`}>{icon}</span>}
      {children}
    </button>
  );
}

// Tombol ikon saja. Dulu tiap halaman menulis sendiri (24px, 33px, 36px) —
// sekarang satu ukuran persegi dari skala yang sama dengan Button.
export function IconButton({ icon, onClick, title, tone = 'brand', size = 'md', disabled, className = '' }) {
  const u = UKURAN[size] || UKURAN.md;
  const warna =
    tone === 'bad'
      ? 'text-red-600 hover:bg-red-500/10'
      : tone === 'warn'
        ? 'text-amber-600 hover:bg-amber-500/10'
      : tone === 'netral'
        ? 'text-on-surface-variant hover:text-primary dark:hover:text-inverse-primary'
        : 'text-primary hover:bg-primary/10 dark:text-inverse-primary dark:hover:bg-inverse-primary/10';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center rounded-xl transition-colors duration-200 disabled:opacity-50 shrink-0 ${u.ikon} ${warna} ${FOKUS} ${className}`}
    >
      <span className={`material-symbols-outlined ${u.teksIkon}`}>{icon}</span>
    </button>
  );
}

export function Field({ label, hint, children, className = '' }) {
  const generatedId = useId();
  const { id, control } = linkLabelToControl(children, generatedId, [Input, NumberInput, Select, TextArea]);
  // Label dipatok satu baris (h-4 + truncate). Sebelumnya label panjang seperti
  // "Harga satuan" membungkus jadi dua baris, sehingga kotak input di kolom itu
  // turun 16px dibanding kolom sebelahnya pada baris form yang sama.
  return (
    <div className={`block min-w-0 ${className}`}>
      <label htmlFor={id} className="block h-4 truncate text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</label>
      {control}
      {hint && <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>}
    </div>
  );
}

// Tinggi input disamakan dengan tombol md (40px) supaya baris form yang
// menyejajarkan input + tombol tidak lagi perlu trik `items-end`.
const inputCls =
  `w-full min-w-0 h-10 rounded-xl glass-input px-3 text-sm text-on-surface ${FOKUS}`;

export function Input({ className = '', ...rest }) {
  return <InputDasar {...rest} className={className} />;
}

function InputDasar({ value, onChange, className = '', ...rest }) {
  return <input {...rest} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className={`${inputCls} ${className}`} />;
}

export function NumberInput({ value, onChange, className = '', ...rest }) {
  return (
    <input
      {...rest}
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
      className={`${inputCls} ${className}`}
    />
  );
}

export function Select({ value, onChange, options, placeholder, className = '', ...rest }) {
  return (
    <select {...rest} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className={`${inputCls} ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, className = '', ...rest }) {
  return (
    <textarea
      {...rest}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={`${inputCls} h-auto min-h-[88px] py-2 leading-relaxed ${className}`}
    />
  );
}

export function Empty({ title, hint, icon = 'inbox', action }) {
  return (
    <div className="text-center py-10 px-4 flex flex-col items-center">
      <span className="w-14 h-14 rounded-2xl panel-inset flex items-center justify-center">
        <span className="material-symbols-outlined text-[26px] text-outline">{icon}</span>
      </span>
      <p className="mt-3 font-bold text-on-surface">{title}</p>
      {hint && <p className="text-sm text-on-surface-variant mt-1 max-w-md">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, closeDisabled = false, returnFocusRef }) {
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
      className="modal-overlay fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto custom-scrollbar"
      onClick={() => { if (!closeDisabled) closeRef.current?.(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`glass-panel rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} my-auto p-5 shadow-glass-elevated`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 mb-4 border-b border-outline-variant/40">
          <h3 id={titleId} className="text-lg font-bold text-on-surface min-w-0">{title}</h3>
          <IconButton icon="close" onClick={() => closeRef.current?.()} title="Tutup" size="sm" disabled={closeDisabled} className="modal-close -mt-1 -mr-1" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, max = 100, tone = 'brand', label = 'Progres' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    brand: 'bg-primary dark:bg-primary-fixed-dim',
    warn: 'bg-amber-500 dark:bg-amber-400',
    bad: 'bg-red-500 dark:bg-red-400',
    info: 'bg-sky-500 dark:bg-sky-400',
  };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-2 w-full rounded-full bg-surface-container overflow-hidden dark:h-2.5 dark:border dark:border-outline-variant/80 dark:bg-surface-container-lowest"
    >
      <div className={`h-full rounded-full transition-all duration-300 ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/40">
      <table className="w-full text-sm">
        <thead className="bg-surface-container-high/70 border-b border-outline-variant/40">
          <tr>
            {head.map((th) => (
              <th
                key={th}
                className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap"
              >
                {th}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">{children}</tbody>
      </table>
    </div>
  );
}

// Deretan tombol aksi di dalam tabel (mis. edit/hapus). Dipakai bersama supaya
// jarak dan ukuran tombol aksi identik di seluruh halaman.
export function AksiBaris({ children }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
