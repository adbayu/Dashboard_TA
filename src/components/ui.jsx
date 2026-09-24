import { useEffect } from 'react';

// ── Kartu dasar bergaya kaca (konsisten dengan tema Lumina Aqua) ──────────────
// min-w-0 wajib: tanpa ini kartu menolak menyusut di dalam CSS grid dan tabel
// di dalamnya mendorong halaman jadi bisa di-scroll ke samping di layar sempit.
export function Card({ children, className = '', as: Tag = 'section' }) {
  return <Tag className={`glass-card rounded-2xl p-5 min-w-0 ${className}`}>{children}</Tag>;
}

export function SectionTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">{eyebrow}</p>}
        <h2 className="text-xl font-bold text-on-surface mt-0.5">{title}</h2>
        {subtitle && <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
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

export function Badge({ children, tone = 'muted', icon }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONES[tone] || TONES.muted}`}>
      {icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}
      {children}
    </span>
  );
}

export const STATUS_TONE = { online: 'ok', warning: 'warn', maintenance: 'info', offline: 'bad' };
export const STATUS_LABEL = { online: 'Terhubung', warning: 'Perlu perhatian', maintenance: 'Perawatan', offline: 'Tidak terhubung' };

export function StatCard({ label, value, unit, icon, hint, tone = 'brand' }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant min-w-0">{label}</span>
        {icon && <span className={`material-symbols-outlined text-[20px] shrink-0 ${tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-primary'}`}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-on-surface">{value}</span>
        {unit && <span className="text-xs font-semibold text-on-surface-variant">{unit}</span>}
      </div>
      {hint && <p className="text-[11px] text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', type = 'button', icon, disabled, className = '' }) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-container shadow-emerald-glow',
    ghost: 'bg-white/60 dark:bg-white/10 border border-outline-variant/50 text-on-surface hover:bg-white dark:hover:bg-white/20',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    soft: 'bg-primary/10 text-primary hover:bg-primary/20 dark:text-emerald-glow',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full min-w-0 rounded-xl glass-input px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40';

export function Input({ value, onChange, ...rest }) {
  return <input {...rest} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className={inputCls} />;
}

export function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      {...rest}
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
      className={inputCls}
    />
  );
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select {...rest} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className={inputCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, ...rest }) {
  return <textarea {...rest} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} className={`${inputCls} min-h-[80px]`} />;
}

export function Empty({ title, hint, icon = 'inbox' }) {
  return (
    <div className="text-center py-10 px-4">
      <span className="material-symbols-outlined text-4xl text-outline/60">{icon}</span>
      <p className="mt-2 font-bold text-on-surface">{title}</p>
      {hint && <p className="text-sm text-on-surface-variant mt-1">{hint}</p>}
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`glass-panel rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[88vh] overflow-y-auto custom-scrollbar p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface" aria-label="Tutup">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, max = 100, tone = 'brand' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    brand: 'bg-primary',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
    info: 'bg-sky-500',
  };
  return (
    <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colors[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-outline-variant/40">
      <table className="w-full text-sm">
        <thead className="bg-surface-container/70">
          <tr>
            {head.map((th) => (
              <th key={th} className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
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
