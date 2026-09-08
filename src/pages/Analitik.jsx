import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analitik() {
  const [range, setRange] = useState('30d');
  const [exporting, setExporting] = useState(false);

  // Resource Chart Data (Water L vs Energy kWh)
  const resourceData = {
    labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5', 'Minggu 6'],
    datasets: [
      {
        label: 'Penggunaan Air (Liter)',
        data: [1200, 1150, 1100, 950, 900, 850],
        borderColor: '#00696c',
        backgroundColor: 'rgba(0, 105, 108, 0.25)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 4,
      },
      {
        label: 'Konsumsi Energi (kWh)',
        data: [400, 420, 380, 350, 310, 290],
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45, 106, 79, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 4,
      },
    ],
  };

  const resourceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { family: "'Hanken Grotesk'" }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(25, 28, 29, 0.9)',
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(191, 201, 193, 0.2)' },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Air (Liter)' },
        grid: { color: 'rgba(191, 201, 193, 0.2)' },
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Energi (kWh)' },
        grid: { drawOnChartArea: false },
      },
    },
  };

  // Crop Yield Data (Actual vs Projected)
  const yieldData = {
    labels: ['Bulan 1 (Jan)', 'Bulan 2 (Feb)', 'Bulan 3 (Mar)', 'Bulan 4 (Apr)', 'Bulan 5 (Mei)', 'Bulan 6 (Jun)'],
    datasets: [
      {
        type: 'bar',
        label: 'Hasil Aktual (kg)',
        data: [210, 245, 280, 295, 310, 340],
        backgroundColor: '#0f5238',
        borderRadius: 8,
      },
      {
        type: 'line',
        label: 'Proyeksi Panen (kg)',
        data: [200, 230, 260, 290, 320, 350],
        borderColor: '#8ff3f6',
        backgroundColor: '#8ff3f6',
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 5,
      },
    ],
  };

  const yieldOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { family: "'Hanken Grotesk'" }, usePointStyle: true },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(191, 201, 193, 0.2)' } },
      y: { grid: { color: 'rgba(191, 201, 193, 0.2)' }, title: { display: true, text: 'Biomassa (kg)' } },
    },
  };

  const handleExportReport = () => {
    setExporting(true);
    setTimeout(() => {
      const reportText = `LAPORAN ANALITIK SISTEM AQUASMARTPONIK\nTanggal: ${new Date().toLocaleDateString('id-ID')}\nFasilitas: Greenhouse Bintaro\nEfisiensi Keseluruhan: 94% (+2.1%)\nAir Didaur Ulang: 1.200.000 Liter\nTotal Panen Aktual: 1.680 kg\n`;
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan_analitik_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExporting(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary">Analitik Sistem & Efisiensi Sumber Daya</h1>
          <p className="font-body-lg text-xs sm:text-sm text-on-surface-variant mt-1">
            Evaluasi komprehensif efisiensi nutrisi, daur ulang air limbah ikan, dan perbandingan yield biomassa panen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-high/40 rounded-xl p-1 text-xs font-semibold">
            {['7d', '30d', '1y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === r ? 'bg-primary text-white shadow-sm font-bold' : 'text-outline hover:text-on-surface'
                }`}
              >
                {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : '1 Tahun'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            disabled={exporting}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-base ${exporting ? 'animate-spin' : ''}`}>
              {exporting ? 'sync' : 'download'}
            </span>
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Laporan'}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid: Resource Chart & Efficiency KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Resource Consumption Area Chart */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-2 relative overflow-hidden flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">Tren Konsumsi Sumber Daya</h3>
              <p className="text-xs text-outline">Pemanfaatan air tandon dan energi listrik aerasi</p>
            </div>
            <span className="material-symbols-outlined text-outline">trending_up</span>
          </div>
          <div className="flex-1 w-full min-h-[280px]">
            <Line data={resourceData} options={resourceOptions} />
          </div>
        </div>

        {/* Right 1 Col: KPI Stat Cards */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Efisiensi Keseluruhan */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all"></div>
            <div>
              <h3 className="font-label-md text-xs text-tertiary/70 uppercase tracking-wider font-bold mb-2">
                Efisiensi Keseluruhan
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="font-headline text-4xl font-black text-primary">94%</span>
                <span className="text-primary-container flex items-center font-label-sm text-xs bg-primary/10 px-2 py-0.5 rounded-full font-bold">
                  <span className="material-symbols-outlined text-sm mr-0.5">arrow_upward</span>
                  +2.1%
                </span>
              </div>
            </div>
            <p className="font-label-sm text-xs text-on-surface-variant mt-4">
              Siklus biokonversi amonia ke nitrat oleh biofilter bekerja dengan rasio retensi 98.4%.
            </p>
          </div>

          {/* Card 2: Air Didaur Ulang */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-secondary/15 rounded-full blur-xl group-hover:bg-secondary/25 transition-all"></div>
            <div>
              <h3 className="font-label-md text-xs text-tertiary/70 uppercase tracking-wider font-bold mb-2">
                Air Didaur Ulang
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="font-headline text-4xl font-black text-secondary">1.2M L</span>
              </div>
            </div>
            <p className="font-label-sm text-xs text-on-surface-variant mt-4">
              Penghematan hingga 90% air dibandingkan dengan metode pertanian tanah konvensional.
            </p>
          </div>
        </div>
      </div>

      {/* Yield vs Projected Output Section */}
      <div className="glass-card rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20 mb-4">
          <div>
            <h3 className="font-headline-md text-base font-bold text-on-surface">Hasil Panen Aktual vs Proyeksi Biomassa</h3>
            <p className="text-xs text-outline">Performa panen selada Romaine & kangkung akuaponik 6 bulan terakhir</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span>Aktual (kg)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#8ff3f6] border border-outline"></span>
              <span>Proyeksi Target (kg)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <Bar data={yieldData} options={yieldOptions} />
        </div>
      </div>
    </div>
  );
}
