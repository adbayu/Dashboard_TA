import { useState, useEffect } from 'react';
import { iotSimulator } from '../services/iotSimulator';

// Default initial user roles
export const USER_ROLES = {
  agronomist: {
    role: 'agronomist',
    name: 'Dr. Ir. Hendra Wicaksono, M.Sc.',
    title: 'Kepala Tim Agronomi & IoT Terapan',
    badge: 'Kredensial Otoritas Level 4',
    cert: 'Bio-IoT v2.4 Certified',
    id: '#AQ-AGR-0042',
    facility: 'Greenhouse Bintaro',
    subUnit: 'Bioflok Nila-04 & Hidro A',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  },
  operator: {
    role: 'operator',
    name: 'Budi Santoso',
    title: 'Operator Lapangan Fasilitas',
    badge: 'Kredensial Otoritas Level 2',
    cert: 'Teknisi IoT Terverifikasi',
    id: '#AQ-OPR-0118',
    facility: 'Greenhouse Bintaro',
    subUnit: 'Zona DFT & Tandon Nutrisi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  }
};

// Initial Sensor network table
const INITIAL_SENSORS = [
  { id: 'PH-01', type: 'Sensor pH Air', location: 'Kolam Bioflok Nila 04', lastValue: '6.8 pH', battery: 94, signal: '98%', lastCalib: '12 Feb 2026', status: 'optimal' },
  { id: 'PH-04', type: 'Sensor pH Substrat', location: 'Grow Bed Romaine B', lastValue: '7.9 pH', battery: 42, signal: '88%', lastCalib: '18 Jan 2026', status: 'needs_calibration' },
  { id: 'TDS-01', type: 'Konduktivitas EC/TDS', location: 'Tandon Nutrisi A', lastValue: '1.7 mS/cm', battery: 90, signal: '95%', lastCalib: '01 Mar 2026', status: 'optimal' },
  { id: 'DO-01', type: 'Oksigen Terlarut (DO)', location: 'Kolam Bioflok Nila 04', lastValue: '6.8 mg/L', battery: 85, signal: '92%', lastCalib: '24 Feb 2026', status: 'optimal' },
  { id: 'TEMP-W01', type: 'Suhu Air Celup', location: 'Kolam Bioflok Nila 04', lastValue: '25.4 °C', battery: 99, signal: '100%', lastCalib: '15 Jan 2026', status: 'optimal' },
  { id: 'SOIL-01', type: 'Kelembaban Substrat', location: 'Bedengan DFT 1', lastValue: '72.4 %', battery: 88, signal: '95%', lastCalib: '10 Feb 2026', status: 'optimal' },
  { id: 'SOIL-04', type: 'Kelembaban Substrat', location: 'Kebun Buah C1', lastValue: '58.6 %', battery: 22, signal: '45%', lastCalib: '05 Jan 2026', status: 'warning' },
  { id: 'METEO-01', type: 'Stasiun Meteorologi', location: 'Atap Menara Greenhouse', lastValue: '28.4 °C | 68% RH', battery: 100, signal: '98%', lastCalib: '20 Feb 2026', status: 'optimal' },
];

// Initial 30 historical log events
const INITIAL_LOGS = [
  { id: 'LOG-891', timestamp: '08 Mar 2026 10:45', sensorId: 'PH-04', location: 'Grow Bed Romaine B', event: 'Fluktuasi pH tidak stabil terdeteksi (>7.8 pH)', severity: 'warning', resolved: false },
  { id: 'LOG-890', timestamp: '08 Mar 2026 09:30', sensorId: 'SOIL-04', location: 'Kebun Buah C1', event: 'Tegangan baterai transmisi telemetri turun ke 22%', severity: 'warning', resolved: false },
  { id: 'LOG-889', timestamp: '08 Mar 2026 07:15', sensorId: 'METEO-01', location: 'Atap Greenhouse', event: 'Indeks radiasi UV terik mencapai 6.2 UV', severity: 'info', resolved: true },
  { id: 'LOG-888', timestamp: '07 Mar 2026 18:20', sensorId: 'TDS-01', location: 'Tandon Nutrisi A', event: 'Dosing pupuk A/B otomatis berhasil dijalankan (EC 1.7 mS)', severity: 'info', resolved: true },
  { id: 'LOG-887', timestamp: '07 Mar 2026 14:00', sensorId: 'DO-01', location: 'Kolam Bioflok Nila 04', event: 'Aerator venturi sekunder diaktifkan otomatis', severity: 'info', resolved: true },
  { id: 'LOG-886', timestamp: '06 Mar 2026 11:10', sensorId: 'TEMP-W01', location: 'Kolam Bioflok Nila 04', event: 'Suhu air kolam stabil di 25.2°C selama 72 jam', severity: 'info', resolved: true },
  { id: 'LOG-885', timestamp: '05 Mar 2026 08:45', sensorId: 'SOIL-01', location: 'Bedengan DFT 1', event: 'Irigasi tetes berkala 150ml/titik selesai', severity: 'info', resolved: true },
  { id: 'LOG-884', timestamp: '04 Mar 2026 16:30', sensorId: 'PH-01', location: 'Kolam Bioflok Nila 04', event: 'Kalibrasi rutin elektroda sensor pH sukses (Buffer 4.0 & 7.0)', severity: 'info', resolved: true },
  { id: 'LOG-883', timestamp: '03 Mar 2026 13:20', sensorId: 'METEO-01', location: 'Atap Greenhouse', event: 'Kecepatan angin 14 km/jam, sirkulasi ventilasi normal', severity: 'info', resolved: true },
  { id: 'LOG-882', timestamp: '02 Mar 2026 10:15', sensorId: 'DO-01', location: 'Kolam Bioflok Nila 04', event: 'Pemeriksaan biomassa ikan Nila pra-panen', severity: 'info', resolved: true },
];

export function useFarmStore() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('aquasmart_theme') || 'light');
  // Language state
  const [lang, setLang] = useState(() => localStorage.getItem('aquasmart_lang') || 'id');
  // Role / User state
  const [userRole, setUserRole] = useState(() => localStorage.getItem('aquasmart_role') || 'agronomist');
  // Telemetry state
  const [telemetry, setTelemetry] = useState(() => iotSimulator.getSnapshot());
  // Sensors table
  const [sensors, setSensors] = useState(() => {
    const saved = localStorage.getItem('aquasmart_sensors');
    return saved ? JSON.parse(saved) : INITIAL_SENSORS;
  });
  // Historical logs
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('aquasmart_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  // Parameter Thresholds
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('aquasmart_thresholds');
    return saved ? JSON.parse(saved) : {
      phMin: 6.2,
      phMax: 7.2,
      ecMin: 1.4,
      ecMax: 2.2,
      waterTempMin: 23.0,
      waterTempMax: 28.0,
      soilMoistureMin: 60.0,
      soilMoistureMax: 85.0,
      uvMax: 7.0,
    };
  });

  // Sync theme class to html document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aquasmart_theme', theme);
  }, [theme]);

  // Subscribe to live IoT Simulator updates
  useEffect(() => {
    const unsubscribe = iotSimulator.subscribe((newTelemetry) => {
      setTelemetry({ ...newTelemetry });
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const switchRole = (roleKey) => {
    setUserRole(roleKey);
    localStorage.setItem('aquasmart_role', roleKey);
  };

  const toggleLanguage = () => {
    const next = lang === 'id' ? 'en' : 'id';
    setLang(next);
    localStorage.setItem('aquasmart_lang', next);
  };

  const updateThresholds = (newValues) => {
    const updated = { ...thresholds, ...newValues };
    setThresholds(updated);
    localStorage.setItem('aquasmart_thresholds', JSON.stringify(updated));
  };

  const calibrateSensor = (sensorId) => {
    const updated = sensors.map(s => {
      if (s.id === sensorId) {
        return {
          ...s,
          status: 'optimal',
          lastCalib: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
      }
      return s;
    });
    setSensors(updated);
    localStorage.setItem('aquasmart_sensors', JSON.stringify(updated));

    // Add log entry
    const newLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      sensorId,
      location: sensors.find(s => s.id === sensorId)?.location || 'Fasilitas',
      event: `Kalibrasi ulang sensor ${sensorId} berhasil diselesaikan. Status normal.`,
      severity: 'info',
      resolved: true,
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('aquasmart_logs', JSON.stringify(updatedLogs));
  };

  const addSensor = (newSensor) => {
    const updated = [...sensors, newSensor];
    setSensors(updated);
    localStorage.setItem('aquasmart_sensors', JSON.stringify(updated));
  };

  const currentUser = USER_ROLES[userRole] || USER_ROLES.agronomist;

  return {
    theme,
    toggleTheme,
    lang,
    toggleLanguage,
    userRole,
    currentUser,
    switchRole,
    telemetry,
    sensors,
    calibrateSensor,
    addSensor,
    logs,
    thresholds,
    updateThresholds,
  };
}
