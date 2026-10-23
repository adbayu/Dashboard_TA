export function missionActivityDestination(mission, accessibleAreas = []) {
  if (mission?.activityCode === 'water-check') {
    const pond = (Array.isArray(accessibleAreas) ? accessibleAreas : [])
      .find((area) => area?.type === 'kolam');
    return pond
      ? { path: `/area/${encodeURIComponent(pond.id)}#form-pemantauan` }
      : { path: '/area' };
  }

  if (mission?.activityCode === 'feed' || mission?.activityCode === 'care') {
    return {
      path: '/v-pet',
      state: { openMissionActivity: mission.activityCode },
    };
  }

  return { path: '/area' };
}
