import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dasbor({ telemetry, currentUser, onSyncManual, onInjectAnomaly }) {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('24h');
  const [syncing, setSyncing] = useState(false);

  const handleSyncClick = () => {
    setSyncing(true);
    onSyncManual();
    setTimeout(() => setSyncing(false), 800);
  };

  // 24-hour Spline Chart Data
  const chartLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Sekarang'];
  
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'pH Air Kolam',
        data: [6.7, 6.75, 6.8, 6.85, 6.9, 6.88, 6.82, 6.8, telemetry?.water?.ph || 6.8],
        borderColor: '#0f5238',
        backgroundColor: 'rgba(15, 82, 56, 0.15)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: [0, 0, 0, 0, 0, 0, 0, 0, 5],
        pointBackgroundColor: '#0f5238',
      },
      {
        label: 'EC Nutrisi (mS/cm)',
        data: [1.65, 1.68, 1.7, 1.72, 1.75, 1.74, 1.71, 1.7, telemetry?.water?.ec || 1.7],
        borderColor: '#00696c',
        backgroundColor: 'rgba(0, 105, 108, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: [0, 0, 0, 0, 0, 0, 0, 0, 4],
        pointBackgroundColor: '#00696c',
      },
      {
        label: 'Suhu Air (°C)',
        data: [24.8, 24.6, 24.5, 25.1, 26.2, 26.0, 25.6, 25.3, telemetry?.water?.waterTemp || 25.4],
        borderColor: '#134b74',
        borderWidth: 1.8,
        borderDash: [4, 4],
        fill: false,
        tension: 0.4,
        yAxisID: 'y2',
        pointRadius: [0, 0, 0, 0, 0, 0, 0, 0, 4],
        pointBackgroundColor: '#134b74',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: "'Hanken Grotesk'", size: 12 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(25, 28, 29, 0.9)',
        titleFont: { family: "'Manrope'", size: 12 },
        bodyFont: { family: "'Hanken Grotesk'", size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(191, 201, 193, 0.2)' },
        ticks: { font: { family: "'Hanken Grotesk'", size: 11 } },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 6.0,
        max: 8.5,
        grid: { color: 'rgba(191, 201, 193, 0.2)' },
        ticks: { font: { family: "'Hanken Grotesk'", size: 10 } },
      },
      y1: {
        type: 'linear',
        display: false,
        min: 1.0,
        max: 3.0,
      },
      y2: {
        type: 'linear',
        display: false,
        min: 20,
        max: 35,
      },
    },
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              Fasilitas Greenhouse Bintaro
            </span>
            <span className="text-xs text-outline">• Stasiun Utama #AQ-CLIMATE-802</span>
          </div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-on-surface">
            Halo, {currentUser?.name?.split(',')[0]}
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-outline mt-0.5">
            Ringkasan Pemantauan Ekosistem Akuaponik JagoFarm
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/ai')}
            className="glass-card flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-label-md text-xs sm:text-sm text-secondary hover:bg-white/90 transition-all border border-secondary/30"
          >
            <span className="material-symbols-outlined text-base fill">support_agent</span>
            <span>Tanya Konsultan AI</span>
          </button>
          <button
            onClick={handleSyncClick}
            disabled={syncing}
            className="bg-primary hover:bg-primary-container text-white flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-label-md text-xs sm:text-sm shadow-md transition-all disabled:opacity-70"
          >
            <span className={`material-symbols-outlined text-base ${syncing ? 'animate-spin' : ''}`}>sync</span>
            <span>{syncing ? 'Menyinkronkan...' : 'Perbarui Manual'}</span>
          </button>
        </div>
      </div>

      {/* Top Bento Row: System Health & Key Telemetry Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* System Health Status Card */}
        <div className="glass-card rounded-2xl p-5 md:col-span-1 relative overflow-hidden flex flex-col justify-between border-l-4 border-primary">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary/15 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-label-md text-xs uppercase tracking-wider text-tertiary/70 font-bold">Kesehatan Sistem</h3>
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.7)] animate-pulse"></span>
            </div>
            <div className="text-3xl font-black text-on-surface font-headline">{telemetry?.systemHealth?.score}%</div>
            <p className="text-xs font-semibold text-primary mt-1">Status: {telemetry?.systemHealth?.status}</p>
          </div>

          <div className="pt-4 mt-4 border-t border-outline-variant/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-outline">Node Aktif</p>
              <p className="font-bold text-on-surface">{telemetry?.systemHealth?.activeNodes} Titik Sensor</p>
            </div>
            <div>
              <p className="text-[10px] text-outline">Pembaruan</p>
              <p className="font-bold text-on-surface font-mono">{telemetry?.systemHealth?.lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* 6 Key Parameter Quick Tiles */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {/* Tile 1: pH Kolam */}
          <div
            onClick={() => navigate('/sensor')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-primary/50 flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-semibold">pH Air Kolam</span>
              <span className="material-symbols-outlined text-lg text-secondary">water_ph</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-headline">{telemetry?.water?.ph}</span>
              <span className="text-xs text-outline">pH</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-semibold">Ideal (6.5-7.2)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Tile 2: EC / TDS */}
          <div
            onClick={() => navigate('/sensor')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-primary/50 flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-semibold">EC Nutrisi</span>
              <span className="material-symbols-outlined text-lg text-primary">science</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-headline">{telemetry?.water?.ec}</span>
              <span className="text-xs text-outline">mS/cm</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-outline">TDS {telemetry?.water?.tds} ppm</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Tile 3: Suhu Air Kolam */}
          <div
            onClick={() => navigate('/cuaca')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-primary/50 flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-semibold">Suhu Air</span>
              <span className="material-symbols-outlined text-lg text-tertiary">thermostat</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-headline">{telemetry?.water?.waterTemp}</span>
              <span className="text-xs text-outline">°C</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-semibold">Normal (24-28°C)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Tile 4: Oksigen Terlarut (DO) */}
          <div
            onClick={() => navigate('/sensor')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-primary/50 flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-semibold">Oksigen (DO)</span>
              <span className="material-symbols-outlined text-lg text-secondary">air</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-headline">{telemetry?.water?.dissolvedOxygen}</span>
              <span className="text-xs text-outline">mg/L</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-semibold">Aerasi Kuat</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Tile 5: Kelembaban Udara */}
          <div
            onClick={() => navigate('/cuaca')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-primary/50 flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between text-xs text-outline mb-2">
              <span className="font-semibold">Kelembaban RH</span>
              <span className="material-symbols-outlined text-lg text-secondary">water_drop</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-on-surface font-headline">{telemetry?.climate?.humidity}</span>
              <span className="text-xs text-outline">%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-semibold">RH Seimbang</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>

          {/* Tile 6: Indeks UV */}
          <div
            onClick={() => navigate('/cuaca')}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-amber-500 flex flex-col justify-between transition-all bg-[#fffbf5] dark:bg-amber-950/20"
          >
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 mb-2">
              <span className="font-semibold">Indeks UV</span>
              <span className="material-symbols-outlined text-lg text-amber-600">wb_sunny</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-900 dark:text-amber-200 font-headline">{telemetry?.climate?.uvIndex}</span>
              <span className="text-xs text-amber-700">UV</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-amber-700 dark:text-amber-300 font-bold">Waspada (Paranet Aktif)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Real-time 24h Spline Chart Section */}
      <div className="glass-card rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">show_chart</span>
            </div>
            <div>
              <h2 className="font-headline-md text-lg font-bold text-on-surface">Tren Parameter Kualitas Air Kolam (24 Jam)</h2>
              <p className="text-xs text-outline">Korelasi telemetri kontinu antara keasaman (pH), konduktivitas pupuk (EC), dan suhu air</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-surface-container-high/40 rounded-xl p-1 text-xs font-semibold">
              {['1h', '24h', '7d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    timeRange === range
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {range === '1h' ? '1 Jam' : range === '24h' ? '24 Jam' : '7 Hari'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Developer & Test Simulator Controls: Anomaly Injection */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">tune</span>
          <div>
            <p className="font-bold text-primary">Simulator Telemetri IoT</p>
            <p className="text-outline">Uji respon peringatan dan konsultasi agronomis dengan menyuntikkan anomali sensor.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onInjectAnomaly('ph_high')}
            className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/40 text-error border border-red-200 font-semibold hover:bg-red-200 transition-all"
          >
            Trigger pH Tinggi (8.4)
          </button>
          <button
            onClick={() => onInjectAnomaly('soil_dry')}
            className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 font-semibold hover:bg-amber-200 transition-all"
          >
            Trigger Substrat Kering (28%)
          </button>
          <button
            onClick={() => onInjectAnomaly('reset')}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 text-on-surface border border-outline-variant/40 font-semibold hover:bg-surface-variant transition-all"
          >
            Reset Parameter Normal
          </button>
        </div>
      </div>
    </div>
  );
}
