import { useEffect } from 'react';

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
export const UKURAN = {
  sm: { kontrol: 'h-8 px-2.5 text-[13px]', ikon: 'h-8 w-8', teksIkon: 'text-[16px]' },
  md: { kontrol: 'h-10 px-3.5 text-sm', ikon: 'h-10 w-10', teksIkon: 'text-[18px]' },
  lg: { kontrol: 'h-11 px-4 text-sm', ikon: 'h-11 w-11', teksIkon: 'text-[20px]' },
};

const FOKUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent';

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
  brand: 'bg-primary/10 text-primary border-primary/20 dark:text-emerald-glow',
};

// Tinggi badge dipatok h-6 supaya deretan badge selalu sejajar, termasuk saat
// badge berdampingan dengan tombol berukuran sm.
export function Badge({ children, tone = 'muted', icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap ${TONES[tone] || TONES.muted} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}
      {children}
    </span>
  );
}

export const STATUS_TONE = { online: 'ok', warning: 'warn', maintenance: 'info', offline: 'bad' };
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
  primary: 'bg-primary text-white hover:bg-primary-container shadow-emerald-glow',
  ghost: 'panel-inset text-on-surface hover:border-primary/40',
  danger: 'bg-red-600 text-white hover:bg-red-700',
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
          ? 'text-on-surface-variant hover:text-primary'
          : 'text-primary hover:bg-primary/10';
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
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>}
    </label>
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

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto custom-scrollbar"
      onClick={onClose}
    >
      <div
        className={`glass-panel rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} my-auto p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 mb-4 border-b border-outline-variant/40">
          <h3 className="text-lg font-bold text-on-surface min-w-0">{title}</h3>
          <IconButton icon="close" onClick={onClose} title="Tutup" size="sm" className="-mt-1 -mr-1" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, max = 100, tone = 'brand' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = { brand: 'bg-primary', warn: 'bg-amber-500', bad: 'bg-red-500', info: 'bg-sky-500' };
  return (
    <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
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
