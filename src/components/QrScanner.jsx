import { useEffect, useRef, useState } from 'react';
import { Button, Field, Input } from './ui';

// Pemindai QR kamera.
//
// Memakai `BarcodeDetector` yang sudah tertanam di Chrome/Edge — TIDAK perlu
// memasang library tambahan (proyek ini sengaja minim dependensi). Kalau
// browser tidak mendukung (Firefox/Safari), komponen memberi tahu terus terang
// dan pengguna tetap bisa mengetik kode alat secara manual. Tanpa kamera
// (diakses lewat http:// non-lokal) peringatannya juga jelas, bukan gagal diam.
//
// Deteksi dilakukan tiap 400 ms dari <video> ke <canvas>. Dua pengaman dipakai
// supaya tidak salah baca: nilai yang sama harus terbaca DUA KALI berturut-turut
// sebelum dianggap sah, dan setelah berhasil pemindaian dihentikan.

const JEDA_MS = 400;

export default function QrScanner({ onHasil, onBatal }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const kandidatRef = useRef({ nilai: '', ulang: 0 });
  const berhentiRef = useRef(false);

  const [status, setStatus] = useState('menyiapkan'); // menyiapkan | jalan | gagal
  const [galat, setGalat] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    const didukung = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    if (!didukung) {
      setStatus('gagal');
      setGalat(
        'Browser ini belum mendukung pemindaian QR langsung (butuh Chrome/Edge). ' +
          'Ketik kode alat secara manual di bawah.',
      );
      return undefined;
    }

    let detector = null;
    (async () => {
      try {
        const format = await window.BarcodeDetector.getSupportedFormats();
        if (!format.includes('qr_code')) throw new Error('format qr_code tidak didukung');
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        // Elemen <video> SELALU ter-mount (lihat render di bawah), jadi
        // srcObject bisa dipasang di sini. Kalau video baru dirender setelah
        // status berubah, ref-nya masih null dan kamera tidak pernah tersambung.
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            /* autoplay bisa ditolak — deteksi tetap jalan dari frame yang ada */
          }
        }
        setStatus('jalan');

        timerRef.current = setInterval(async () => {
          if (berhentiRef.current || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2 || !video.videoWidth) return;
          try {
            const kode = await detector.detect(video);
            if (!kode.length) {
              kandidatRef.current = { nilai: '', ulang: 0 };
              return;
            }
            const nilai = kode[0].rawValue || '';
            // Nilai sama harus muncul dua kali berturut-turut, supaya satu
            // frame buram tidak langsung dianggap hasil.
            if (nilai && kandidatRef.current.nilai === nilai) {
              kandidatRef.current.ulang += 1;
              if (kandidatRef.current.ulang >= 2) {
                berhentiRef.current = true;
                if (timerRef.current) clearInterval(timerRef.current);
                onHasil?.(nilai);
              }
            } else {
              kandidatRef.current = { nilai, ulang: 1 };
            }
          } catch {
            /* frame gagal dibaca — coba lagi di tick berikutnya */
          }
        }, JEDA_MS);
      } catch (err) {
        setStatus('gagal');
        const nama = err?.name || '';
        if (nama === 'NotAllowedError') {
          setGalat('Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi, atau ketik kode alat manual.');
        } else if (nama === 'NotFoundError') {
          setGalat('Kamera tidak ditemukan di perangkat ini. Ketik kode alat secara manual.');
        } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          setGalat('Kamera hanya bisa dipakai lewat HTTPS atau localhost. Ketik kode alat secara manual.');
        } else {
          setGalat(`Kamera tidak bisa dibuka (${err?.message || 'penyebab tidak diketahui'}). Ketik kode alat secara manual.`);
        }
      }
    })();

    return () => {
      berhentiRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onHasil]);

  const bawaan = 'rounded-2xl border border-outline-variant/40 bg-black/80 overflow-hidden';

  return (
    <div className="space-y-4">
      {/* <video> SELALU ada di DOM (disembunyikan saat belum siap) supaya ref-nya
          sudah terpasang sebelum kamera dibuka — kalau baru dirender setelah
          status berubah, srcObject tidak pernah menempel dan tidak ada frame
          yang bisa dibaca. */}
      <div className={status === 'jalan' ? 'relative' : 'hidden'}>
        <div className={bawaan}>
          <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted />
        </div>
        {/* Bingkai bantu arahkan QR ke tengah */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-44 h-44 border-4 border-white/80 rounded-2xl" />
        </div>
      </div>

      {status === 'jalan' && (
        <p className="text-center text-[11px] text-on-surface-variant">
          Arahkan kamera ke kode QR alat sampai terbaca.
        </p>
      )}

      {status === 'menyiapkan' && (
        <div className="aspect-video rounded-2xl panel-inset flex items-center justify-center" role="status">
          <span className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Menyiapkan kamera…
          </span>
        </div>
      )}

      {/* Kanvas tersembunyi: tempat BarcodeDetector membaca frame (jika perlu). */}
      <canvas ref={canvasRef} className="hidden" />

      {galat && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/25 border border-amber-400/60 px-3 py-2 text-[12px] font-semibold text-amber-900 dark:text-amber-100">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          {galat}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onHasil?.(manual.trim());
        }}
        className="space-y-2 rounded-2xl panel-inset p-3"
      >
        <Field label="Atau ketik / tempel kode alat" hint="cth. AQ-PH-001 — berguna bila kamera tidak tersedia.">
          <Input value={manual} onChange={setManual} placeholder="AQ-PH-001" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" icon="search" disabled={!manual.trim()}>
            Cari perangkat
          </Button>
          <Button type="button" variant="ghost" icon="close" onClick={onBatal}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}
