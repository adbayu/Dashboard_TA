import clsx from 'clsx';

const PADDING = { sm: 'p-4', md: 'p-5', none: '' };
const AREA = ['water', 'leaf', 'neutral'];

/**
 * Permukaan kartu. Perlakuan per tema (kepala berwarna area di Kebun Air,
 * tanpa kotak di Catatan Lapangan, kaca di Lumina) ada di theme-surfaces.css
 * dan menempel lewat atribut `data-ui="card"`, `data-area`, `data-pad`.
 * min-w-0 wajib: tanpa ini kartu menolak menyusut di dalam CSS grid.
 */
export function Card({ children, className = '', as: Tag = 'section', pad = 'md', area = 'neutral', title, subtitle, action }) {
  const padKey = Object.hasOwn(PADDING, pad) ? pad : 'md';
  const areaKey = AREA.includes(area) ? area : 'neutral';
  const adaKepala = Boolean(title || subtitle || action);
  return (
    <Tag
      data-ui="card"
      data-area={areaKey}
      data-pad={padKey}
      className={clsx('min-w-0 rounded-card border border-border bg-surface text-text', PADDING[padKey], className)}
    >
      {adaKepala && (
        <div data-ui="card-head" className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-head text-base font-bold leading-[22px] text-text">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/**
 * Judul bagian di dalam kartu. Prop lama `eyebrow` sengaja diabaikan: design
 * system melarang eyebrow huruf kapital di atas judul.
 */
export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <h2 className="font-head text-[19px] font-bold leading-[26px] text-text">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-text-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
