// IoT Simulator Service for AquaSmartponik precision ecosystem

class IoTSimulatorService {
  constructor() {
    this.subscribers = new Set();
    this.intervalId = null;

    // Base Telemetry State
    this.telemetry = {
      water: {
        ph: 6.8,
        phStatus: 'ideal', // ideal, warning, danger
        tds: 850, // ppm
        ec: 1.7, // mS/cm
        waterTemp: 25.4, // °C
        waterLevel: 92, // %
        dissolvedOxygen: 6.8, // mg/L
        respirationRate: 'Stabil',
      },
      climate: {
        nodeId: '#AQ-CLIMATE-802',
        stationName: 'Stasiun 1 - Menara Cuaca Utama',
        airTemp: 28.4,
        airTempStatus: 'ideal',
        humidity: 68.0,
        humidityStatus: 'ideal',
        uvIndex: 6.2,
        uvStatus: 'warning', // 6.2 UV is Waspada in Stitch design
        monthlyRain: 142, // mm
        windSpeed: 8.4, // km/h
        windDirection: 'Tenggara (135°)',
        barometer: 1012, // hPa
        syncStatus: 'Auto-sync Aktif (60s)',
        signal: 98,
      },
      // 5 Substrate / Soil IoT Stations
      soilStations: [
        {
          id: 'AQ-SOIL-709',
          name: 'Stasiun 1 - Zona Substrat B2',
          zone: 'Zona Substrat B2',
          status: 'normal',
          signal: 'LoRaWAN Terhubung',
          signalLevel: 95,
          battery: 88,
          moisture: 72.4,
          soilTemp: 24.8,
          nitrogen: 145,
          phosphorus: 48,
          potassium: 210,
          ec: 1.8,
          ph: 6.5,
          active: true,
        },
        {
          id: 'AQ-SOIL-710',
          name: 'Stasiun 2 - Bedengan A1',
          zone: 'Bedengan A1',
          status: 'normal',
          signal: 'Signal Kuat',
          signalLevel: 92,
          battery: 88,
          moisture: 68.1,
          soilTemp: 25.2,
          nitrogen: 138,
          phosphorus: 44,
          potassium: 198,
          ec: 1.7,
          ph: 6.6,
          active: false,
        },
        {
          id: 'AQ-SOIL-711',
          name: 'Stasiun 3 - Greenhouse Sayur',
          zone: 'Greenhouse Sayur',
          status: 'normal',
          signal: 'Signal Sedang',
          signalLevel: 78,
          battery: 74,
          moisture: 74.0,
          soilTemp: 24.2,
          nitrogen: 152,
          phosphorus: 50,
          potassium: 220,
          ec: 1.9,
          ph: 6.4,
          active: false,
        },
        {
          id: 'AQ-SOIL-712',
          name: 'Stasiun 4 - Kebun Buah C1',
          zone: 'Kebun Buah C1',
          status: 'warning',
          signal: 'Signal Lemah',
          signalLevel: 45,
          battery: 22, // Low battery warning in Stitch
          moisture: 58.6,
          soilTemp: 26.5,
          nitrogen: 110,
          phosphorus: 38,
          potassium: 165,
          ec: 1.4,
          ph: 6.2,
          active: false,
        },
        {
          id: 'AQ-SOIL-715',
          name: 'Stasiun 5 - Persemaian Bibit',
          zone: 'Persemaian Bibit',
          status: 'normal',
          signal: 'Signal Kuat',
          signalLevel: 98,
          battery: 95,
          moisture: 80.2,
          soilTemp: 23.9,
          nitrogen: 160,
          phosphorus: 55,
          potassium: 230,
          ec: 1.6,
          ph: 6.7,
          active: false,
        },
      ],
      // Weather Stations list for drawer
      weatherStations: [
        {
          id: '#AQ-CLIMATE-802',
          name: 'Stasiun 1 - Menara Cuaca Utama',
          status: 'normal',
          signal: 98,
          desc: 'Suhu Udara, RH, UV, Curah Hujan, Kecepatan Angin (5 Parameter).',
          active: true,
        },
        {
          id: '#AQ-CLIMATE-803',
          name: 'Stasiun 2 - Mikroklimat Greenhouse A',
          status: 'normal',
          signal: 92,
          desc: 'Suhu Udara Dalam, RH Dalam, Intensitas PAR, Suhu Daun.',
          active: false,
        },
        {
          id: '#AQ-CLIMATE-804',
          name: 'Stasiun 3 - Radiasi & Angin Luar',
          status: 'warning',
          signal: 85,
          desc: 'Anemometer, Arah Angin, Barometer, UV Sensor Luar.',
          active: false,
        },
        {
          id: '#AQ-CLIMATE-805',
          name: 'Stasiun 4 - Zona Pembibitan',
          status: 'danger',
          signal: 45,
          desc: 'Suhu Bibit, Humidifier Status, Fogger Output, VPD.',
          active: false,
        },
      ],
      // System Overall Health
      systemHealth: {
        score: 96,
        status: 'Optimal',
        activeNodes: 14,
        needsCalibration: 1,
        averageBattery: 88,
        lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
    };

    this.startSimulation();
  }

  startSimulation() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 4000); // realistic gentle drift every 4 seconds
  }

  stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Random bounded jitter helper
  jitter(val, maxDelta, min, max, precision = 1) {
    const delta = (Math.random() * 2 - 1) * maxDelta;
    let next = val + delta;
    if (next < min) next = min;
    if (next > max) next = max;
    return Number(next.toFixed(precision));
  }

  tick() {
    // Gentle natural micro-fluctuations
    this.telemetry.water.ph = this.jitter(this.telemetry.water.ph, 0.03, 6.2, 7.8, 2);
    this.telemetry.water.ec = this.jitter(this.telemetry.water.ec, 0.02, 1.2, 2.4, 2);
    this.telemetry.water.waterTemp = this.jitter(this.telemetry.water.waterTemp, 0.1, 22, 29, 1);
    this.telemetry.water.dissolvedOxygen = this.jitter(this.telemetry.water.dissolvedOxygen, 0.05, 5.0, 8.5, 2);

    this.telemetry.climate.airTemp = this.jitter(this.telemetry.climate.airTemp, 0.15, 24, 34, 1);
    this.telemetry.climate.humidity = this.jitter(this.telemetry.climate.humidity, 0.3, 50, 90, 1);
    this.telemetry.climate.uvIndex = this.jitter(this.telemetry.climate.uvIndex, 0.1, 1, 11, 1);
    this.telemetry.climate.windSpeed = this.jitter(this.telemetry.climate.windSpeed, 0.2, 2, 25, 1);

    // Update active soil station
    const activeSoil = this.telemetry.soilStations.find(s => s.active) || this.telemetry.soilStations[0];
    activeSoil.moisture = this.jitter(activeSoil.moisture, 0.2, 40, 90, 1);
    activeSoil.soilTemp = this.jitter(activeSoil.soilTemp, 0.1, 20, 30, 1);

    this.telemetry.systemHealth.lastUpdated = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.notifySubscribers();
  }

  // Inject specific anomaly for testing
  injectAnomaly(type) {
    if (type === 'ph_high') {
      this.telemetry.water.ph = 8.4;
      this.telemetry.water.phStatus = 'danger';
    } else if (type === 'soil_dry') {
      const activeSoil = this.telemetry.soilStations.find(s => s.active) || this.telemetry.soilStations[0];
      activeSoil.moisture = 28.5;
      activeSoil.status = 'danger';
    } else if (type === 'uv_extreme') {
      this.telemetry.climate.uvIndex = 9.8;
      this.telemetry.climate.uvStatus = 'danger';
    } else if (type === 'reset') {
      this.telemetry.water.ph = 6.8;
      this.telemetry.water.phStatus = 'ideal';
      this.telemetry.water.ec = 1.7;
      const activeSoil = this.telemetry.soilStations.find(s => s.active) || this.telemetry.soilStations[0];
      activeSoil.moisture = 72.4;
      activeSoil.status = 'normal';
      this.telemetry.climate.uvIndex = 6.2;
      this.telemetry.climate.uvStatus = 'warning';
    }
    this.notifySubscribers();
  }

  selectSoilStation(id) {
    this.telemetry.soilStations.forEach(s => {
      s.active = s.id === id;
    });
    this.notifySubscribers();
  }

  selectWeatherStation(id) {
    this.telemetry.weatherStations.forEach(s => {
      s.active = s.id === id;
      if (s.active) {
        this.telemetry.climate.nodeId = s.id;
        this.telemetry.climate.stationName = s.name;
      }
    });
    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.telemetry);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb({ ...this.telemetry }));
  }

  getSnapshot() {
    return { ...this.telemetry };
  }
}

export const iotSimulator = new IoTSimulatorService();
