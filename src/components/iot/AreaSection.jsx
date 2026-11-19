import clsx from 'clsx';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';

const AREA = ['water', 'leaf', 'neutral'];
const AREA_ICON = { water: 'fish', leaf: 'sprout', neutral: 'droplet' };

/**
 * Bagian per area budidaya: judul + ikon jenis area + meta, lalu kisi
 * SensorReading. `data-area` menyetel --area-bg/--area-line/--area-fg untuk
 * semua anaknya (theme-surfaces.css). Ikon disembunyikan di Catatan Lapangan
 * dan Panel Instrumen, berwarna `primary` di Tanah & Lumut, oleh CSS.
 */
export default function AreaSection({ area = 'neutral', icon, title, meta, children, className = '' }) {
  const kind = AREA.includes(area) ? area : 'neutral';
  return (
    <section data-ui="area-section" data-area={kind} className={clsx('min-w-0', className)}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5">
        <span data-ui="area-icon" className="inline-flex shrink-0 items-center self-center">
          <IkonSlot icon={icon || AREA_ICON[kind]} size={20} />
        </span>
        <h2 className="font-head text-[19px] font-bold leading-[26px] text-text">{title}</h2>
        {meta && <span className="text-sm leading-5 text-text-2">{meta}</span>}
      </div>
      <div data-ui="readings" className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {children}
      </div>
    </section>
  );
}
