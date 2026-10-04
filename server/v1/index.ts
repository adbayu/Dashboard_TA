import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { registerDeviceRoutes } from './devices.js';
import { registerDeviceTypeRoutes } from './device-types.js';
import { registerSensorTypeRoutes } from './sensor-types.js';

export function registerV1Routes(app: FastifyInstance, pool: pg.Pool, origin: string) {
  registerSensorTypeRoutes(app, pool);
  registerDeviceTypeRoutes(app, pool);
  registerDeviceRoutes(app, pool, origin);
}
