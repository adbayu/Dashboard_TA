import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../../components/Icon.jsx';
import { opsiGambarQr } from '../opsiQr.js';

// QR asli (bisa dipindai kamera) berisi tautan detail alat. Gambar selalu
// hitam di atas putih dan duduk di `.qr-plate` (pelat terang tetap, lihat
// index.css), jadi tetap terbaca di kelima tema, terang maupun gelap.
export default function QrCode({ value, size = 200, caption }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, opsiGambarQr(size * 2))
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
        className="flex items-center justify-center gap-2 rounded-card border border-border bg-surface-2 text-sm text-text-2"
        style={{ width: size, height: size }}
        role="status"
      >
        <Icon name="loader-circle" className="animate-spin motion-reduce:animate-none" />
        <span className="sr-only">Membuat kode QR...</span>
      </div>
    );
  }

  return (
    <figure className="text-center">
      <span className="qr-plate mx-auto inline-block rounded-control border border-border p-2">
        <img src={src} width={size} height={size} alt={`Kode QR alat ${caption || value}`} className="block" />
      </span>
      <figcaption className="mx-auto mt-2 max-w-[240px] break-all font-mono text-xs text-text-2">{value}</figcaption>
    </figure>
  );
}
