export const AREA_HISTORY_REFRESH_MS = 300_000;
export const AREA_HISTORY_LABEL = 'Hari ini sejak 00.00 (waktu perangkatmu)';

export function attentionBadgeLabel(count) {
  return `[${count}] kejadian perlu perhatian`;
}

const SANDBOX_CONNECTION_STATES = {
  online: { label: 'Terhubung', icon: 'wifi', tone: 'ok' },
  stale: { label: 'Data tertunda', icon: 'schedule', tone: 'warn' },
  offline: { label: 'Tidak terhubung', icon: 'wifi_off', tone: 'bad' },
};

export function sandboxConnectionStatus(status) {
  return SANDBOX_CONNECTION_STATES[status] || { label: 'Status tidak diketahui', icon: 'help', tone: 'muted' };
}

export function sandboxCurlExample({ deviceId, scenario = 'normal', apiKeyPrefix } = {}) {
  const prefix = /^jf_test_[a-f0-9]{4}$/.test(apiKeyPrefix || '') ? apiKeyPrefix : 'jf_test_<PREFIX>';
  const safeDeviceId = encodeURIComponent(deviceId || '<DEVICE_ID>');
  const scenarios = ['normal', 'ph_turun', 'suhu_naik', 'offline'];
  const safeScenario = scenarios.includes(scenario) ? scenario : 'normal';
  return [
    `# Prefix key Test yang aman: ${prefix}`,
    `curl --request PUT "\${JAGOFARM_API_ORIGIN}/api/v1/sandbox/devices/${safeDeviceId}/scenario" \\`,
    '  --header "Authorization: Bearer ${JAGOFARM_TEST_API_KEY}" \\',
    '  --header "Content-Type: application/json" \\',
    `  --data '{"scenario":"${safeScenario}"}'`,
  ].join('\n');
}

export function countAttentionDevices(devices = [], latestByDevice = {}) {
  const attention = new Set();
  for (const device of devices) {
    if (!device?.id || device.isSandbox || device.is_sandbox) continue;
    const hasThresholdAlert = latestByDevice[device.id]?.readings?.some(reading =>
      reading.state === 'low' || reading.state === 'high');
    if (device.status === 'offline' || hasThresholdAlert) attention.add(device.id);
  }
  return attention.size;
}

export function getLocalDayRange(now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString(), label: AREA_HISTORY_LABEL };
}

export function summarizeAreaPoints(points = []) {
  const valid = points.filter(point => Number.isFinite(Number(point.avg))
    && Number.isFinite(Number(point.min))
    && Number.isFinite(Number(point.max))
    && Number.isFinite(Number(point.n))
    && Number(point.n) > 0);
  if (!valid.length) return null;

  const n = valid.reduce((total, point) => total + Number(point.n), 0);
  return {
    min: Math.min(...valid.map(point => Number(point.min))),
    avg: valid.reduce((total, point) => total + Number(point.avg) * Number(point.n), 0) / n,
    max: Math.max(...valid.map(point => Number(point.max))),
    n,
  };
}

export function mergeEventPages(current = [], next = []) {
  const byId = new Map();
  for (const event of [...current, ...next]) {
    if (event?.id !== null && event?.id !== undefined) byId.set(String(event.id), event);
  }
  return [...byId.values()].sort((left, right) => {
    const leftId = /^\d+$/.test(String(left.id)) ? BigInt(left.id) : null;
    const rightId = /^\d+$/.test(String(right.id)) ? BigInt(right.id) : null;
    if (leftId === null) return rightId === null ? 0 : 1;
    if (rightId === null) return -1;
    return leftId > rightId ? -1 : leftId < rightId ? 1 : 0;
  });
}

export function createBoundedBatchRunner({ concurrency = 4, maxRequests = Number.MAX_SAFE_INTEGER } = {}) {
  let running = false;

  return {
    isRunning() {
      return running;
    },
    async run(tasks = []) {
      if (running) return { skipped: true, results: [], counters: { started: 0, total: tasks.length, maxActive: 0 } };
      if (tasks.length > maxRequests) throw new Error(`Batch meminta ${tasks.length} route, maksimal ${maxRequests}.`);

      running = true;
      const results = new Array(tasks.length);
      let nextIndex = 0;
      let active = 0;
      let maxActive = 0;
      let started = 0;
      const workerCount = Math.min(Math.max(1, concurrency), tasks.length);

      try {
        await Promise.all(Array.from({ length: workerCount }, async () => {
          while (nextIndex < tasks.length) {
            const index = nextIndex;
            nextIndex += 1;
            active += 1;
            started += 1;
            maxActive = Math.max(maxActive, active);
            try {
              results[index] = { status: 'fulfilled', value: await tasks[index]() };
            } catch (reason) {
              results[index] = { status: 'rejected', reason };
            } finally {
              active -= 1;
            }
          }
        }));
        return { skipped: false, results, counters: { started, total: tasks.length, maxActive } };
      } finally {
        running = false;
      }
    },
  };
}
