import React, { useState } from 'react';
import { RAGService } from '../services/ragService';

export default function Pengaturan({
  thresholds,
  onUpdateThresholds,
  theme,
  onToggleTheme,
  lang,
  onToggleLanguage,
  currentUser,
}) {
  const [activeCategory, setActiveCategory] = useState('thresholds');
  const [formData, setFormData] = useState({ ...thresholds });
  const [saveToast, setSaveToast] = useState(false);

  // RAG Config State
  const [ragConfig, setRagConfig] = useState(() => RAGService.getStoredConfig());
  const [ragTesting, setRagTesting] = useState(false);
  const [ragTestResult, setRagTestResult] = useState(null);

  // IoT Config State
  const [iotConfig, setIotConfig] = useState({
    brokerUrl: 'mqtt://broker.emqx.io',
    port: 8883,
    topic: 'jagofarm/aquasmart/telemetry/#',
    wsEndpoint: 'wss://ws.jagofarm.com/live',
    useSSL: true,
  });

  const handleSave = () => {
    onUpdateThresholds(formData);
    RAGService.saveConfig(ragConfig);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleTestRAG = async () => {
    setRagTesting(true);
    setRagTestResult(null);
    try {
      if (!ragConfig.endpointUrl) {
        setRagTestResult({ success: true, message: 'Local AgriSains Domain Engine aktif & siap bertugas.' });
      } else {
        const res = await fetch(ragConfig.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ping: true, test: 'connectivity' }),
        });
        if (res.ok) {
          setRagTestResult({ success: true, message: 'Koneksi ke endpoint RAG LLM berhasil diverifikasi!' });
        } else {
          setRagTestResult({ success: false, message: `Endpoint merespon dengan status ${res.status}` });
        }
      }
    } catch (err) {
      setRagTestResult({
        success: false,
        message: `Gagal menghubungi endpoint: ${err.message}. Pastikan server RAG aktif dan CORS diizinkan.`,
      });
    } finally {
      setRagTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary">Pengaturan Sistem Ekosistem</h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
            Kelola konfigurasi telemetri, ambang batas peringatan, integrasi IoT Gateway, dan konektivitas RAG LLM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-label-md text-xs sm:text-sm hover:bg-primary-container shadow-md transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>Simpan Konfigurasi</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>Konfigurasi sistem berhasil disimpan ke penyimpanan lokal.</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 Cols): Categories Menu */}
        <div className="lg:col-span-4 space-y-2">
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-label-md text-xs text-tertiary/70 uppercase tracking-wider font-bold mb-3 px-2">
              Kategori Pengaturan
            </h3>
            <div className="space-y-1">
              {[
                { key: 'thresholds', label: 'Ambang Batas Peringatan', icon: 'notifications_active' },
                { key: 'rag', label: 'Integrasi RAG LLM', icon: 'psychology' },
                { key: 'iot', label: 'Integrasi IoT Gateway', icon: 'router' },
                { key: 'appearance', label: 'Preferensi Tampilan & Bahasa', icon: 'palette' },
                { key: 'account', label: 'Otoritas Akun & Akses', icon: 'account_circle' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveCategory(item.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left ${
                    activeCategory === item.key
                      ? 'bg-primary text-white shadow-md'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (8 Cols): Content Panel */}
        <div className="lg:col-span-8">
          {/* Panel 1: Ambang Batas Peringatan */}
          {activeCategory === 'thresholds' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Ambang Batas Peringatan Otomatis</h3>
                <p className="text-xs text-outline mt-0.5">
                  Sistem akan memicu notifikasi peringatan jika sensor membaca di luar batas ini.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* pH Range */}
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">Rentang pH Air Kolam</span>
                    <span className="font-mono text-outline font-bold">{formData.phMin} - {formData.phMax}</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Minimal: {formData.phMin}</label>
                    <input
                      type="range"
                      min="5.0"
                      max="7.0"
                      step="0.1"
                      value={formData.phMin}
                      onChange={(e) => setFormData({ ...formData, phMin: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Maksimal: {formData.phMax}</label>
                    <input
                      type="range"
                      min="7.0"
                      max="9.0"
                      step="0.1"
                      value={formData.phMax}
                      onChange={(e) => setFormData({ ...formData, phMax: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                {/* EC Range */}
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-secondary">Rentang EC Nutrisi (mS/cm)</span>
                    <span className="font-mono text-outline font-bold">{formData.ecMin} - {formData.ecMax}</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Minimal: {formData.ecMin}</label>
                    <input
                      type="range"
                      min="0.8"
                      max="1.8"
                      step="0.1"
                      value={formData.ecMin}
                      onChange={(e) => setFormData({ ...formData, ecMin: parseFloat(e.target.value) })}
                      className="w-full accent-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Maksimal: {formData.ecMax}</label>
                    <input
                      type="range"
                      min="1.8"
                      max="3.0"
                      step="0.1"
                      value={formData.ecMax}
                      onChange={(e) => setFormData({ ...formData, ecMax: parseFloat(e.target.value) })}
                      className="w-full accent-secondary"
                    />
                  </div>
                </div>

                {/* Suhu Air */}
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-tertiary">Suhu Air Kolam (°C)</span>
                    <span className="font-mono text-outline font-bold">{formData.waterTempMin}°C - {formData.waterTempMax}°C</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Minimal: {formData.waterTempMin}°C</label>
                    <input
                      type="range"
                      min="18.0"
                      max="25.0"
                      step="0.5"
                      value={formData.waterTempMin}
                      onChange={(e) => setFormData({ ...formData, waterTempMin: parseFloat(e.target.value) })}
                      className="w-full accent-tertiary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Maksimal: {formData.waterTempMax}°C</label>
                    <input
                      type="range"
                      min="26.0"
                      max="34.0"
                      step="0.5"
                      value={formData.waterTempMax}
                      onChange={(e) => setFormData({ ...formData, waterTempMax: parseFloat(e.target.value) })}
                      className="w-full accent-tertiary"
                    />
                  </div>
                </div>

                {/* Kelembaban Substrat */}
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">Kelembaban Substrat (%)</span>
                    <span className="font-mono text-outline font-bold">{formData.soilMoistureMin}% - {formData.soilMoistureMax}%</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Minimal: {formData.soilMoistureMin}%</label>
                    <input
                      type="range"
                      min="30"
                      max="65"
                      step="1"
                      value={formData.soilMoistureMin}
                      onChange={(e) => setFormData({ ...formData, soilMoistureMin: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-outline">Batas Maksimal: {formData.soilMoistureMax}%</label>
                    <input
                      type="range"
                      min="70"
                      max="95"
                      step="1"
                      value={formData.soilMoistureMax}
                      onChange={(e) => setFormData({ ...formData, soilMoistureMax: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Panel 2: Integrasi RAG LLM (User Requested Integration) */}
          {activeCategory === 'rag' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Custom RAG Interface
                  </span>
                  <span className="text-xs text-outline font-mono">AgriSains GPT-4o Terpadu</span>
                </div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Konektivitas Model RAG LLM Kustom</h3>
                <p className="text-xs text-outline mt-0.5">
                  Hubungkan endpoint backend RAG LLM yang Anda kembangkan sendiri. Setiap pesan chat akan otomatis membungkus telemetri sensor saat ini.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-on-surface font-semibold mb-1">URL Endpoint RAG API</label>
                  <input
                    type="url"
                    value={ragConfig.endpointUrl}
                    onChange={(e) => setRagConfig({ ...ragConfig, endpointUrl: e.target.value })}
                    placeholder="http://localhost:8000/api/rag-chat (Kosongkan jika menggunakan fallback internal)"
                    className="w-full py-2.5 px-4 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-primary font-mono text-on-surface"
                  />
                  <p className="text-[11px] text-outline mt-1">
                    Format payload: <code>{'{ prompt, farmContext: { telemetry, alerts }, history }'}</code>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableRag"
                    checked={ragConfig.enabled}
                    onChange={(e) => setRagConfig({ ...ragConfig, enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <label htmlFor="enableRag" className="text-xs font-semibold text-on-surface cursor-pointer">
                    Aktifkan pengiriman ke endpoint eksternal di atas (Nonaktif = Fallback ke Mesin AgriSains Lokal)
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleTestRAG}
                    disabled={ragTesting}
                    className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-outline-variant/50 hover:bg-white text-xs font-bold text-primary flex items-center gap-2 transition-all"
                  >
                    <span className={`material-symbols-outlined text-base ${ragTesting ? 'animate-spin' : ''}`}>
                      {ragTesting ? 'sync' : 'network_check'}
                    </span>
                    <span>{ragTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Endpoint RAG'}</span>
                  </button>
                </div>

                {ragTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-medium ${
                      ragTestResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-error border-red-200'
                    }`}
                  >
                    {ragTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel 3: Integrasi IoT Gateway */}
          {activeCategory === 'iot' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Konfigurasi Gateway & Broker IoT</h3>
                <p className="text-xs text-outline mt-0.5">Pengaturan koneksi protokol MQTT dan WebSocket Sub-GHz ke node fisik.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-on-surface font-semibold mb-1">Host Broker MQTT</label>
                    <input
                      type="text"
                      value={iotConfig.brokerUrl}
                      onChange={(e) => setIotConfig({ ...iotConfig, brokerUrl: e.target.value })}
                      className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 font-mono text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-semibold mb-1">Port</label>
                    <input
                      type="number"
                      value={iotConfig.port}
                      onChange={(e) => setIotConfig({ ...iotConfig, port: parseInt(e.target.value) })}
                      className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 font-mono text-on-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-on-surface font-semibold mb-1">Topik Telemetri Utama</label>
                  <input
                    type="text"
                    value={iotConfig.topic}
                    onChange={(e) => setIotConfig({ ...iotConfig, topic: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 font-mono text-on-surface"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Panel 4: Preferensi Tampilan */}
          {activeCategory === 'appearance' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Preferensi Tampilan & Bahasa</h3>
                <p className="text-xs text-outline mt-0.5">Sesuaikan mode kontras visual antarmuka dan bahasa sistem.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface">Mode Tema Tampilan</h4>
                    <p className="text-[11px] text-outline mt-0.5">Saat ini: {theme === 'light' ? 'Light Mode (Lumina Aqua)' : 'Dark Glassmorphic'}</p>
                  </div>
                  <button
                    onClick={onToggleTheme}
                    className="px-4 py-2 rounded-xl bg-primary text-white font-bold transition-all shadow-sm"
                  >
                    Beralih ke {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface">Bahasa Antarmuka</h4>
                    <p className="text-[11px] text-outline mt-0.5">Saat ini: {lang === 'id' ? 'Bahasa Indonesia' : 'English'}</p>
                  </div>
                  <button
                    onClick={onToggleLanguage}
                    className="px-4 py-2 rounded-xl bg-secondary text-white font-bold transition-all shadow-sm"
                  >
                    Ganti ke {lang === 'id' ? 'English' : 'Bahasa Indonesia'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Panel 5: Otoritas Akun */}
          {activeCategory === 'account' && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">Otoritas & Hak Akses Sesi</h3>
                <p className="text-xs text-outline mt-0.5">Informasi profil aktif dan kredensial hak akses saat ini.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-outline-variant/30 flex items-center gap-4">
                <img src={currentUser?.avatar} alt="User" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/40" />
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{currentUser?.name}</h4>
                  <p className="text-xs text-primary font-semibold">{currentUser?.title}</p>
                  <p className="text-[11px] text-outline mt-1 font-mono">{currentUser?.id} • {currentUser?.badge}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
