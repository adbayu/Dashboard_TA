import React, { useState, useMemo } from 'react';

export default function Riwayat({ logs }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return (logs || []).filter((log) => {
      const matchSearch =
        log.sensorId.toLowerCase().includes(search.toLowerCase()) ||
        log.location.toLowerCase().includes(search.toLowerCase()) ||
        log.event.toLowerCase().includes(search.toLowerCase());
      const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
      return matchSearch && matchSeverity;
    });
  }, [logs, search, severityFilter]);

  const handleExportCSV = () => {
    const headers = ['ID_Log', 'Waktu', 'ID_Sensor', 'Lokasi', 'Deskripsi_Event', 'Tingkat_Keparahan', 'Status'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      l.sensorId,
      `"${l.location}"`,
      `"${l.event}"`,
      l.severity,
      l.resolved ? 'Selesai' : 'Perlu Tindakan'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_telemetri_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary">Riwayat & Log Audit Telemetri</h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
            Rekam jejak komprehensif kalibrasi, fluktuasi parameter, intervensi otomatis, dan peringatan sensor kebun.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Unduh Log CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID Sensor, lokasi, atau pesan log..."
            className="w-full py-2 pl-10 pr-4 text-xs rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-primary text-on-surface transition-all placeholder:text-outline/70"
          />
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline/70 text-base">search</span>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { key: 'all', label: 'Semua Severity' },
            { key: 'info', label: 'Info' },
            { key: 'warning', label: 'Waspada' },
            { key: 'danger', label: 'Bahaya' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setSeverityFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                severityFilter === f.key
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'bg-white/50 dark:bg-white/5 text-outline hover:text-on-surface border border-outline-variant/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 dark:bg-white/5">
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider">ID Log</th>
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider">Waktu Kejadian</th>
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider">Sensor & Lokasi</th>
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider">Deskripsi Peristiwa</th>
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider text-center">Keparahan</th>
                <th className="p-4 font-bold text-tertiary/70 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary">{log.id}</td>
                    <td className="p-4 text-on-surface-variant font-medium whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-4">
                      <span className="font-bold text-on-surface">{log.sensorId}</span>
                      <p className="text-[11px] text-outline mt-0.5">{log.location}</p>
                    </td>
                    <td className="p-4 font-medium text-on-surface max-w-md">{log.event}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.severity === 'danger'
                            ? 'bg-red-100 text-error border border-red-200'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            log.severity === 'danger'
                              ? 'bg-error'
                              : log.severity === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        ></span>
                        {log.severity === 'danger' ? 'Bahaya' : log.severity === 'warning' ? 'Waspada' : 'Info'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-semibold text-[11px] ${
                          log.resolved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {log.resolved ? 'Terselesaikan' : 'Dalam Pemantauan'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-outline">
                    Tidak ada catatan log telemetri yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
