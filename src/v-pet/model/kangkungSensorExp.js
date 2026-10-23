import { applyPetExperience } from './petProgress.js';

export const KANGKUNG_SENSOR_KEYS = Object.freeze(['ph', 'temp', 'tds']);
export const KANGKUNG_SENSOR_EXP_PER_DAY = 10;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function kangkungSensorStatus(metrics = []) {
  const byKey = new Map((Array.isArray(metrics) ? metrics : []).map((metric) => [metric?.key, metric]));
  return KANGKUNG_SENSOR_KEYS.map((key) => {
    const metric = byKey.get(key);
    const value = metric?.value != null && metric.value !== '' && Number.isFinite(Number(metric.value))
      ? Number(metric.value)
      : null;
    const rawThreshold = metric?.threshold ?? metric?.ambang;
    const threshold = Array.isArray(rawThreshold)
      && rawThreshold.length === 2
      && rawThreshold.every((item) => Number.isFinite(Number(item)))
      ? rawThreshold.map(Number)
      : null;
    const state = value == null ? 'tanpa-data'
      : !threshold || threshold[0] > threshold[1] ? 'tanpa-ambang'
        : value < threshold[0] ? 'bawah'
          : value > threshold[1] ? 'atas'
            : 'dalam';
    return { key, label: metric?.label || ({ ph: 'pH air', temp: 'Suhu air', tds: 'TDS nutrisi' }[key]), value, threshold, unit: metric?.unit || '', state };
  });
}

export function kangkungSensorReaction(metrics = [], areaName = 'kolam') {
  const readings = kangkungSensorStatus(metrics);
  const ready = readings.every((reading) => !['tanpa-data', 'tanpa-ambang'].includes(reading.state));
  const issues = readings.filter((reading) => reading.state === 'bawah' || reading.state === 'atas');
  const temperatureIssue = issues.find((reading) => reading.key === 'temp');
  const allSafe = ready && issues.length === 0;
  const expression = !ready ? 'normal'
    : allSafe ? 'senang'
      : temperatureIssue?.state === 'bawah' ? 'kedinginan'
        : temperatureIssue?.state === 'atas' ? 'kepanasan'
          : 'sedih';
  const message = !ready
    ? `Menunggu pembacaan pH, suhu, dan TDS lengkap dengan ambang aktif.`
    : allSafe
      ? `pH, suhu, dan TDS berada dalam rentang ${areaName} yang ditetapkan untuk pertumbuhan Kangkung.`
      : `${issues[0].label} ${issues[0].value} ${issues[0].unit} di luar rentang ${issues[0].threshold[0]}–${issues[0].threshold[1]} ${issues[0].unit}; periksa larutan hidroponik.`;
  const parameter = readings.map((reading) => ({
    key: reading.key,
    label: reading.label,
    value: reading.value,
    unit: reading.unit,
    ambang: reading.threshold,
    tingkat: reading.state === 'dalam' ? 'aman'
      : ['tanpa-data', 'tanpa-ambang'].includes(reading.state) ? 'unknown' : 'waspada',
  }));
  return {
    readings,
    parameter,
    ready,
    allSafe,
    expression,
    ekspresi: expression,
    message,
    pesan: message,
    tingkat: allSafe ? 'aman' : 'waspada',
    aksi: allSafe ? 'Pertahankan kondisi' : ready ? 'Periksa larutan hidroponik' : 'Periksa sensor IoT',
    sebab: issues[0] ? { key: issues[0].key, label: issues[0].label } : null,
  };
}

export function isKangkungSensorSnapshotSafe(metrics = []) {
  return kangkungSensorStatus(metrics).every((metric) => metric.state === 'dalam');
}

export function applyKangkungSensorExp(state = {}, { areaId, date, metrics = [], at = '' } = {}) {
  const currentState = state && typeof state === 'object' ? state : {};
  if (!areaId || !DATE_KEY.test(String(date || ''))) {
    return { state: currentState, awardedPetIds: [], xpAwarded: 0, reason: 'invalid' };
  }
  const sensorStatus = kangkungSensorStatus(metrics);
  if (!sensorStatus.every((metric) => metric.state === 'dalam')) {
    return { state: currentState, awardedPetIds: [], xpAwarded: 0, reason: 'sensor-not-ready' };
  }

  const pets = Array.isArray(currentState.pets) ? currentState.pets : [];
  const eligiblePets = pets.filter((pet) =>
    String(pet?.species || '').trim().toLowerCase() === 'kangkung'
      && pet.expMode === 'iot-daily'
      && pet.appliedToAreaId === areaId,
  );
  if (eligiblePets.length === 0) {
    return { state: currentState, awardedPetIds: [], xpAwarded: 0, reason: 'no-sensor-pet' };
  }

  const completions = Array.isArray(currentState.petSensorExpCompletions)
    ? currentState.petSensorExpCompletions
    : [];
  const awardedAlready = new Set(completions
    .filter((completion) => completion?.areaId === areaId && completion?.date === date)
    .map((completion) => completion.petId));
  const recipients = eligiblePets.filter((pet) => !awardedAlready.has(pet.id));
  if (recipients.length === 0) {
    return { state: currentState, awardedPetIds: [], xpAwarded: 0, reason: 'already-awarded' };
  }

  const awardedPetIds = new Set(recipients.map((pet) => pet.id));
  let xpAwarded = 0;
  const nextPets = pets.map((pet) => {
    if (!awardedPetIds.has(pet.id)) return pet;
    xpAwarded += KANGKUNG_SENSOR_EXP_PER_DAY;
    const upgraded = applyPetExperience(pet, KANGKUNG_SENSOR_EXP_PER_DAY);
    return {
      ...upgraded,
      log: [{
        id: `IOT-${pet.id}-${date}`,
        at,
        text: 'pH, suhu, dan TDS kolam berada dalam ambang; EXP sensor harian Kangkung.',
        delta: `+${KANGKUNG_SENSOR_EXP_PER_DAY} EXP (IoT harian)`,
      }, ...(Array.isArray(pet.log) ? pet.log : [])].slice(0, 20),
    };
  });
  const addedCompletions = recipients.map((pet) => ({
    id: `iot-daily|${pet.id}|${date}`,
    petId: pet.id,
    areaId,
    date,
    sourceType: 'iot-daily',
    expAwarded: KANGKUNG_SENSOR_EXP_PER_DAY,
    readings: Object.fromEntries(sensorStatus.map((metric) => [metric.key, {
      value: metric.value,
      threshold: metric.threshold,
    }])),
  }));
  const selectedPet = nextPets.find((pet) => pet.id === currentState.selectedPetId) || nextPets[0] || null;
  return {
    state: {
      ...currentState,
      pets: nextPets,
      pet: selectedPet,
      petSensorExpCompletions: [...addedCompletions, ...completions],
    },
    awardedPetIds: [...awardedPetIds],
    xpAwarded,
    reason: null,
  };
}
