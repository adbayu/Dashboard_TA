import assert from 'node:assert/strict';
import test from 'node:test';

test('opens the first accessible pond monitoring form for water-check missions', async () => {
  const { missionActivityDestination } = await import('../../src/gamifikasi/model/missionNavigation.js');
  const destination = missionActivityDestination(
    { activityCode: 'water-check' },
    [
      { id: 'AR-02', type: 'growbed' },
      { id: 'AR-03', type: 'kolam' },
    ],
  );
  assert.deepEqual(destination, { path: '/area/AR-03#form-pemantauan' });
});

test('opens the V-Pet care dialog for feeding and care missions', async () => {
  const { missionActivityDestination } = await import('../../src/gamifikasi/model/missionNavigation.js');
  assert.deepEqual(missionActivityDestination({ activityCode: 'feed' }, []), {
    path: '/v-pet',
    state: { openMissionActivity: 'feed' },
  });
  assert.deepEqual(missionActivityDestination({ activityCode: 'care' }, []), {
    path: '/v-pet',
    state: { openMissionActivity: 'care' },
  });
});

test('falls back to the area list when no accessible pond exists', async () => {
  const { missionActivityDestination } = await import('../../src/gamifikasi/model/missionNavigation.js');
  assert.deepEqual(missionActivityDestination({ activityCode: 'water-check' }, []), { path: '/area' });
});

test('uses the area list for unknown mission activity codes', async () => {
  const { missionActivityDestination } = await import('../../src/gamifikasi/model/missionNavigation.js');
  assert.deepEqual(missionActivityDestination({ activityCode: 'unknown' }, []), { path: '/area' });
});
