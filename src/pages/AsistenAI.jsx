import React, { useState, useRef, useEffect } from 'react';
import { RAGService } from '../services/ragService';
import SlideOverDrawer from '../components/SlideOverDrawer';

export default function AsistenAI({ telemetry, currentUser }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      sender: 'AquaSmart AI Agronomis',
      time: '09:43',
      text: `Halo ${currentUser?.name?.split(',')[0]}! Saya telah memindai telemetri real-time fasilitas **Greenhouse Bintaro**. 

Terdapat catatan pemantauan pada **pH Kolam (${telemetry?.water?.ph || 6.8})**, **EC Substrat (${telemetry?.water?.ec || 1.7} mS/cm)**, dan **Radiasi UV (${telemetry?.climate?.uvIndex || 6.2} UV)**. Ada modul budidaya atau gejala tanaman spesifik yang ingin dianalisis mendalam pagi ini?`,
      tags: [
        { label: 'Suhu Air Kolam', val: `${telemetry?.water?.waterTemp || 25.4}°C (Normal)` },
        { label: 'Oksigen Terlarut', val: `${telemetry?.water?.dissolvedOxygen || 6.8} mg/L (Stabil)` },
        { label: 'Kelembaban RH', val: `${telemetry?.climate?.humidity || 68}% (Seimbang)` },
      ]
    },
    {
      role: 'user',
      sender: currentUser?.name || 'Dr. Ir. Hendra',
      time: '09:45',
      text: 'Tolong analisis klorosis ringan pada daun muda selada Romaine di lajur DFT 3. Apakah ini murni defisiensi Fe (besi) akibat pH naik, atau ada kaitan dengan limbah nitrogen ikan?',
    },
    {
      role: 'assistant',
      sender: 'AquaSmart AI Agronomis',
      time: '09:46',
      text: `Berdasarkan analisis telemetri air kolam (pH **${telemetry?.water?.ph || 6.8}**), gejala klorosis interveinal daun muda tersebut adalah **defisiensi Besi (Fe)** sekunder akibat kenaikan pH air kolam, bukan keracunan nitrogen amonia.

**Rekomendasi Tindakan Segera:**
1. **Dosis Kelat Besi**: Tambahkan **Fe-DTPA 7% sebanyak 2.5 gram / 1000 Liter air**.
2. **Koreksi pH Kolam**: Berikan asam fosfat cair secara bertahap untuk membawa pH kembali ke rentang **6.3 - 6.6**.
3. **Penyemprotan Daun Darurat**: Aplikasi foliar spray Fe-EDTA 0.05% pada pukul 07:00 pagi sebelum radiasi UV meningkat.`,
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      role: 'user',
      sender: currentUser?.name || 'Operator',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      text: query,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await RAGService.sendMessage(query, telemetry, messages);
      const botMsg = {
        role: 'assistant',
        sender: 'AquaSmart AI Agronomis',
        time: response.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        source: response.source,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          sender: 'AquaSmart AI Agronomis',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          text: 'Maaf, terjadi kendala saat memproses permintaan telemetri. Silakan ulangi kembali.',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDialog = () => {
    setMessages([
      {
        role: 'assistant',
        sender: 'AquaSmart AI Agronomis',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: `Sesi baru dimulai. Telemetri aktif: pH **${telemetry?.water?.ph || 6.8}**, EC **${telemetry?.water?.ec || 1.7} mS/cm**, Suhu **${telemetry?.water?.waterTemp || 25.4}°C**. Apa yang bisa saya bantu?`,
      }
    ]);
  };

  const handleExportSOP = () => {
    const textContent = `# DOKUMEN REKOMENDASI SOP AGRONOMI AQUASMARTPONIK
Tanggal: ${new Date().toLocaleDateString('id-ID')}
Fasilitas: Greenhouse Bintaro
Telemetry pH: ${telemetry?.water?.ph} | EC: ${telemetry?.water?.ec} mS/cm | Suhu: ${telemetry?.water?.waterTemp}°C

---
${messages.map(m => `### ${m.sender} (${m.time}):\n${m.text}\n`).join('\n---\n')}
`;
    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SOP_Agronomi_RAG_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const promptSuggestions = [
    'Analisis anomali pH dan risiko klorosis besi (Fe)',
    'Rekomendasi takaran pupuk dan penyesuaian EC DFT',
    'Jadwal estimasi panen selada Romaine',
    'SOP perlakuan suhu panas dan radiasi UV tinggi',
  ];

  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      {/* Main Chat Frame */}
      <section className="flex flex-col h-[calc(100vh-140px)] min-h-[640px] bg-white/85 dark:bg-[#1a201c]/90 backdrop-blur-2xl rounded-3xl border border-white/70 dark:border-white/10 shadow-lg p-4 sm:p-6 justify-between overflow-hidden">
        {/* Chat Head & Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-outline-variant/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-2xl fill">psychology</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-base sm:text-lg font-bold text-on-surface">AgriSains GPT-4o Terpadu</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                  Bio-IoT v2.4
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Konteks aktif: <span className="font-semibold text-primary">Blok A Selada Romaine + Kolam Bioflok Nila Merah #04</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDialog}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Reset Dialog</span>
            </button>
            <button
              onClick={handleExportSOP}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Ekspor SOP</span>
            </button>
            <button
              onClick={() => setHistoryDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-base">history</span>
              <span>Riwayat</span>
            </button>
          </div>
        </div>

        {/* Conversation History Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4 pr-1">
          {/* Timestamp Divider */}
          <div className="flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-surface-container-high/60 text-outline text-[11px] font-semibold">
              Sinkronisasi Sensor Otomatis Terhubung
            </span>
          </div>

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 max-w-[90%] sm:max-w-[80%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm text-white ${
                  msg.role === 'user' ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span className="material-symbols-outlined text-lg fill">
                  {msg.role === 'user' ? 'person' : 'psychology'}
                </span>
              </div>

              <div
                className={`rounded-2xl p-4 shadow-sm space-y-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-white dark:bg-white/10 text-on-surface border border-outline-variant/30 rounded-tl-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-primary dark:text-emerald-glow'}`}>
                    {msg.sender}
                  </span>
                  <span className={`text-[10px] ${msg.role === 'user' ? 'text-white/70' : 'text-outline'}`}>
                    {msg.time}
                  </span>
                </div>

                <div className="whitespace-pre-line font-body text-xs sm:text-sm">
                  {msg.text}
                </div>

                {/* Optional Telemetry Tag Badges inside message */}
                {msg.tags && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20 text-[11px]">
                    {msg.tags.map((tag, tIdx) => (
                      <div key={tIdx} className="p-2 rounded-lg bg-surface-container-low/80 dark:bg-black/20 flex flex-col">
                        <span className="text-outline text-[10px]">{tag.label}</span>
                        <span className="font-bold text-on-surface">{tag.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
              </div>
              <div className="bg-white dark:bg-white/10 p-3 rounded-2xl border border-outline-variant/30 text-xs text-outline flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>Menganalisis telemetri mikroklimat & merumuskan rekomendasi...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestion Pills */}
        <div className="py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {promptSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white border border-outline-variant/30 text-[11px] font-semibold text-on-surface-variant hover:text-primary whitespace-nowrap transition-all shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="pt-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan analisis nutrisi, anomali pH, atau SOP panen..."
            className="flex-1 py-3 px-4 rounded-2xl bg-white/80 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-primary text-xs sm:text-sm text-on-surface transition-all placeholder:text-outline/70 shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-40 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </form>
      </section>

      {/* Slide-over Drawer for AI Session History */}
      <SlideOverDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title="Riwayat Sesi Chat AI"
        subtitle="Daftar log konsultasi agronomi sebelumnya"
        icon="history"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl border border-primary bg-primary/5 cursor-pointer">
            <span className="text-[10px] text-primary font-bold">Hari Ini • Sesi Aktif</span>
            <h4 className="font-bold text-on-surface mt-0.5">Analisis Klorosis Fe Selada Romaine</h4>
            <p className="text-[11px] text-outline mt-1">Konsultasi penanganan pH 6.8 & takaran Fe-DTPA.</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-outline-variant/30 hover:bg-surface-container-low cursor-pointer transition-all">
            <span className="text-[10px] text-outline font-bold">06 Mar 2026</span>
            <h4 className="font-bold text-on-surface mt-0.5">Optimasi Aerasi Bioflok Kolam 04</h4>
            <p className="text-[11px] text-outline mt-1">Pengaturan debit pompa venturi saat malam hari.</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-outline-variant/30 hover:bg-surface-container-low cursor-pointer transition-all">
            <span className="text-[10px] text-outline font-bold">02 Mar 2026</span>
            <h4 className="font-bold text-on-surface mt-0.5">Kalkulasi Takaran Kangkung Biofilter</h4>
            <p className="text-[11px] text-outline mt-1">Daya serap 150 rumpun kangkung terhadap amonia 0.04 ppm.</p>
          </div>
        </div>
      </SlideOverDrawer>
    </div>
  );
}
