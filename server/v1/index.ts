import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { registerDeviceRoutes } from './devices.js';
import { registerDeviceTypeRoutes } from './device-types.js';
import { registerSensorTypeRoutes } from './sensor-types.js';
import { registerKeyRoutes } from './keys.js';
import { registerReadingRoutes } from './readings.js';
import { registerReadingExportRoute } from './readings-export.js';
import { registerEventRoutes } from './events.js';
import { registerStreamRoute, type StreamHub } from './stream.js';
import { registerSandboxRoutes } from './sandbox.js';

export function registerV1Routes(app: FastifyInstance, pool: pg.Pool, origin: string, streamHub: StreamHub) {
  registerSensorTypeRoutes(app, pool);
  registerDeviceTypeRoutes(app, pool);
  registerDeviceRoutes(app, pool, origin);
  registerKeyRoutes(app, pool);
  registerReadingRoutes(app, pool);
  registerReadingExportRoute(app, pool);
  registerEventRoutes(app, pool);
  registerStreamRoute(app, streamHub);
  registerSandboxRoutes(app, pool);
}
