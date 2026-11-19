import { useEffect, useRef, useState } from 'react';
import { Button, Field, Input } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import {
  canOpenQrCamera,
  decodeQrFrame,
  nextQrCameraFacingMode,
  supportsQrCameraSwitch,
} from '../model/qrScanner.js';

// Pemindai membuka kamera lewat getUserMedia. QR dibaca dengan BarcodeDetector
// bila tersedia, dan memakai decoder software saat API native tidak ada.
// Nilai yang sama harus terbaca dua kali berturut-turut agar frame buram tidak
// langsung dianggap hasil; setelah berhasil, pemindaian dihentikan.

const JEDA_MS = 400;

export default function QrScanner({ onHasil, onBatal }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const kandidatRef = useRef({ nilai: '', ulang: 0 });
  const berhentiRef = useRef(false);
  const scanBusyRef = useRef(false);
  const onHasilRef = useRef(onHasil);
  const exactFacingModeRef = useRef(false);
  const cameraApiAvailable = typeof navigator !== 'undefined'
    && canOpenQrCamera(navigator);
  const initialCameraError = cameraApiAvailable
    ? ''
    : typeof window !== 'undefined' && !window.isSecureContext
      ? 'Kamera membutuhkan HTTPS atau localhost. Ketik kode alat secara manual.'
      : 'Browser ini tidak menyediakan akses kamera. Ketik kode alat secara manual.';

  const [status, setStatus] = useState(() => cameraApiAvailable ? 'menyiapkan' : 'gagal');
  const [galat, setGalat] = useState(initialCameraError);
  const [manual, setManual] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [cameraSwitchAvailable, setCameraSwitchAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let detector = null;
    berhentiRef.current = false;
    scanBusyRef.current = false;
    kandidatRef.current = { nilai: '', ulang: 0 };

    if (!cameraApiAvailable) return undefined;
    const mediaDevices = navigator.mediaDevices;

    const mulaiKamera = async () => {
      try {
        const facingModeConstraint = exactFacingModeRef.current
          ? { exact: cameraFacingMode }
          : { ideal: cameraFacingMode };
        const stream = await mediaDevices.getUserMedia({
          video: { facingMode: facingModeConstraint },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* video tetap disiapkan; stream masih bisa memberi frame setelah izin aktif */
        }

        if (!cancelled && typeof window.BarcodeDetector === 'function') {
          try {
            const formats = typeof window.BarcodeDetector.getSupportedFormats === 'function'
              ? await window.BarcodeDetector.getSupportedFormats()
              : [];
            if (formats.includes('qr_code')) {
              detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            }
          } catch {
            detector = null;
          }
        }
        if (cancelled) return;
        setStatus('jalan');
        if (typeof mediaDevices.enumerateDevices === 'function') {
          mediaDevices.enumerateDevices()
            .then((devices) => {
              if (cancelled) return;
              const videoInputCount = devices.filter((device) => device.kind === 'videoinput').length;
              setCameraSwitchAvailable(supportsQrCameraSwitch(navigator, videoInputCount));
            })
            .catch(() => {
              if (!cancelled) setCameraSwitchAvailable(false);
            });
        } else {
          setCameraSwitchAvailable(false);
        }

        timerRef.current = setInterval(async () => {
          if (cancelled || berhentiRef.current || scanBusyRef.current || !videoRef.current || !canvasRef.current) return;
          const activeVideo = videoRef.current;
          if (activeVideo.readyState < 2 || !activeVideo.videoWidth) return;
          scanBusyRef.current = true;
          try {
            let nilai = '';
            if (detector) {
              try {
                const codes = await detector.detect(activeVideo);
                nilai = codes[0]?.rawValue || '';
              } catch {
                detector = null;
              }
            }
            if (!detector) {
              const canvas = canvasRef.current;
              canvas.width = activeVideo.videoWidth;
              canvas.height = activeVideo.videoHeight;
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) return;
              context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
              nilai = decodeQrFrame(context.getImageData(0, 0, canvas.width, canvas.height)) || '';
            }
            if (!nilai) {
              kandidatRef.current = { nilai: '', ulang: 0 };
              return;
            }
            if (kandidatRef.current.nilai === nilai) {
              kandidatRef.current.ulang += 1;
              if (kandidatRef.current.ulang >= 2) {
                berhentiRef.current = true;
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = null;
                onHasilRef.current?.(nilai);
              }
            } else {
              kandidatRef.current = { nilai, ulang: 1 };
            }
          } catch {
            /* frame gagal dibaca — coba lagi di tick berikutnya */
          } finally {
            scanBusyRef.current = false;
          }
        }, JEDA_MS);
      } catch (err) {
        if (cancelled) return;
        setStatus('gagal');
        const nama = err?.name || '';
        if (nama === 'NotAllowedError' || nama === 'PermissionDeniedError') {
          setGalat('Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi, atau ketik kode alat manual.');
        } else if (nama === 'NotFoundError' || nama === 'DevicesNotFoundError') {
          setGalat('Kamera tidak ditemukan di perangkat ini. Ketik kode alat secara manual.');
        } else if (nama === 'NotReadableError' || nama === 'TrackStartError') {
          setGalat('Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.');
        } else if (nama === 'OverconstrainedError' || nama === 'ConstraintNotSatisfiedError') {
          const label = cameraFacingMode === 'user' ? 'depan' : 'belakang';
          setGalat(`Kamera ${label} tidak tersedia. Gunakan kamera lain atau ketik kode alat manual.`);
        } else {
          setGalat(`Kamera tidak bisa dibuka (${err?.message || 'penyebab tidak diketahui'}). Ketik kode alat secara manual.`);
        }
      }
    };

    const startTimer = window.setTimeout(() => {
      if (!cancelled) mulaiKamera();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      berhentiRef.current = true;
      scanBusyRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraApiAvailable, cameraFacingMode]);

  useEffect(() => {
    onHasilRef.current = onHasil;
  }, [onHasil]);

  const gantiKamera = () => {
    exactFacingModeRef.current = true;
    setGalat('');
    setStatus('menyiapkan');
    setCameraFacingMode((current) => nextQrCameraFacingMode(current));
  };

  return (
    <div className="space-y-4">
      {/* <video> SELALU ada di DOM (disembunyikan saat belum siap) supaya ref-nya
          sudah terpasang sebelum kamera dibuka — kalau baru dirender setelah
          status berubah, srcObject tidak pernah menempel dan tidak ada frame
          yang bisa dibaca. */}
      <div className={status === 'jalan' ? 'relative' : 'hidden'}>
        {/* qr-kamera: latar gelap tetap di semua tema agar pratinjau kamera tidak tampak pudar. */}
        <div className="qr-kamera overflow-hidden rounded-card border border-border">
          <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted />
        </div>
        {/* Bingkai bantu arahkan QR ke tengah */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="qr-bidik h-44 w-44 rounded-card" />
        </div>
      </div>

      {status === 'jalan' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="text-center text-sm text-text-2 sm:text-left">
            Kamera {cameraFacingMode === 'environment' ? 'belakang' : 'depan'} aktif. Arahkan ke kode QR alat.
          </p>
          {cameraSwitchAvailable && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="rotate-cw"
              title={`Ganti ke kamera ${cameraFacingMode === 'environment' ? 'depan' : 'belakang'}`}
              className="w-full shrink-0 sm:w-auto"
              onClick={gantiKamera}
            >
              {cameraFacingMode === 'environment' ? 'Depan' : 'Belakang'}
            </Button>
          )}
        </div>
      )}

      {status === 'menyiapkan' && (
        <div className="flex aspect-video items-center justify-center rounded-card border border-border bg-surface-2" role="status">
          <span className="flex items-center gap-2 text-sm text-text-2">
            <Icon name="loader-circle" className="animate-spin motion-reduce:animate-none" />
            Menyiapkan kamera…
          </span>
        </div>
      )}

      {/* Kanvas tersembunyi untuk membaca frame kamera dengan decoder software. */}
      <canvas ref={canvasRef} className="hidden" />

      {galat && (
        <p role="alert" className="flex items-start gap-2 rounded-card border border-warn-line bg-warn-bg px-3 py-2.5 text-sm text-text">
          <Icon name="triangle-alert" className="mt-0.5 shrink-0 text-warn-fg" />
          <span>{galat}</span>
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onHasil?.(manual.trim());
        }}
        className="flex flex-col gap-2 rounded-card bg-surface-2 p-3"
      >
        <Field label="Atau ketik / tempel kode alat" hint="cth. AQ-PH-001, berguna bila kamera tidak tersedia.">
          <Input value={manual} onChange={setManual} placeholder="AQ-PH-001" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" icon="search" disabled={!manual.trim()}>
            Cari perangkat
          </Button>
          <Button type="button" variant="ghost" icon="x" onClick={onBatal}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}
