import React, { useState } from 'react';

export default function Profil({ currentUser, onOpenRoleModal }) {
  const [twoFactor, setTwoFactor] = useState(true);
  const [alertsWhatsapp, setAlertsWhatsapp] = useState(true);
  const [alertsTelegram, setAlertsTelegram] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-white/80 dark:via-white/5 to-secondary/10 p-6 rounded-3xl border border-white dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-2xl fill">badge</span>
          </div>
          <div>
            <h1 className="font-headline-md text-xl text-on-surface font-bold">Pusat Kredensial & Kontrol Operasional</h1>
            <p className="font-body-md text-xs text-on-surface-variant">
              Manajemen Akun, Preferensi Notifikasi & Hak Akses Sistem Otomasi AquaSmartponik Terintegrasi.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenRoleModal}
          className="px-4 py-2 rounded-xl bg-white/90 dark:bg-white/10 border border-outline-variant/40 hover:border-primary/50 text-xs font-bold text-primary dark:text-emerald-glow transition-all flex items-center gap-2 self-start md:self-auto shadow-sm"
        >
          <span className="material-symbols-outlined text-base">swap_horiz</span>
          <span>Ganti Peran Pengguna</span>
        </button>
      </div>

      {/* 2-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 of 12 cols): Identity Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-3xl p-6 shadow-sm border border-white/80 dark:border-white/10 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-44 h-44 bg-gradient-to-br from-primary-fixed/30 to-secondary-fixed/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="relative mb-4">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg ring-4 ring-white dark:ring-surface border border-outline-variant/20"
                />
                <span
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface flex items-center justify-center text-white text-[11px]"
                  title="Aktif Bertugas"
                >
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                </span>
              </div>

              <h2 className="font-headline-md text-xl text-on-surface font-bold">{currentUser?.name}</h2>
              <p className="font-label-md text-xs text-primary dark:text-emerald-glow font-semibold mt-1">
                {currentUser?.title}
              </p>

              {/* Tags / Badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {currentUser?.cert}
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-surface-container-high text-on-surface-variant">
                  {currentUser?.id}
                </span>
              </div>

              <div className="w-full h-px bg-outline-variant/20 my-5"></div>

              {/* Location Details */}
              <div className="w-full space-y-3 text-left text-xs">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-outline">pin_drop</span>
                    <span>Fasilitas:</span>
                  </span>
                  <span className="font-bold text-on-surface">{currentUser?.facility}</span>
                </div>

                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-outline">water</span>
                    <span>Sub-Unit:</span>
                  </span>
                  <span className="font-bold text-on-surface">{currentUser?.subUnit}</span>
                </div>

                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-outline">schedule</span>
                    <span>Terakhir Masuk:</span>
                  </span>
                  <span className="font-bold text-on-surface">Hari ini, 07:12 WIB</span>
                </div>
              </div>

              {/* Triplet Counter */}
              <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-4 border-t border-outline-variant/20">
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/20 text-center">
                  <div className="font-headline text-xl font-bold text-primary">14</div>
                  <div className="text-[10px] text-outline leading-tight mt-0.5">Stasiun IoT</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/20 text-center">
                  <div className="font-headline text-xl font-bold text-secondary">99.8%</div>
                  <div className="text-[10px] text-outline leading-tight mt-0.5">Uptime Link</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/20 text-center">
                  <div className="font-headline text-xl font-bold text-tertiary">24</div>
                  <div className="text-[10px] text-outline leading-tight mt-0.5">Siklus Panen</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 of 12 cols): Credentials, Notifications & Security */}
        <div className="lg:col-span-7 space-y-6">
          {/* Security & Access */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="font-headline-md text-base font-bold text-on-surface">Keamanan Akun & Verifikasi</h3>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-on-surface">Autentikasi Dua Faktor (2FA)</h4>
                  <p className="text-[11px] text-outline mt-0.5">Memerlukan kode OTP autentikator saat otorisasi perubahan ambang batas kritis.</p>
                </div>
                <button
                  onClick={() => setTwoFactor(!twoFactor)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${twoFactor ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${twoFactor ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-on-surface">Notifikasi Darurat WhatsApp</h4>
                  <p className="text-[11px] text-outline mt-0.5">Kirimkan peringatan seketika saat anomali pH &gt; 8.0 atau pompa mati.</p>
                </div>
                <button
                  onClick={() => setAlertsWhatsapp(!alertsWhatsapp)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${alertsWhatsapp ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${alertsWhatsapp ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-on-surface">Bot Telemetri Telegram</h4>
                  <p className="text-[11px] text-outline mt-0.5">Kirim ringkasan harian kualitas air dan cuaca jam 07:00 WIB.</p>
                </div>
                <button
                  onClick={() => setAlertsTelegram(!alertsTelegram)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${alertsTelegram ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${alertsTelegram ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Active Devices Session */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-headline-md text-base font-bold text-on-surface">Sesi Perangkat Aktif</h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">laptop_mac</span>
                  <div>
                    <p className="font-bold text-on-surface">Workstation Pengendali Ruang Kontrol (Bintaro)</p>
                    <p className="text-[11px] text-outline">Chrome di Windows 11 • IP: 192.168.1.104 (Aktif Sekarang)</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Sesi Ini
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
