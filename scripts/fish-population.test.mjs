import assert from 'node:assert/strict';
import test from 'node:test';
import { recordDailyMortality, setFishPopulation } from '../src/data/fishPopulation.js';

const areas = [
  { id: 'AR-01', type: 'kolam', name: 'Kolam Nila A', population: 500 },
  { id: 'AR-03', type: 'growbed', name: 'Growbed 1', population: 640 },
];

test('sets an integer fish population on the target pond only', () => {
  const result = setFishPopulation(areas, 'AR-01', 512.4);
  assert.equal(result.changed, true);
  assert.equal(result.population, 512);
  assert.equal(result.areas.find((area) => area.id === 'AR-01').population, 512);
  assert.equal(result.areas.find((area) => area.id === 'AR-03').population, 640);
});

test('clamps population at zero and refuses non-pond areas', () => {
  const zero = setFishPopulation(areas, 'AR-01', -3);
  const growbed = setFishPopulation(areas, 'AR-03', 700);
  assert.equal(zero.population, 0);
  assert.equal(growbed.changed, false);
  assert.equal(growbed.areas.find((area) => area.id === 'AR-03').population, 640);
});

test('records daily deaths once and subtracts them from the shared pond population', () => {
  const result = recordDailyMortality(areas, [], {
    areaId: 'AR-01', count: 10, catatan: 'Pagi', tanggal: '2026-10-05', id: 'MT-1', at: 'now',
  });
  assert.equal(result.delta, 10);
  assert.equal(result.areas.find((area) => area.id === 'AR-01').population, 490);
  assert.equal(result.deaths.length, 1);
  assert.equal(result.deaths[0].jumlah, 10);
});

test('updates the same-day death total by its delta instead of double-counting', () => {
  const previous = [{ id: 'MT-1', areaId: 'AR-01', tanggal: '2026-10-05', jumlah: 10, catatan: 'Pagi' }];
  const currentAreas = [{ ...areas[0], population: 490 }, areas[1]];
  const increased = recordDailyMortality(currentAreas, previous, {
    areaId: 'AR-01', count: 14, catatan: 'Koreksi', tanggal: '2026-10-05', id: 'MT-2', at: 'later',
  });
  assert.equal(increased.delta, 4);
  assert.equal(increased.deaths.length, 1);
  assert.equal(increased.deaths[0].jumlah, 14);
  assert.equal(increased.areas[0].population, 486);

  const reduced = recordDailyMortality(increased.areas, increased.deaths, {
    areaId: 'AR-01', count: 3, catatan: '', tanggal: '2026-10-05', id: 'MT-3', at: 'latest',
  });
  assert.equal(reduced.delta, -11);
  assert.equal(reduced.areas[0].population, 497);
  assert.equal(reduced.deaths[0].jumlah, 3);
});

test('never makes population negative and rejects death entries for non-pond areas', () => {
  const smallArea = [{ ...areas[0], population: 4 }];
  const overReported = recordDailyMortality(smallArea, [], {
    areaId: 'AR-01', count: 9, catatan: '', tanggal: '2026-10-05', id: 'MT-1', at: 'now',
  });
  const growbed = recordDailyMortality(areas, [], {
    areaId: 'AR-03', count: 2, catatan: '', tanggal: '2026-10-05', id: 'MT-2', at: 'now',
  });
  assert.equal(overReported.areas[0].population, 0);
  assert.equal(growbed.changed, false);
  assert.equal(growbed.deaths.length, 0);
});
