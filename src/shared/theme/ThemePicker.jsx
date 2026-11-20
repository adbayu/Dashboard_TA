import { useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Icon } from '../components/Icon.jsx';
import { FOKUS } from '../components/ui/tones.js';
import { loadThemeFonts } from './loadThemeFonts.js';
import { handleRadioKeyDown } from './rovingRadio.js';
import { useTampilan } from './TampilanProvider.jsx';
import { TEMA_INFO } from './temaInfo.js';

const IDS = TEMA_INFO.map((tema) => tema.id);

/**
 * Pratinjau mini satu tema: mini sidebar + judul (huruf judul tema) + swatch
 * primary + petak sensor. `data-pratinjau` + `data-theme` + `data-mode` membuat
 * themes.css mengisi variabel tema itu di elemen ini (Ruling R11), jadi semua
 * kelas token di dalamnya berwarna tema tersebut, bukan tema halaman. Latar dan
 * warna teks dipasang di elemen ini sendiri supaya nilai halaman tidak bocor.
 * Perlakuan bentuk (Catatan Lapangan, Lumina) ada di theme-surfaces.css.
 */
function Pratinjau({ id, mode, kecil = false }) {
  return (
    <span
      data-pratinjau=""
      data-theme={id}
      data-mode={mode}
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 overflow-hidden rounded-[calc(var(--radius-card)_-_2px)] border border-border bg-bg font-body text-text',
        kecil ? 'h-10 w-14 grid-cols-[12px_1fr]' : 'h-[92px] grid-cols-[28px_1fr]',
      )}
    >
      <span
        data-ui="pratinjau-side"
        className={clsx('flex flex-col items-center gap-1.5 border-r border-side-line bg-side-bg', kecil ? 'pt-1.5' : 'pt-2')}
      >
        <span className={clsx('rounded-[3px] bg-mark-bg', kecil ? 'h-1.5 w-1.5' : 'h-3.5 w-3.5')} />
        {!kecil && (
          <>
            <span className="h-[3px] w-3.5 rounded-sm bg-side-text" />
            <span className="h-[3px] w-3.5 rounded-sm bg-side-text-2" />
            <span className="h-[3px] w-3.5 rounded-sm bg-side-text-2" />
          </>
        )}
      </span>
      <span className={clsx('flex min-w-0 flex-col', kecil ? 'gap-1 p-1' : 'gap-1.5 p-2')}>
        <span className="flex items-center justify-between gap-1">
          <span className={clsx('truncate font-head font-semibold', kecil ? 'text-[10px] leading-3' : 'text-xs leading-[14px]')}>
            {kecil ? 'Aa' : 'Pantauan'}
          </span>
          <span className={clsx('shrink-0 rounded-pill bg-primary', kecil ? 'h-1.5 w-3' : 'h-2 w-6')} />
        </span>
        <span
          data-ui="pratinjau-tile"
          className={clsx(
            'block overflow-hidden rounded-[calc(var(--radius-card)_/_2_+_1px)] border border-water-line bg-surface',
            kecil && 'h-3',
          )}
        >
          {!kecil && (
            <>
              <span className="block h-2.5 border-b border-water-line bg-water-bg" />
              <span className="block px-1.5 pt-0.5 font-num text-[15px] font-semibold leading-[18px] tabular-nums">6,8</span>
              <span className="relative mx-1.5 mb-1.5 mt-1 block h-[3px] rounded-sm bg-track">
                <span className="absolute inset-y-0 left-1/3 w-1/3 rounded-sm bg-band" />
              </span>
            </>
          )}
        </span>
      </span>
    </span>
  );
}

/**
 * Pemilih lima tema sebagai radiogroup (roving tabIndex: hanya radio tercentang
 * yang bisa di-Tab; panah/Home/End memindah pilihan). `mode` (light|dark)
 * mewarnai pratinjau; bawaannya mode terhitung saat ini. `compact` dipakai di
 * popover top bar: daftar satu kolom tanpa deskripsi.
 */
export function ThemePicker({ value, onChange, mode, label = 'Tema tampilan', compact = false, className }) {
  const { resolvedMode } = useTampilan();
  const modePratinjau = (mode ?? resolvedMode) === 'dark' ? 'dark' : 'light';
  const terpilih = IDS.includes(value) ? value : IDS[0];
  const refs = useRef({});
  const idDasar = useId();

  // Muat huruf kelima tema agar contoh judul di pratinjau memakai huruf aslinya.
  useEffect(() => {
    for (const id of IDS) loadThemeFonts(id);
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-ui="theme-picker"
      className={clsx(
        compact ? 'flex flex-col gap-1.5' : 'grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3',
        className,
      )}
      onKeyDown={(event) =>
        handleRadioKeyDown(event, { ids: IDS, value: terpilih, onChange, focus: (id) => refs.current[id]?.focus() })
      }
    >
      {TEMA_INFO.map((tema) => {
        const on = tema.id === terpilih;
        const idDeskripsi = `${idDasar}-${tema.id}`;
        return (
          <button
            key={tema.id}
            ref={(el) => {
              refs.current[tema.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={!compact && tema.catatan ? `${tema.nama} (${tema.catatan})` : tema.nama}
            aria-describedby={compact ? undefined : idDeskripsi}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange?.(tema.id)}
            className={clsx(
              'relative border bg-surface text-left text-text transition-colors duration-200',
              compact ? 'flex items-center gap-3 rounded-control p-1.5' : 'flex flex-col gap-2 rounded-card p-2',
              on ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-text-2',
              FOKUS,
            )}
          >
            <Pratinjau id={tema.id} mode={modePratinjau} kecil={compact} />
            {compact ? (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-5">{tema.nama}</span>
                {on && <Icon name="check" size={16} strokeWidth={2.5} className="shrink-0 text-primary" />}
              </>
            ) : (
              <>
                {on && (
                  <span className="absolute right-3.5 top-3.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-primary text-on-primary">
                    <Icon name="check" size={14} strokeWidth={2.5} />
                  </span>
                )}
                <span className="px-1 text-[15px] font-bold leading-5">
                  {tema.nama}
                  {tema.catatan && <span className="font-normal text-text-2"> ({tema.catatan})</span>}
                </span>
                <span id={idDeskripsi} className="px-1 pb-1 text-sm text-text-2">
                  {tema.deskripsi}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ThemePicker;
