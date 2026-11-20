import { useRef } from 'react';
import clsx from 'clsx';
import { Icon } from '../components/Icon.jsx';
import { FOKUS } from '../components/ui/tones.js';
import { handleRadioKeyDown } from './rovingRadio.js';
import { MODE_INFO } from './temaInfo.js';

const IDS = MODE_INFO.map((mode) => mode.id);

/**
 * Kontrol segmen Terang / Gelap / Ikuti sistem (radiogroup, roving tabIndex,
 * panah/Home/End). Nilai: terang | gelap | sistem. Di Lumina radius kontrol
 * 999 px membuat segmen otomatis berbentuk pill.
 */
export function ModeToggle({ value, onChange, label = 'Mode warna', className }) {
  const terpilih = IDS.includes(value) ? value : 'sistem';
  const refs = useRef({});

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-ui="mode-toggle"
      className={clsx(
        'inline-flex max-w-full flex-wrap gap-0.5 rounded-[calc(var(--radius-control)_+_3px)] border border-border bg-surface-2 p-[3px]',
        className,
      )}
      onKeyDown={(event) =>
        handleRadioKeyDown(event, { ids: IDS, value: terpilih, onChange, focus: (id) => refs.current[id]?.focus() })
      }
    >
      {MODE_INFO.map((mode) => {
        const on = mode.id === terpilih;
        return (
          <button
            key={mode.id}
            ref={(el) => {
              refs.current[mode.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange?.(mode.id)}
            className={clsx(
              'inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-control px-3 text-sm font-semibold leading-5 transition-colors duration-200',
              // Terpilih: garis primary di bawah label (>= 3:1, WCAG 1.4.11), bukan hanya latar.
              on
                ? "relative bg-surface text-text ring-1 ring-border before:absolute before:inset-x-3 before:bottom-[3px] before:h-0.5 before:rounded-full before:bg-primary before:content-['']"
                : 'text-text-2 hover:text-text',
              FOKUS,
            )}
          >
            <Icon name={mode.icon} size={16} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export default ModeToggle;
