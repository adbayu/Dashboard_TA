import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui';

// Aksi pada kartu QR alat: UNDUH PNG, SALIN ISI, CETAK LABEL.
//
// Kenapa satu komponen: QR alat muncul di empat pintu masuk (Detail Information
// pengguna, modal QR pengguna di List IoT, modal QR pengelola di Kelola IoT, dan
// halaman pengelola /admin/detail-informasi). Sebelumnya satu-satunya cara
// menyimpan QR adalah klik kanan gambar lalu "simpan sebagai" — tidak ada tombol
// sama sekali. Menaruh tombolnya di sini membuat keempat pintu itu seragam dan
// tidak perlu diulang.
//
// PNG yang diunduh BUKAN gambar QR mentah, melainkan label siap tempel:
// QR + kode alat + nama perangkat + isi QR, di kanvas putih 900x1100 px
// (±7,6 cm pada 300 dpi) supaya hasil cetak tajam, tidak pecah seperti QR 200px
// yang diperbesar. Semua dibuat saat tombol diklik, jadi tidak ada kerja
// tambahan saat halaman dibuka.

const LEBAR = 900;
const QR_PX = 820;
const WARNA = { qr: '#0f5238', kode: '#0f5238', nama: '#3f4a44', isi: '#6b7770' };

// Perkecil huruf sampai teksnya muat di lebar kanvas — isi QR bisa berupa tautan
// panjang (…/iot/IOT-001) yang akan melewati tepi kalau ukurannya dipatok.
function ukuranMuat(g, teks, maks, awal) {
  let px = awal;
  while (px > 14) {
    g.font = `${px}px system-ui, sans-serif`;
    if (g.measureText(teks).width <= maks) break;
    px -= 2;
  }
  return px;
}

// Label PNG (data URL) berisi QR + keterangan alat.
// oxlint-disable-next-line react/only-export-components -- Shared QR helper stays beside its existing consumer.
export async function buatLabelPng(value, { kode, nama } = {}) {
  const qrUrl = await QRCode.toDataURL(value, {
    width: QR_PX,
    margin: 2,
    color: { dark: WARNA.qr, light: '#ffffff' },
  });
  const img = new Image();
  await new Promise((selesai, gagal) => {
    img.onload = selesai;
    img.onerror = gagal;
    img.src = qrUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = LEBAR;
  canvas.height = 1100;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, LEBAR, canvas.height);
  g.drawImage(img, 40, 40, QR_PX, QR_PX);

  g.textAlign = 'center';
  const tengah = LEBAR / 2;

  g.fillStyle = WARNA.kode;
  g.font = `bold ${ukuranMuat(g, kode || '', LEBAR - 80, 58)}px system-ui, sans-serif`;
  g.fillText(kode || '', tengah, 950);

  if (nama) {
    g.fillStyle = WARNA.nama;
    g.font = `${ukuranMuat(g, nama, LEBAR - 80, 34)}px system-ui, sans-serif`;
    g.fillText(nama, tengah, 1000);
  }

  g.fillStyle = WARNA.isi;
  g.font = `${ukuranMuat(g, value, LEBAR - 80, 24)}px system-ui, sans-serif`;
  g.fillText(value, tengah, 1050);

  return canvas.toDataURL('image/png');
}

function unduhDataUrl(dataUrl, namaBerkas) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Fallback untuk konteks yang tidak punya Clipboard API (mis. alamat non-HTTPS
// di jaringan lokal). Tanpa ini tombol salin tampak gagal diam-diam.
async function salinTeks(teks) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* jatuh ke cara lama di bawah */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function AksiQr({ value, kode, nama, size = 'sm', className = '' }) {
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState('info'); // info | gagal
  const [sibuk, setSibuk] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function kabari(teks, macam = 'info') {
    setPesan(teks);
    setJenis(macam);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPesan(''), 4000);
  }

  async function siapkanLabel() {
    return buatLabelPng(value, { kode, nama });
  }

  async function unduh() {
    setSibuk(true);
    try {
      const url = await siapkanLabel();
      unduhDataUrl(url, `qr-${kode || 'alat'}.png`);
      kabari(`Label QR ${kode || ''} diunduh (PNG siap tempel).`);
    } catch {
      kabari('Gagal membuat gambar QR. Coba lagi atau gunakan cetak.', 'gagal');
    } finally {
      setSibuk(false);
    }
  }

  async function salin() {
    setSibuk(true);
    const ok = await salinTeks(value);
    setSibuk(false);
    kabari(
      ok ? 'Isi QR disalin. Tempel di kolom pencarian untuk mengujinya.' : 'Browser menolak menyalin. Pilih teksnya manual dari kotak isi QR.',
      ok ? 'info' : 'gagal',
    );
  }

  async function cetak() {
    setSibuk(true);
    let url = '';
    try {
      url = await siapkanLabel();
    } catch {
      setSibuk(false);
      kabari('Gagal membuat gambar QR untuk dicetak.', 'gagal');
      return;
    }
    setSibuk(false);

    const jendela = window.open('', '_blank', 'width=760,height=900');
    if (!jendela) {
      kabari('Jendela cetak diblokir browser. Pakai "Unduh PNG" lalu cetak gambarnya.', 'gagal');
      return;
    }
    jendela.document.write(
      `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Label QR ${kode || 'alat'}</title>` +
        '<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;' +
        'background:#fff;font-family:system-ui,sans-serif}img{width:76mm;height:auto}</style></head>' +
        `<body><img src="${url}" alt="Label QR ${kode || 'alat'}"></body></html>`,
    );
    jendela.document.close();
    jendela.focus();
    // Beri waktu gambar dimuat; tanpa jeda, halaman bisa tercetak kosong.
    setTimeout(() => jendela.print(), 350);
    kabari('Jendela cetak dibuka. Pilih printer atau "Simpan sebagai PDF".');
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button size={size} icon="download" onClick={unduh} disabled={sibuk}>
          Unduh PNG
        </Button>
        <Button size={size} variant="ghost" icon="content_copy" onClick={salin} disabled={sibuk}>
          Salin isi QR
        </Button>
        <Button size={size} variant="ghost" icon="print" onClick={cetak} disabled={sibuk}>
          Cetak label
        </Button>
      </div>
      {pesan && (
        <p
          role="status"
          className={`mt-2 text-[11px] font-semibold ${jenis === 'gagal' ? 'text-red-600' : 'text-on-surface-variant'}`}
        >
          {pesan}
        </p>
      )}
    </div>
  );
}
