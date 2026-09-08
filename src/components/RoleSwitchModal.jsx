import React from 'react';
import { USER_ROLES } from '../store/useFarmStore';

export default function RoleSwitchModal({ isOpen, onClose, currentRole, onSelectRole }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/80 dark:border-white/10">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl fill">badge</span>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">Pilih Peran Pengguna</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-variant/50 flex items-center justify-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant mb-4">
          Beralih antara peran untuk menguji hak akses otorisasi, pengaturan ambang batas, dan hak kalibrasi sensor di kebun.
        </p>

        <div className="space-y-3">
          {/* Agronomist Role Option */}
          <div
            onClick={() => {
              onSelectRole('agronomist');
              onClose();
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
              currentRole === 'agronomist'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-outline-variant/30 hover:border-primary/40 bg-white/40 dark:bg-white/5'
            }`}
          >
            <img
              src={USER_ROLES.agronomist.avatar}
              alt="Agronomist"
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/40 shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-on-surface">Dr. Ir. Hendra Wicaksono</h4>
                {currentRole === 'agronomist' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">Aktif</span>
                )}
              </div>
              <p className="text-xs text-primary font-semibold mt-0.5">Kepala Tim Agronomi (Level 4)</p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Akses penuh: Kalibrasi sensor, perubahan ambang batas IoT, konfigurasi RAG LLM, ekspor laporan.
              </p>
            </div>
          </div>

          {/* Operator Role Option */}
          <div
            onClick={() => {
              onSelectRole('operator');
              onClose();
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
              currentRole === 'operator'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-outline-variant/30 hover:border-primary/40 bg-white/40 dark:bg-white/5'
            }`}
          >
            <img
              src={USER_ROLES.operator.avatar}
              alt="Operator"
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-secondary/40 shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-on-surface">Budi Santoso</h4>
                {currentRole === 'operator' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">Aktif</span>
                )}
              </div>
              <p className="text-xs text-secondary font-semibold mt-0.5">Operator Lapangan (Level 2)</p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Akses operasional: Pemantauan telemetri real-time, pencatatan log harian, konsultasi asisten AI.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-outline-variant/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high/60 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
