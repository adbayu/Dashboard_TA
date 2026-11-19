import clsx from 'clsx';

const UKURAN_AVATAR = { sm: 28, md: 36, lg: 44 };

function inisialDari(nama) {
  return (nama || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase();
}

/**
 * Avatar akun: inisial nama. Bentuk data avatar lama = { id, warna, warnaTeks }
 * (warna pilihan pengguna, berasal dari data); tanpa itu dipakai token
 * `primary` / `on-primary`. `size` boleh angka piksel (lama) atau sm | md | lg.
 */
export function Avatar({ avatar, nama, name, size = 40, className = '' }) {
  const piksel = typeof size === 'number' ? size : UKURAN_AVATAR[size] || UKURAN_AVATAR.md;
  const warnaData = avatar?.warna ? { backgroundColor: avatar.warna, color: avatar.warnaTeks } : null;
  return (
    <span
      aria-hidden="true"
      data-ui="avatar"
      className={clsx(
        'inline-flex select-none items-center justify-center rounded-control font-bold tracking-[0.02em]',
        !warnaData && 'bg-primary text-on-primary',
        className,
      )}
      style={{ width: piksel, height: piksel, minWidth: piksel, fontSize: Math.max(11, Math.round(piksel * 0.36)), ...warnaData }}
    >
      {inisialDari(nama ?? name)}
    </span>
  );
}

// Tombol pemilih avatar: bentuk yang sama dengan yang tampil di sidebar/profil,
// jadi yang dilihat pengguna di daftar pilihan persis sama dengan hasilnya.
export function AvatarPilih({ avatar, nama, terpilih, onClick, size = 48, label = 'Pilih avatar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={terpilih}
      className={clsx(
        'overflow-hidden rounded-control border-2 transition-colors',
        terpilih ? 'border-primary ring-2 ring-focus' : 'border-transparent hover:border-text-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      )}
    >
      <Avatar avatar={avatar} nama={nama} size={size} />
    </button>
  );
}
