import React, { useState } from 'react';
import SlideOverDrawer from '../components/SlideOverDrawer';

export default function MonitoringTanah({ telemetry, onSelectSoilStation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeStation = telemetry?.soilStations?.find(s => s.active) || telemetry?.soilStations?.[0] || {};

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Stasiun Substrat Terpilih
            </span>
            <span className="text-xs text-on-surface-variant/80 font-mono font-medium">
              #{activeStation.id}
            </span>
          </div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            Monitoring Tanah & Substrat Presisi
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-3xl mt-1">
            Pemantauan kelembaban media tanam hidroponik DFT, dinamika NPK, dan suhu rizosfer perakaran secara real-time via jaringan LoRaWAN.
          </p>
        </div>

        {/* Action Button to Open Station Drawer */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-label-md text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">sensors</span>
            <span>Pilih Node IoT ({telemetry?.soilStations?.length || 5})</span>
          </button>
        </div>
      </div>

      {/* Active Station Overview Hero Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-secondary-container/20 rounded-full blur-2xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-md text-xs uppercase tracking-wider text-primary font-bold">Zona Aktif Lapangan</span>
              <span className="text-xs text-on-surface-variant">• #{activeStation.id}</span>
            </div>
            <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface mt-0.5">
              {activeStation.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
              activeStation.status === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${activeStation.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              {activeStation.status === 'warning' ? 'Waspada' : 'Normal'}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/10 text-xs font-semibold text-on-surface border border-outline-variant/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">battery_charging_full</span>
              {activeStation.battery}%
            </span>
          </div>
        </div>

        {/* 3 Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white/90 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl fill">potted_plant</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Status Hidrasi Media</p>
              <p className="font-bold text-on-surface text-base leading-tight">
                {activeStation.moisture > 70 ? 'Lembab Optimal' : activeStation.moisture > 50 ? 'Cukup Lembab' : 'Kering'}
              </p>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Kapasitas lapang terjaga
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white/90 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl fill">water_drop</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Rekomendasi Irigasi</p>
              <p className="font-bold text-on-surface text-base leading-tight">Irigasi Tetes Standby</p>
              <span className="text-[11px] text-primary font-semibold">Jadwal berikutnya: 14:00 WIB</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-white/90 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">signal_cellular_alt</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Jaringan Telemetri</p>
              <p className="font-bold text-on-surface text-base leading-tight">{activeStation.signal}</p>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Frekuensi: 915 MHz Sub-GHz
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Substrate Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Kelembaban Substrat */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-bold text-primary uppercase">Kelembaban Substrat</span>
              <span className="material-symbols-outlined text-xl text-secondary fill">opacity</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-on-surface font-headline">{activeStation.moisture}</span>
              <span className="text-base text-outline font-bold">%</span>
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-2">Rentang Ideal: 60% - 85%</p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-surface-container-high rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, activeStation.moisture)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Suhu Rizosfer Perakaran */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-bold text-tertiary uppercase">Suhu Rizosfer</span>
              <span className="material-symbols-outlined text-xl text-tertiary fill">thermostat</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-on-surface font-headline">{activeStation.soilTemp}</span>
              <span className="text-base text-outline font-bold">°C</span>
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-2">Optimal untuk penyerapan hara</p>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-tertiary h-full rounded-full transition-all duration-500"
              style={{ width: `${(activeStation.soilTemp / 35) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: EC Substrat */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-bold text-secondary uppercase">Konduktivitas EC</span>
              <span className="material-symbols-outlined text-xl text-secondary fill">electric_bolt</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-on-surface font-headline">{activeStation.ec}</span>
              <span className="text-base text-outline font-bold">mS/cm</span>
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-2">Kepekatan garam nutrisi sesuai</p>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-500"
              style={{ width: `${(activeStation.ec / 3.0) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* N-P-K Mineral Nutrients Breakdown Bar */}
      <div className="glass-card rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">eco</span>
            </div>
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">Keseimbangan Nutrisi Makro (N - P - K)</h3>
              <p className="text-xs text-outline">Estimasi kation-anion mineral terlarut pada zona rizosfer tanaman</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Nutrisi Terjaga
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-outline-variant/20">
            <div className="flex items-center justify-between text-xs font-bold text-primary mb-1">
              <span>Nitrogen (N)</span>
              <span>{activeStation.nitrogen} ppm</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 mt-2">
              <div className="bg-primary h-full rounded-full" style={{ width: `${(activeStation.nitrogen / 200) * 100}%` }}></div>
            </div>
            <p className="text-[11px] text-outline mt-2">Pemicu pertumbuhan vegetatif daun & tunas.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-outline-variant/20">
            <div className="flex items-center justify-between text-xs font-bold text-secondary mb-1">
              <span>Fosfor (P)</span>
              <span>{activeStation.phosphorus} ppm</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 mt-2">
              <div className="bg-secondary h-full rounded-full" style={{ width: `${(activeStation.phosphorus / 100) * 100}%` }}></div>
            </div>
            <p className="text-[11px] text-outline mt-2">Stimulasi pembentukan perakaran yang kokoh.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-outline-variant/20">
            <div className="flex items-center justify-between text-xs font-bold text-tertiary mb-1">
              <span>Kalium (K)</span>
              <span>{activeStation.potassium} ppm</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 mt-2">
              <div className="bg-tertiary h-full rounded-full" style={{ width: `${(activeStation.potassium / 300) * 100}%` }}></div>
            </div>
            <p className="text-[11px] text-outline mt-2">Regulasi bukaan stomata & imunitas patogen.</p>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer for Selecting Soil IoT Station */}
      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Pilih Node IoT Substrat"
        subtitle="5 stasiun telemetri terdeteksi di kebun"
        icon="sensors"
        footer={
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Terapkan Node Terpilih</span>
          </button>
        }
      >
        <div className="space-y-3">
          {telemetry?.soilStations?.map((station) => (
            <div
              key={station.id}
              onClick={() => {
                onSelectSoilStation(station.id);
              }}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                station.active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-outline-variant/40 hover:border-primary/40 bg-surface-container-low/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-2xl ${station.active ? 'text-primary fill' : 'text-outline'}`}>
                    sensors
                  </span>
                  <div>
                    <h4 className={`font-bold text-sm ${station.active ? 'text-primary' : 'text-on-surface'}`}>
                      {station.name}
                    </h4>
                    <span className="text-xs text-outline font-mono">#{station.id}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  station.status === 'warning'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {station.status === 'warning' ? 'Waspada' : 'Normal'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-outline-variant/20 text-xs">
                <div>
                  <span className="text-[10px] text-outline">Kelembaban</span>
                  <p className="font-bold text-on-surface">{station.moisture}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-outline">Baterai & Sinyal</span>
                  <p className={`font-bold ${station.battery < 30 ? 'text-error' : 'text-emerald-700'}`}>
                    {station.battery}% • {station.signalLevel}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SlideOverDrawer>
    </div>
  );
}
