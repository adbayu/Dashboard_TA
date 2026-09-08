import React, { useState } from 'react';

const CROP_DATA = {
  kangkung: {
    id: 'kangkung',
    name: 'Kangkung Air (Ipomoea aquatica)',
    title: 'Kangkung Biofilter Kolam Nila',
    subtitle: 'Biofilter agresif dengan serapan nitrogen amonium sangat tinggi',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=700',
    description: `Kangkung tumbuh sangat subur di lingkungan berkelembaban tinggi dengan ketersediaan nitrogen terlarut yang signifikan. Dalam sistem akuaponik JagoFarm, kangkung bertindak sebagai biofilter biologis agresif yang dengan cepat menyerap nitrat dan ion amonium yang dihasilkan oleh metabolisme kotoran Ikan Nila. Tanaman ini menyukai suhu air hangat (24-28°C) dan membutuhkan tingkat pH stabil (6.2 - 6.8) untuk mencegah penguncian unsur hara mikro.`,
    harvestCycle: '21 - 25 Hari',
    idealPh: '6.0 - 6.8',
    idealEc: '1.4 - 2.0 mS/cm',
    waterTemp: '24°C - 29°C',
    sensors: [
      {
        title: 'Pengukur TDS / EC',
        role: 'Penyerapan Nutrisi',
        desc: 'Memastikan kecukupan kation hara terlarut dari limbah feses ikan untuk menghasilkan daun hijau royo-royo.',
        icon: 'opacity',
        status: 'Aktif',
      },
      {
        title: 'Sensor pH Air',
        role: 'Ketersediaan Unsur Hara',
        desc: 'Menghindari defisiensi besi (Fe) dan klorosis apabila pH air kolam naik melebihi ambang batas 7.2.',
        icon: 'science',
        status: 'Aktif',
      },
      {
        title: 'Sensor Oksigen Terlarut (DO)',
        role: 'Respirasi Akar & Nitrifikasi',
        desc: 'Mendukung kolonisasi bakteri Nitrosomonas dan perakaran yang putih bersih bebas pembusukan anaerob.',
        icon: 'air',
        status: 'Aktif',
      },
    ]
  },
  selada: {
    id: 'selada',
    name: 'Selada Romaine & Keriting (Lactuca sativa)',
    title: 'Selada Hijau Premium DFT',
    subtitle: 'Komoditas bernilai tinggi dengan kebutuhan mikronutrien sensitif',
    image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&q=80&w=700',
    description: `Selada Romaine merupakan komoditas primadona di instalasi talang DFT kebun kami. Sangat sensitif terhadap suhu air yang terlalu hangat (>28°C) yang dapat memicu premature bolting (berbunga dini) dan rasa pahit. Selada membutuhkan ketersediaan kalsium (Ca) yang teratur dengan laju transpirasi baik untuk mencegah *tip-burn* pada ujung daun muda.`,
    harvestCycle: '35 - 40 Hari',
    idealPh: '6.2 - 6.8',
    idealEc: '1.2 - 1.8 mS/cm',
    waterTemp: '22°C - 26°C',
    sensors: [
      {
        title: 'Sensor pH Substrat',
        role: 'Pencegahan Klorosis Daun',
        desc: 'Memonitor alkalinitas rizosfer agar kation besi (Fe) dan mangan (Mn) terserap sempurna tanpa bintik kuning.',
        icon: 'science',
        status: 'Aktif',
      },
      {
        title: 'Sensor Suhu Air Celup',
        role: 'Pencegahan Bolting',
        desc: 'Memastikan suhu air di talang DFT tetap sejuk di bawah 26°C melalui sirkulasi tandon berinsulasi.',
        icon: 'thermostat',
        status: 'Aktif',
      },
      {
        title: 'Sensor Radiasi UV Paranet',
        role: 'Pencegahan Tip-Burn',
        desc: 'Memberikan sinyal otomatis aktivasi tirai peneduh saat intensitas UV siang hari melampaui indeks 6.0.',
        icon: 'wb_sunny',
        status: 'Aktif',
      },
    ]
  },
  sawi: {
    id: 'sawi',
    name: 'Pakcoy / Sawi Sendok (Brassica rapa)',
    title: 'Pakcoy Hidroponik Komersial',
    subtitle: 'Daya tahan tinggi dan toleransi fluktuasi EC yang luas',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=700',
    description: `Pakcoy memiliki batang tebal berair yang sangat responsif terhadap konsentrasi fosfor dan kalium yang seimbang. Tanaman ini mampu bertoleransi terhadap rentang EC yang sedikit lebih pekat hingga 2.2 mS/cm. Kepadatan tanaman pada instalasi hidroponik JagoFarm dirancang untuk memaksimalkan tangkapan cahaya matahari pagi.`,
    harvestCycle: '28 - 32 Hari',
    idealPh: '6.0 - 7.0',
    idealEc: '1.6 - 2.2 mS/cm',
    waterTemp: '23°C - 28°C',
    sensors: [
      {
        title: 'Konduktivitas EC',
        role: 'Kekuatan Batang Sendok',
        desc: 'Menjaga kerenyahan tekstur tangkai daun pakcoy dengan ketersediaan kalium kalibrasi tinggi.',
        icon: 'opacity',
        status: 'Aktif',
      },
      {
        title: 'Kelembaban Udara RH',
        role: 'Imunitas Daun',
        desc: 'Mencegah serangan spora jamur bulai (*downy mildew*) dengan mempertahankan sirkulasi udara stabil.',
        icon: 'water_drop',
        status: 'Aktif',
      },
      {
        title: 'Sensor Ketinggian Air Tandon',
        role: 'Kontinuitas Aliran DFT',
        desc: 'Memastikan lapisan genangan nutrisi 3 cm selalu mengalir stabil melewati pangkal netpot.',
        icon: 'waves',
        status: 'Aktif',
      },
    ]
  }
};

