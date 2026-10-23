export function normalizeFishCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function setFishPopulation(areas, areaId, value) {
  const target = areas.find((area) => area.id === areaId && area.type === 'kolam');
  if (!target) return { areas, changed: false, population: null };

  const population = normalizeFishCount(value);
  return {
    areas: areas.map((area) => area.id === areaId ? { ...area, population } : area),
    changed: true,
    population,
  };
}

export function recordDailyMortality(areas, deaths, { areaId, count, catatan, tanggal, id, at }) {
  const target = areas.find((area) => area.id === areaId && area.type === 'kolam');
  if (!target) return { areas, deaths, changed: false, delta: 0, count: null };

  const jumlah = normalizeFishCount(count);
  const previous = deaths.find((row) => row.areaId === areaId && row.tanggal === tanggal);
  const delta = jumlah - (previous ? normalizeFishCount(previous.jumlah) : 0);
  const nextDeaths = previous
    ? deaths.map((row) => row.areaId === areaId && row.tanggal === tanggal
      ? { ...row, jumlah, catatan: catatan ?? row.catatan, at }
      : row)
    : [{ id, areaId, tanggal, jumlah, catatan: catatan || '', at }, ...deaths];
  const nextAreas = areas.map((area) => area.id === areaId
    ? { ...area, population: Math.max(0, normalizeFishCount(area.population) - delta) }
    : area);

  return {
    areas: nextAreas,
    deaths: nextDeaths.slice(0, 200),
    changed: true,
    delta,
    count: jumlah,
  };
}
