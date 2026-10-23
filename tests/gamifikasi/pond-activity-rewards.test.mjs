import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_POINT_RULES } from '../../src/gamifikasi/data/seed.js';

const rewards = await import('../../src/gamifikasi/model/pondActivityRewards.js').catch(() => ({}));

test('maps only pond activities to stable point rule IDs', () => {
  assert.equal(typeof rewards.pointRuleIdForActivity, 'function');
  assert.equal(rewards.pointRuleIdForActivity('monitoring'), 'R-2');
  assert.equal(rewards.pointRuleIdForActivity('feed'), 'R-4');
  assert.equal(rewards.pointRuleIdForActivity('clean'), 'R-4');
  assert.equal(rewards.pointRuleIdForActivity('heal'), 'R-4');
  assert.equal(rewards.pointRuleIdForActivity('harvest'), 'R-6');
  assert.equal(rewards.pointRuleIdForActivity('mortality'), 'R-7');
  assert.equal(rewards.pointRuleIdForActivity('play'), null);
  assert.equal(rewards.pointRuleIdForActivity('hpp'), null);
  assert.equal(rewards.pointRuleIdForActivity('telemetry'), null);
});

test('defaults the mortality-report rule without changing existing point rule values', () => {
  assert.deepEqual(SEED_POINT_RULES.find((rule) => rule.id === 'R-7'), {
    id: 'R-7', activity: 'Catat kematian ikan', points: 5, daily: 1, active: true,
  });
  assert.equal(typeof rewards.ensureMortalityPointRule, 'function');
  const rules = rewards.ensureMortalityPointRule(SEED_POINT_RULES);
  assert.deepEqual(rules.find((rule) => rule.id === 'R-2'), SEED_POINT_RULES.find((rule) => rule.id === 'R-2'));
  assert.deepEqual(rules.find((rule) => rule.id === 'R-4'), SEED_POINT_RULES.find((rule) => rule.id === 'R-4'));
  assert.deepEqual(rules.find((rule) => rule.id === 'R-6'), SEED_POINT_RULES.find((rule) => rule.id === 'R-6'));
  assert.deepEqual(rules.find((rule) => rule.id === 'R-7'), {
    id: 'R-7', activity: 'Catat kematian ikan', points: 5, daily: 1, active: true,
  });
});

test('applies the configured per-user daily cap across ponds and shared care actions', () => {
  assert.equal(typeof rewards.evaluateActivityReward, 'function');
  const rule = { id: 'R-4', points: 10, daily: 3, active: true };
  const events = [
    { userId: 'U-1', date: '2026-10-13', ruleId: 'R-4', pointsAwarded: 10, areaId: 'AR-01' },
    { userId: 'U-1', date: '2026-10-13', ruleId: 'R-4', pointsAwarded: 10, areaId: 'AR-02' },
    { userId: 'U-1', date: '2026-10-13', ruleId: 'R-4', pointsAwarded: 10, areaId: 'AR-03' },
  ];
  const capped = rewards.evaluateActivityReward({ pointRules: [rule], events, userId: 'U-1', activityCode: 'heal', date: '2026-10-13', sourceId: 'ACT-4' });
  assert.equal(capped.points, 0);
  assert.equal(capped.capped, true);

  const otherUser = rewards.evaluateActivityReward({ pointRules: [rule], events, userId: 'U-2', activityCode: 'feed', date: '2026-10-13', sourceId: 'ACT-5' });
  assert.equal(otherUser.points, 10);
  assert.equal(otherUser.capped, false);
});

test('inactive, missing, and exhausted rules do not award points', () => {
  assert.equal(typeof rewards.evaluateActivityReward, 'function');
  assert.equal(rewards.evaluateActivityReward({ pointRules: [{ id: 'R-2', points: 15, daily: 4, active: false }], events: [], userId: 'U-1', activityCode: 'monitoring', date: '2026-10-13', sourceId: 'MON-1' }).points, 0);
  assert.equal(rewards.evaluateActivityReward({ pointRules: [], events: [], userId: 'U-1', activityCode: 'monitoring', date: '2026-10-13', sourceId: 'MON-1' }).points, 0);
  assert.equal(rewards.evaluateActivityReward({ pointRules: [{ id: 'R-6', points: 100, daily: 1, active: true }], events: [{ userId: 'U-1', date: '2026-10-13', ruleId: 'R-6', pointsAwarded: 100 }], userId: 'U-1', activityCode: 'harvest', date: '2026-10-13', sourceId: 'HV-2' }).points, 0);
});

test('records activity events idempotently by user and source event ID', () => {
  assert.equal(typeof rewards.recordActivityEvent, 'function');
  const event = { id: 'ACT-1', userId: 'U-1', activityCode: 'mortality', sourceId: 'AR-01|2026-10-13', date: '2026-10-13' };
  const first = rewards.recordActivityEvent([], event);
  assert.equal(first.duplicate, false);
  assert.equal(first.events.length, 1);
  const duplicate = rewards.recordActivityEvent(first.events, { ...event, id: 'ACT-2' });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.events.length, 1);
});

test('derives Gamifikasi mission status from the current user’s real events only', () => {
  assert.equal(typeof rewards.deriveDailyMissions, 'function');
  const missions = [
    { id: 'M-WATER', activityCode: 'water-check' },
    { id: 'M-FEED', activityCode: 'feed' },
    { id: 'M-CARE', activityCode: 'care' },
  ];
  const events = [
    { userId: 'U-1', date: '2026-10-13', activityCode: 'monitoring', parameterCount: 2 },
    { userId: 'U-2', date: '2026-10-13', activityCode: 'feed' },
    { userId: 'U-1', date: '2026-10-12', activityCode: 'heal' },
  ];
  const result = rewards.deriveDailyMissions(missions, events, 'U-1', '2026-10-13');
  assert.deepEqual(result.map((mission) => mission.done), [true, false, false]);
});
