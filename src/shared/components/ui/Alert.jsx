import clsx from 'clsx';
import { IkonSlot } from './IkonSlot.jsx';
import { TONE_ICON } from './tones.js';

const NADA = {
  warn: { kotak: 'bg-warn-bg border-warn-line', teks: 'text-warn-fg' },
  bad: { kotak: 'bg-bad-bg border-bad-line', teks: 'text-bad-fg' },
  info: { kotak: 'bg-info-bg border-info-fg', teks: 'text-info-fg' },
  ok: { kotak: 'bg-ok-bg border-ok-fg', teks: 'text-ok-fg' },
};

/**
 * Ringkasan satu penekanan per layar: apa yang terjadi (title), apa yang
 * harus dilakukan (children), dan satu aksi. Secara bawaan hanya `bad` yang
 * diumumkan (role="alert"). Ringkasan halaman memuat nilai yang berubah tiap
 * beberapa detik, jadi nada lain TIDAK menjadi live region kecuali pemanggil
 * memilih lewat `live` ('status' | 'alert'), mis. untuk hasil formulir atau
 * pesan sementara yang baru muncul.
 */
export function Alert({ tone = 'info', title, children, meta, action, icon, live, className = '' }) {
  const nama = NADA[tone] ? tone : 'info';
  const nada = NADA[nama];
  const role = live === 'status' || live === 'alert' ? live : (nama === 'bad' ? 'alert' : undefined);
  return (
    <div
      role={role}
      data-ui="alert"
      data-tone={nama}
      className={clsx('flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border px-4 py-3.5 text-text', nada.kotak, className)}
    >
      <div className="flex min-w-0 flex-[1_1_380px] items-start gap-2.5">
        <IkonSlot icon={icon || TONE_ICON[nama]} className={clsx('mt-0.5 shrink-0', nada.teks)} />
        <div className="min-w-0">
          {title && <b className={clsx('font-semibold', nada.teks)}>{title}</b>}
          {title && children ? ' ' : null}
          {children}
        </div>
      </div>
      {meta && <div className={clsx('flex items-center gap-1.5 text-sm', nama === 'bad' ? 'text-text' : 'text-text-2')}>{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