export default function Ensiklopedia() {
  const [activeTab, setActiveTab] = useState('kangkung');
  const crop = CROP_DATA[activeTab];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary">
            Ensiklopedia Tanaman & Biofilter Akuaponik
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
            Panduan agronomi spesifik komoditas, dampak telemetri kualitas air, dan peranan filtrasi biologis simbiosis Ikan Nila.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-outline-variant/20 pb-1">
        {Object.keys(CROP_DATA).map((key) => {
          const item = CROP_DATA[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 px-4 font-headline-md text-sm font-bold transition-all border-b-2 ${
                isActive
                  ? 'border-primary text-primary dark:text-emerald-glow'
                  : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              {item.name.split('(')[0]}
            </button>
          );
        })}
      </div>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Photo & Growth Requirements */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-6 flex flex-col h-full shadow-sm">
            <div className="w-full h-64 rounded-2xl overflow-hidden mb-5 bg-surface-container relative">
              <img
                src={crop.image}
                alt={crop.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md">
                Siklus: {crop.harvestCycle}
              </span>
            </div>

            <h2 className="font-headline-md text-xl font-bold text-primary mb-1">{crop.title}</h2>
            <p className="text-xs text-outline font-semibold mb-3">{crop.subtitle}</p>

            <p className="font-body-md text-xs leading-relaxed text-on-surface-variant mb-6">
              {crop.description}
            </p>

            {/* Quick Metrics */}
            <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t border-outline-variant/20 text-center">
              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-outline-variant/20">
                <span className="text-[10px] text-outline uppercase font-bold">Target pH</span>
                <p className="font-bold text-xs text-primary mt-0.5">{crop.idealPh}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-outline-variant/20">
                <span className="text-[10px] text-outline uppercase font-bold">Target EC</span>
                <p className="font-bold text-xs text-secondary mt-0.5">{crop.idealEc}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-outline-variant/20">
                <span className="text-[10px] text-outline uppercase font-bold">Suhu Air</span>
                <p className="font-bold text-xs text-tertiary mt-0.5">{crop.waterTemp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): IoT Sensor Impact on Growth */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col h-full shadow-sm">
            <h3 className="font-headline-md text-lg font-bold text-on-surface mb-1">
              Dampak Kualitas Air Kolam terhadap Pertumbuhan
            </h3>
            <p className="font-body-md text-xs text-outline mb-6">
              Telemetri sensor waktu nyata memastikan kondisi ideal tanpa fluktuasi ekstrem:
            </p>

            <div className="space-y-4">
              {crop.sensors.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 border border-white/80 dark:border-white/10 flex gap-4 items-start hover:bg-white/80 transition-colors shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl fill">{s.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-headline-md text-sm font-bold text-on-surface">{s.title}</h4>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-secondary mb-1">{s.role}</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Symbiosis Guide Note */}
            <div className="mt-auto pt-6 border-t border-outline-variant/20">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-white/50 to-secondary/10 border border-primary/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl fill">psychology</span>
                <p className="text-xs text-on-surface-variant">
                  <strong>Konsultasi AI Tersedia:</strong> Ingin mengetahui dosis suplemen Fe atau takaran aerasi untuk varietas ini? Buka menu <strong>Asisten AI</strong> untuk kalkulasi cepat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
