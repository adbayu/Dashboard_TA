import React, { useState } from 'react';

export default function CalibrationModal({ isOpen, onClose, sensor, onCalibrate }) {
  const [step, setStep] = useState(1);
  const [calibrating, setCalibrating] = useState(false);

  if (!isOpen || !sensor) return null;

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setCalibrating(true);
      setTimeout(() => {
        setCalibrating(false);
        onCalibrate(sensor.id);
        onClose();
        setStep(1);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/80 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl fill">science</span>
            </div>
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">Wisaya Kalibrasi Sensor</h3>
              <p className="text-xs text-outline font-mono">ID: {sensor.id} ({sensor.type})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-variant/50 flex items-center justify-center text-outline"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-primary text-white shadow-md'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-surface-container-high text-outline'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-semibold ${step === s ? 'text-primary' : 'text-outline'}`}>
                {s === 1 ? 'Pembersihan' : s === 2 ? 'Larutan Buffer' : 'Konfirmasi'}
              </span>
              {s < 3 && <div className="w-10 h-0.5 bg-outline-variant/30 hidden sm:block"></div>}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-outline-variant/20 mb-6 min-h-[160px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-2 text-xs text-on-surface-variant">
              <p className="font-bold text-on-surface text-sm">Langkah 1: Pembersihan Probe & Elektroda</p>
              <p>
                Angkat probe sensor <strong>{sensor.id}</strong> dari {sensor.location}. Bilas kaca sensitif probe menggunakan air deionisasi (akuades) dan keringkan dengan tisu optik secara lembut.
              </p>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2 mt-2">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>Jangan menggosok permukaan kaca elektroda secara kasar.</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2 text-xs text-on-surface-variant">
              <p className="font-bold text-on-surface text-sm">Langkah 2: Perendaman Larutan Kalibrator</p>
              <p>
                Celupkan probe ke dalam larutan kalibrasi standar (Buffer pH 7.00 atau 1413 µS/cm). Pastikan suhu larutan terukur sekitar 25°C.
              </p>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary text-[11px] font-medium flex items-center gap-2 mt-2">
                <span className="material-symbols-outlined text-base">timer</span>
                <span>Tunggu sekitar 60 detik hingga sinyal analog stabil sebelum melanjutkan.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-xs text-on-surface-variant">
              <p className="font-bold text-on-surface text-sm">Langkah 3: Simpan Offset & Sinkronisasi Node</p>
              <p>
                Sinyal analog terdeteksi pada <strong>1.482 V</strong> (Offset: +0.02 pH). Tekan "Simpan Kalibrasi" untuk memprogram ulang firmware node telemetri.
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-2 mt-2">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Status sensor akan kembali ke Optimal setelah proses ini selesai.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || calibrating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:text-on-surface disabled:opacity-30"
          >
            Kembali
          </button>
          <button
            onClick={handleNextStep}
            disabled={calibrating}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-md transition-all flex items-center gap-2"
          >
            {calibrating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Menyimpan...</span>
              </>
            ) : step === 3 ? (
              'Simpan Kalibrasi'
            ) : (
              'Lanjutkan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
