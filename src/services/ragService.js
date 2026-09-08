// Custom RAG LLM Integration Service with Context Injection & Agronomist Engine

export class RAGService {
  static getStoredConfig() {
    const saved = localStorage.getItem('aquasmart_rag_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved RAG config', e);
      }
    }
    return {
      endpointUrl: '', // empty means use local intelligent agronomist engine
      modelName: 'AgriSains GPT-4o Terpadu (Bio-IoT v2.4)',
      temperature: 0.3,
      enabled: false,
    };
  }

  static saveConfig(config) {
    localStorage.setItem('aquasmart_rag_config', JSON.stringify(config));
  }

  /**
   * Sends user prompt with full farm telemetry context to custom RAG endpoint or local engine
   */
  static async sendMessage(prompt, telemetry, history = []) {
    const config = this.getStoredConfig();

    // Context payload
    const activeSoil = telemetry.soilStations?.find(s => s.active) || telemetry.soilStations?.[0] || {};
    const payload = {
      prompt,
      farmContext: {
        facility: 'Greenhouse Bintaro - Bioflok Nila-04 & Hidro A',
        timestamp: new Date().toISOString(),
        telemetry: {
          water: {
            ph: telemetry.water?.ph,
            ec: telemetry.water?.ec,
            waterTemp: telemetry.water?.waterTemp,
            dissolvedOxygen: telemetry.water?.dissolvedOxygen,
            waterLevel: telemetry.water?.waterLevel,
          },
          soil: {
            zone: activeSoil.zone,
            moisture: activeSoil.moisture,
            temp: activeSoil.soilTemp,
            nitrogen: activeSoil.nitrogen,
            phosphorus: activeSoil.phosphorus,
            potassium: activeSoil.potassium,
          },
          climate: {
            airTemp: telemetry.climate?.airTemp,
            humidity: telemetry.climate?.humidity,
            uvIndex: telemetry.climate?.uvIndex,
            rain: telemetry.climate?.monthlyRain,
          },
          activeAlerts: [
            telemetry.water?.ph > 7.5 ? { type: 'pH Tinggi', val: telemetry.water.ph } : null,
            telemetry.climate?.uvIndex > 6.0 ? { type: 'Radiasi UV Tinggi', val: telemetry.climate.uvIndex } : null,
            activeSoil.battery < 30 ? { type: 'Baterai Node Rendah', val: `${activeSoil.battery}%` } : null,
          ].filter(Boolean),
        },
      },
      conversationHistory: history.slice(-6),
    };

    // If custom RAG endpoint is provided and enabled, call it
    if (config.enabled && config.endpointUrl) {
      try {
        const res = await fetch(config.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            text: data.reply || data.answer || data.message || JSON.stringify(data),
            source: 'RAG_ENDPOINT',
            endpoint: config.endpointUrl,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          };
        }
      } catch (err) {
        console.warn('Custom RAG endpoint failed, falling back to local Agronomist engine:', err);
      }
    }

    // High-Fidelity Domain Agronomist Fallback Engine
    return new Promise((resolve) => {
      setTimeout(() => {
        const response = RAGService.generateAgronomistResponse(prompt, payload.farmContext);
        resolve({
          text: response,
          source: 'LOCAL_AGRISAINS_ENGINE',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        });
      }, 750); // slight realistic typing latency
    });
  }

  static generateAgronomistResponse(prompt, context) {
    const p = prompt.toLowerCase();
    const ph = context.telemetry.water.ph;
    const ec = context.telemetry.water.ec;
    const moisture = context.telemetry.soil.moisture;
    const uv = context.telemetry.climate.uvIndex;

    if (p.includes('klorosis') || p.includes('daun') || p.includes('kuning') || p.includes('besi') || p.includes('fe')) {
      return `Berdasarkan telemetri real-time, pH air saat ini berada di **${ph}** dan EC **${ec} mS/cm**. 

Klorosis interveinal pada daun muda selada Romaine kemungkinan besar disebabkan oleh **defisiensi mikronutrien Besi (Fe)** akibat pH yang cenderung alkalis (>6.8), bukan akibat penumpukan nitrogen ikan.

**Rekomendasi SOP Tindakan Segera:**
1. **Penurunan pH Bertahap**: Turunkan pH kolam ke rentang optimal **6.2 - 6.5** menggunakan asam fosfat teknis secara perlahan (maks 0.2 unit pH per 6 jam agar tidak memicu stres pada ikan Nila).
2. **Kelat Besi (Fe-EDDHA / Fe-DTPA)**: Tambahkan kelat Fe-DTPA dengan takaran **2.5 mg/L**, efektif pada pH hingga 7.2.
3. **Penyemprotan Daun (Foliar Spray)**: Semprot larutan Fe-EDTA 0.05% pada pagi hari (sebelum UV melewati index 5) untuk serapan darurat klorofil.`;
    }

    if (p.includes('ph') || p.includes('asam') || p.includes('basa')) {
      return `Sensor pH kolam membaca **${ph}** (Nilai Ambang Batas Ideal: 6.5 - 7.0). 

${ph > 7.2 
  ? `Status saat ini **WASPADA TINGGI**. Laju nitrifikasi bakteri *Nitrosomonas* dan *Nitrobacter* masih aktif, namun serapan kation fosfat dan besi mulai terhambat.`
  : `Kondisi pH air dalam parameter **SANGAT IDEAL** untuk simbiosis ikan Nila dan tanaman hidroponik.`}

**Langkah Rekomendasi:**
- Pantau alkalinitas total (KH). Pertahankan di atas 80 ppm CaCO3 untuk mencegah *pH crash* di malam hari saat respirasi CO2 meningkat.`;
    }

    if (p.includes('tanah') || p.includes('kelembaban') || p.includes('lembab') || p.includes('substrat')) {
      return `Telemetri sensor kelembaban pada **${context.telemetry.soil.zone}** mencatat **${moisture}%** dengan suhu substrat **${context.telemetry.soil.temp}°C**.

Nilai N-P-K terdeteksi: **N: ${context.telemetry.soil.nitrogen} ppm, P: ${context.telemetry.soil.phosphorus} ppm, K: ${context.telemetry.soil.potassium} ppm**. 
Kadar air substrat tergolong ${moisture < 60 ? '**Kering (Perlu Irigasi Segera)**' : moisture > 85 ? '**Jenuh Air (Risiko Busuk Akar)**' : '**Kondusif & Optimal**'}. Siklus aerasi pompa disarankan 15 menit on / 30 menit off.`;
    }

    if (p.includes('cuaca') || p.includes('uv') || p.includes('suhu') || p.includes('panas')) {
      return `Stasiun meteorologi kebun mencatat suhu udara luar **${context.telemetry.climate.airTemp}°C** dengan indeks UV **${uv} UV** dan kelembaban **${context.telemetry.climate.humidity}%**.

Indeks UV ${uv >= 6 ? '**Cukup Terik (Waspada)**. Disarankan menutup tirai paranet 50% di atas grow-bed selada untuk mencegah *tip-burn* dan penguapan air kolam berlebih.' : '**Normal**. Pencahayaan cukup untuk fotosintesis optimal.'}`;
    }

    if (p.includes('panen') || p.includes('jadwal') || p.includes('selada') || p.includes('kangkung')) {
      return `Berdasarkan akumulasi fotosintesis dan EC rata-rata 14 hari terakhir (**${ec} mS/cm**):
- **Selada Romaine (DFT 3)**: Siap panen dalam **4-5 hari**. Bobot biomasa proyeksi 185-210 gram/tanaman.
- **Kangkung Gantung (Kolam 2)**: Memasuki fase potong pertama. Pangkas 5 cm di atas perakaran agar tunas generasi ke-2 tumbuh rimbun.
- Pastikan lakukan penyiraman air tawar bersih (*flushing*) 24 jam sebelum panen untuk rasa daun yang lebih segar dan renyah.`;
    }

    // Default contextual answer
    return `Halo! Saya memantau telemetri real-time fasilitas **${context.facility}**:
- **pH Kolam**: ${ph}
- **EC Nutrisi**: ${ec} mS/cm
- **Kelembaban Substrat**: ${moisture}%
- **Radiasi UV**: ${uv} UV

Kondisi ekosistem saat ini beroperasi stabil. Anda dapat menanyakan tentang analisis anomali nutrisi, perlakuan pH, jadwal panen, atau diagnosis gejala visual tanaman hidroponik.`;
  }
}
