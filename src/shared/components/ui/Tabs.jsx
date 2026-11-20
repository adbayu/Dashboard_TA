import clsx from 'clsx';
import { useId, useRef, useState } from 'react';
import { FOKUS } from './tones.js';
import { tujuanTab } from './tujuanTab.js';

/**
 * Tab dengan pola ARIA tablist: panah kiri/kanan, Home, End berpindah tab.
 * Terkontrol lewat `value` + `onChange`, atau mandiri lewat `defaultValue`.
 * Isi panel diambil dari `tabs[i].content`, atau `children` bila tidak ada.
 */
export function Tabs({ tabs = [], value, defaultValue, onChange, label, children }) {
  const [lokal, setLokal] = useState(defaultValue ?? tabs[0]?.id);
  const aktif = value ?? lokal;
  const dasar = useId();
  const daftar = useRef(null);
  const indeksAktif = Math.max(0, tabs.findIndex((tab) => tab.id === aktif));

  const pilih = (id) => {
    if (value === undefined) setLokal(id);
    onChange?.(id);
  };

  const onKeyDown = (event) => {
    const tujuan = tujuanTab(event.key, indeksAktif, tabs.length);
    if (tujuan == null) return;
    event.preventDefault();
    pilih(tabs[tujuan].id);
    daftar.current?.querySelectorAll('[role="tab"]')[tujuan]?.focus();
  };

  const tabAktif = tabs[indeksAktif];
  const isi = tabAktif?.content ?? children;

  return (
    <div data-ui="tabs">
      <div
        ref={daftar}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="custom-scrollbar flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab, index) => {
          const terpilih = index === indeksAktif;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${dasar}-tab-${tab.id}`}
              aria-selected={terpilih}
              aria-controls={`${dasar}-panel`}
              tabIndex={terpilih ? 0 : -1}
              data-ui="tab"
              onClick={() => pilih(tab.id)}
              className={clsx(
                '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[15px] font-semibold leading-[22px]',
                terpilih ? 'border-primary text-text' : 'border-transparent text-text-2 hover:text-text',
                FOKUS,
              )}
            >
              {tab.label}
              {tab.count != null && (
                <span className="rounded-control bg-surface-2 px-1.5 font-num text-xs leading-4 text-text-2">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {isi != null && (
        <div role="tabpanel" id={`${dasar}-panel`} aria-labelledby={tabAktif ? `${dasar}-tab-${tabAktif.id}` : undefined} className="pt-4">
          {isi}
        </div>
      )}
    </div>
  );
}
