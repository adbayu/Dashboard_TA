/**
 * Kepala halaman: satu judul per halaman, subjudul satu kalimat, aksi di kanan.
 * `sample` (true atau teks) memasang tanda "Data contoh" untuk layar yang
 * belum memakai data nyata. Judul bergradien di Lumina lewat theme-surfaces.css.
 */
export function PageHeader({ title, subtitle, actions, sample }) {
  const tanda = sample === true ? 'Data contoh' : sample;
  return (
    <div data-ui="page-header" className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 data-ui="page-title" className="text-balance font-head text-[26px] font-bold leading-8 tracking-tight text-text">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] leading-[22px] text-text-2">{subtitle}</p>}
      </div>
      {(actions || tanda) && (
        <div className="flex flex-wrap items-center gap-2">
          {tanda && (
            <span className="whitespace-nowrap rounded-control border border-dashed border-text-2 px-2 py-0.5 text-[13px] leading-[18px] text-text-2">
              {tanda}
            </span>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
