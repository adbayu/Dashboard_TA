import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// QR asli (bisa dipindai kamera) berisi tautan detail alat.
export default function QrCode({ value, size = 200, caption }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#0f5238', light: '#ffffff' } })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc('');
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className="rounded-2xl border border-outline-variant/40 bg-surface-container flex items-center justify-center"
        style={{ width: size, height: size }}
        role="status"
      >
        <span className="material-symbols-outlined text-outline animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <figure className="text-center">
      <img
        src={src}
        width={size}
        height={size}
        alt={`Kode QR alat ${caption || value}`}
        className="rounded-2xl border border-outline-variant/40 bg-white p-2 mx-auto"
      />
      <figcaption className="text-[11px] text-on-surface-variant mt-2 break-all max-w-[240px] mx-auto">{value}</figcaption>
    </figure>
  );
}
