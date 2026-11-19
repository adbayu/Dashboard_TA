import clsx from 'clsx';

const KEPALA = 'whitespace-nowrap bg-surface-2 text-left text-xs font-semibold uppercase leading-4 tracking-wide text-text-2';

/**
 * Tabel data. Dua bentuk:
 * - design system: `columns` [{ key, label, align, num, render }] + `rows`, opsional `caption`;
 * - lama: `head` (daftar judul kolom) + baris `<tr>` sebagai children.
 * Huruf kapital hanya di kepala kolom tabel.
 */
export function Table({ head, children, columns, rows, caption }) {
  const bentukBaru = Array.isArray(columns) && Array.isArray(rows);
  return (
    <div data-ui="table" className="custom-scrollbar overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full text-[15px] leading-[22px] text-text">
        {caption && <caption className="px-4 py-3 text-left font-head text-base font-bold">{caption}</caption>}
        <thead className="border-b border-border">
          <tr>
            {bentukBaru
              ? columns.map((col) => (
                  <th key={col.key} scope="col" className={clsx(KEPALA, 'px-4 py-2.5', col.align === 'end' && 'text-right')}>
                    {col.label}
                  </th>
                ))
              : (head || []).map((th, index) => (
                  <th key={index} scope="col" className={clsx(KEPALA, 'px-3 py-2.5')}>
                    {th}
                  </th>
                ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bentukBaru
            ? rows.map((row, index) => (
                <tr key={row.id ?? index} className="hover:bg-surface-2">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx('px-4 py-3 align-middle', col.align === 'end' && 'text-right', col.num && 'font-num tabular-nums')}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            : children}
        </tbody>
      </table>
    </div>
  );
}

// Deretan tombol aksi di dalam tabel (mis. ubah/hapus). Dipakai bersama supaya
// jarak dan ukuran tombol aksi identik di seluruh halaman.
export function AksiBaris({ children }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
