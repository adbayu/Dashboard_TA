import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import SlideOverDrawer from '../components/SlideOverDrawer';

export default function MonitoringCuaca({ telemetry, onSelectWeatherStation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  const climate = telemetry?.climate || {};

  // 24-hour Multi-variable weather chart data
  const chartLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Sekarang'];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Kelembaban RH (%)',
        data: [78, 82, 75, 64, 68, 70, climate.humidity || 68],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#0284c7',
      },
      {
        label: 'Suhu Udara (°C)',
        data: [23.5, 23.2, 26.0, 31.2, 29.8, 27.5, climate.airTemp || 28.4],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
      },
      {
        label: 'Indeks UV',
        data: [0, 0, 2.5, 7.8, 5.5, 1.0, climate.uvIndex || 6.2],
        borderColor: '#f97316',
        borderWidth: 2.5,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#f97316',
      },
      {
        label: 'Kecepatan Angin (km/h)',
        data: [4.2, 3.8, 6.5, 10.2, 9.0, 7.4, climate.windSpeed || 8.4],
        borderColor: '#00696c',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#00696c',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        grid: { color: 'rgba(191, 201, 193, 0.2)' },
        ticks: { font: { family: "'Hanken Grotesk'", size: 10 } },
      },
    },
  };

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Timestamp,Suhu_Udara_C,Kelembaban_RH,Indeks_UV,Curah_Hujan_mm,Kecepatan_Angin_kmh\n" +
      `2026-03-08 10:00,${climate.airTemp},${climate.humidity},${climate.uvIndex},${climate.monthlyRain},${climate.windSpeed}\n` +
      `2026-03-08 09:00,27.8,70.2,5.8,142,7.9\n` +
      `2026-03-08 08:00,26.5,73.0,4.2,142,6.5\n` +
      `2026-03-08 07:00,25.1,76.5,2.1,142,5.2\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `telemetri_cuaca_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Stasiun Meteorologi Kebun
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Telemetry Node ID: {climate.nodeId || '#AQ-CLIMATE-802'}
            </span>
          </div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            Monitoring Cuaca & Iklim Mikro
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-3xl mt-1">
            Pemantauan kondisi atmosfer lingkungan, radiasi UV, dan dinamika iklim mikro real-time untuk optimalisasi fotosintesis tanaman.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-label-md text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">sensors</span>
            <span>Pilih Stasiun ({telemetry?.weatherStations?.length || 4})</span>
          </button>
        </div>
      </div>

      {/* Threshold Legend Guide Banner */}
      <div className="glass-card rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-white/90 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-primary">info</span>
          <span className="font-semibold">Panduan Ambang Batas Status Telemetri:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span><strong>Ideal:</strong> Kondisi optimal & aman bagi tanaman</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span><strong>Waspada:</strong> Perlu pemantauan / penyesuaian peneduh</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-error border border-red-200">
            <span className="w-2 h-2 rounded-full bg-error"></span>
            <span><strong>Bahaya:</strong> Kondisi kritis, intervensi segera</span>
          </div>
        </div>
      </div>

      {/* 5 Grid Parameter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Suhu Udara Luar (IDEAL) */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm p-3">
            <span className="material-symbols-outlined text-3xl fill">device_thermostat</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">IDEAL</span>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Suhu Udara Luar</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-900 dark:text-emerald-100 font-headline">{climate.airTemp}</span>
              <span className="text-sm font-bold text-emerald-800">°C</span>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Suhu Optimal (24°C - 30°C)</strong> — Laju transpirasi daun seimbang.
            </p>
          </div>
        </div>

        {/* Card 2: Kelembaban Udara (IDEAL) */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm p-3">
            <span className="material-symbols-outlined text-3xl fill">water_drop</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">IDEAL</span>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Kelembaban Udara</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-900 dark:text-emerald-100 font-headline">{climate.humidity}</span>
              <span className="text-sm font-bold text-emerald-800">%</span>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>RH Stabil (60% - 75%)</strong> — Mencegah penguapan ekstrem & patogen jamur.
            </p>
          </div>
        </div>

        {/* Card 3: Indeks UV (WASPADA) */}
        <div className="bg-[#fffbf5] dark:bg-amber-950/20 border-2 border-[#ffe5c7] dark:border-amber-800/40 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-13 h-13 rounded-2xl bg-[#e66c00] text-white flex items-center justify-center shrink-0 shadow-sm p-3">
            <span className="material-symbols-outlined text-3xl fill">wb_sunny</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d96200]">WASPADA</span>
            <h3 className="text-base font-bold text-[#7d3b00] dark:text-amber-200 mt-0.5">Indeks UV</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-[#7d3b00] dark:text-amber-100 font-headline">{climate.uvIndex}</span>
              <span className="text-sm font-bold text-[#7d3b00]">UV</span>
            </div>
            <p className="mt-2 text-xs text-[#a15109] dark:text-amber-300">
              <strong>Radiasi Sedang-Tinggi</strong> — Paranet peneduh disarankan aktif.
            </p>
          </div>
        </div>

        {/* Card 4: Curah Hujan Bulanan */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm p-3">
            <span className="material-symbols-outlined text-3xl fill">rainy</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">IDEAL</span>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Curah Hujan Bulanan</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-900 dark:text-emerald-100 font-headline">{climate.monthlyRain}</span>
              <span className="text-sm font-bold text-emerald-800">mm</span>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Presipitasi Normal</strong> — Akumulasi wajar, drainase talang aman.
            </p>
          </div>
        </div>

        {/* Card 5: Kecepatan Angin */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-3xl p-6 flex items-start gap-4 shadow-sm md:col-span-2">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm p-3">
            <span className="material-symbols-outlined text-3xl fill">air</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">IDEAL</span>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">Kecepatan Angin & Arah</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-900 dark:text-emerald-100 font-headline">{climate.windSpeed}</span>
              <span className="text-sm font-bold text-emerald-800">km/jam • {climate.windDirection}</span>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Aliran Udara Sejuk (5-15 km/jam)</strong> — Mendukung pertukaran gas CO2 tanpa risiko patah batang.
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour Multi-variable Line Chart Container */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-2xl">show_chart</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-lg font-bold text-on-surface">Tren Telemetri Cuaca & Iklim Mikro</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  5 Sensor Aktif
                </span>
              </div>
              <p className="text-xs text-outline mt-0.5">Visualisasi fluktuasi 5 parameter cuaca real-time selama 24 jam terakhir</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-surface-container-high/40 rounded-xl p-1 text-xs font-semibold">
              {['1h', '24h', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    timeRange === r ? 'bg-primary text-white shadow-sm font-bold' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {r === '1h' ? '1 Jam' : r === '24h' ? '24 Jam' : r === '7d' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 rounded-xl border border-outline-variant/50 bg-white/80 dark:bg-white/10 hover:bg-white text-xs font-bold text-on-surface flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-80 w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Slide-over Drawer for Selecting Weather Station */}
      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Pilih Stasiun Meteorologi"
        subtitle="Stasiun pemantau iklim mikro aktif"
        icon="partly_cloudy_day"
        footer={
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow transition-all"
          >
            Terapkan Stasiun Terpilih
          </button>
        }
      >
        <div className="space-y-3">
          {telemetry?.weatherStations?.map((station) => (
            <div
              key={station.id}
              onClick={() => onSelectWeatherStation(station.id)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                station.active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-outline-variant/30 hover:border-primary/40 bg-surface-container-low/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase font-mono">{station.id}</span>
                  <h4 className="font-bold text-on-surface text-sm">{station.name}</h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  station.status === 'danger'
                    ? 'bg-red-100 text-error'
                    : station.status === 'warning'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {station.status === 'danger' ? 'Bahaya' : station.status === 'warning' ? 'Waspada' : 'Normal'}
                </span>
              </div>
              <p className="text-xs text-outline">{station.desc}</p>
              <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                <span className="text-primary font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  {station.active ? 'Terhubung Saat Ini' : 'Siap Terhubung'}
                </span>
                <span className="text-outline">Sinyal {station.signal}%</span>
              </div>
            </div>
          ))}
        </div>
      </SlideOverDrawer>
    </div>
  );
}
