import clsx from 'clsx';
import { useId, useState } from 'react';
import { linkLabelToControl } from '../../../utils/frontendReview.js';
import { Icon } from '../Icon.jsx';
import { UKURAN } from '../ui.jsx';
import { FOKUS } from './tones.js';

// Garis kontrol memakai `text-2` (≥ 3:1 terhadap `surface` di kesepuluh palet,
// dicek uiContrast.test.js); `border` terlalu samar untuk batas kontrol.
const KONTROL = clsx(
  'w-full min-w-0 rounded-control border border-text-2 bg-surface px-3 text-[15px] leading-[22px] text-text',
  'placeholder:text-text-2 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-text-2',
  'aria-[invalid=true]:border-bad-fg aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-bad-fg',
  FOKUS,
);

/**
 * Label + kontrol + petunjuk/galat. Label ditautkan ke kontrol pertama di dalam
 * children (juga bila kontrol dibungkus elemen lain). Label dipatok satu baris
 * supaya kolom form yang bersebelahan tetap sejajar.
 */
export function Field({ label, hint, error, optional, id: idProp, children, className = '' }) {
  const generatedId = useId();
  const { id, control } = linkLabelToControl(children, idProp || generatedId, [Input, NumberInput, Select, TextArea]);
  return (
    <div className={clsx('block min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block truncate text-sm font-semibold leading-5 text-text">
        {label}
        {optional && <span className="font-normal text-text-2"> (opsional)</span>}
      </label>
      {control}
      {hint && !error && <span className="mt-1 block text-sm text-text-2">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-start gap-1.5 text-sm text-bad-fg">
          <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

// Semua input bawaan memanggil onChange dengan NILAI (bukan event), sesuai
// pemakaian di halaman yang sudah ada.
export function Input({ value, onChange, invalid, className = '', ...rest }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={clsx(KONTROL, UKURAN.md.tinggi, className)}
    />
  );
}

export function NumberInput({ value, onChange, invalid, className = '', ...rest }) {
  return (
    <input
      {...rest}
      type="number"
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
      className={clsx(KONTROL, 'font-num tabular-nums', UKURAN.md.tinggi, className)}
    />
  );
}

/** `options`: [{ value, label }] atau daftar teks. `className` dipasang di pembungkus. */
export function Select({ value, onChange, options = [], placeholder, invalid, className = '', ...rest }) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <select
        {...rest}
        aria-invalid={invalid || rest['aria-invalid'] || undefined}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        className={clsx(KONTROL, UKURAN.md.tinggi, 'cursor-pointer appearance-none pr-9')}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-2" />
    </div>
  );
}

export function TextArea({ value, onChange, invalid, className = '', ...rest }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={clsx(KONTROL, 'min-h-[88px] py-2', className)}
    />
  );
}

/** Kotak centang dengan label. `onChange` menerima event bawaan input. */
export function Checkbox({ label, invalid, className = '', ...rest }) {
  return (
    <label className={clsx('inline-flex cursor-pointer items-start gap-2.5 text-[15px] leading-[22px] text-text', className)}>
      <span className="relative mt-0.5 inline-grid h-[18px] w-[18px] shrink-0">
        <input
          {...rest}
          type="checkbox"
          aria-invalid={invalid || undefined}
          className={clsx(
            'peer h-[18px] w-[18px] cursor-pointer appearance-none rounded border-[1.5px] border-text-2 bg-surface',
            'checked:border-primary checked:bg-primary aria-[invalid=true]:border-bad-fg',
            'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2',
            FOKUS,
          )}
        />
        <Icon
          name="check"
          size={14}
          strokeWidth={2.5}
          className="pointer-events-none absolute inset-0 m-auto hidden text-on-primary peer-checked:block"
        />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** Saklar nyala/mati. `onChange(checked)` menerima nilai boolean baru. */
export function Switch({ label, checked, defaultChecked = false, onChange, disabled }) {
  const [lokal, setLokal] = useState(defaultChecked);
  const nyala = checked ?? lokal;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      disabled={disabled}
      onClick={() => {
        if (checked === undefined) setLokal(!nyala);
        onChange?.(!nyala);
      }}
      className={clsx(
        'inline-flex items-center gap-2.5 rounded-control text-[15px] leading-[22px] text-text disabled:cursor-not-allowed disabled:text-text-2',
        FOKUS,
      )}
    >
      <span
        className={clsx(
          'relative h-[22px] w-[38px] shrink-0 rounded-pill border-[1.5px]',
          nyala ? 'border-primary bg-primary' : 'border-text-2 bg-surface-2',
        )}
      >
        <span
          className={clsx(
            'absolute top-[2px] h-[15px] w-[15px] rounded-full transition-[left] duration-150 motion-reduce:transition-none',
            nyala ? 'left-[18px] bg-on-primary' : 'left-[2px] bg-text-2',
          )}
        />
      </span>
      {label}
    </button>
  );
}
