import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { Actor } from '../auth/session.js';
import { failV1, requireActor, v1Object } from './common.js';
import { actorCanSeeDevice } from './access.js';
import { eventVisibleToActor, queryVisibleEvents, type DeviceEvent } from './events.js';

export const HEARTBEAT_INTERVAL_MS = 25_000;
export const MAX_STREAMS_PER_ACTOR = 5;

export type StreamClock = { every: (callback: () => void, delayMs: number) => () => void };
type StreamEventName = 'reading' | 'device_event';
type StreamFrame = { event: StreamEventName; id?: string; data: Record<string, unknown> };
type StreamWriter = (frame: string) => void;

export type StreamConnection = {
  actor: Actor;
  readonly closed: boolean;
  queue: (frame: StreamFrame) => void;
  replay: (frame: StreamFrame) => void;
  finishReplay: () => void;
  close: (endResponse?: boolean) => void;
};

type StreamHubOptions = { maxConnectionsPerActor?: number; clock?: StreamClock };

const systemClock: StreamClock = {
  every(callback, delayMs) {
    const timer = setInterval(callback, delayMs);
    timer.unref();
    return () => clearInterval(timer);
  },
};

function encode(frame: StreamFrame): string {
  const id = frame.event === 'device_event' && frame.id ? `id: ${frame.id}\n` : '';
  return `${id}event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
}

function deviceEventData(event: DeviceEvent): Record<string, unknown> {
  return {
    deviceId: event.deviceId,
    type: event.type,
    sensor: event.sensor,
    value: event.value,
    at: event.at,
  };
}

export class StreamHub {
  private readonly connections = new Set<StreamConnection>();
  private readonly byActor = new Map<string, Set<StreamConnection>>();
  private readonly clock: StreamClock;
  private readonly maxConnectionsPerActor: number;

  constructor(private readonly pool: pg.Pool, options: StreamHubOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.maxConnectionsPerActor = options.maxConnectionsPerActor ?? MAX_STREAMS_PER_ACTOR;
  }

  connectionCount(actorId: string): number {
    return this.byActor.get(actorId)?.size ?? 0;
  }

  subscribe(actor: Actor, writer: StreamWriter, endResponse?: () => void): StreamConnection | null {
    const current = this.byActor.get(actor.id);
    if ((current?.size ?? 0) >= this.maxConnectionsPerActor) return null;

    let closed = false;
    let replaying = true;
    let pending: StreamFrame[] = [];
    const sentEventIds = new Set<string>();
    let cancelHeartbeat = () => {};
    const subscriptions = current ?? new Set<StreamConnection>();
    const allConnections = this.connections;
    const actorConnections = this.byActor;
    if (!current) this.byActor.set(actor.id, subscriptions);

    const write = (frame: StreamFrame) => {
      if (closed) return;
      try {
        writer(encode(frame));
        if (frame.event === 'device_event' && frame.id) sentEventIds.add(frame.id);
      } catch {
        connection.close(true);
      }
    };
    const connection: StreamConnection = {
      actor,
      get closed() { return closed; },
      queue(frame) {
        if (closed) return;
        if (replaying) pending.push(frame);
        else write(frame);
      },
      replay(frame) {
        if (!closed) write(frame);
      },
      finishReplay() {
        if (closed || !replaying) return;
        replaying = false;
        const queued = pending;
        pending = [];
        for (const frame of queued) {
          if (frame.event === 'device_event' && frame.id && sentEventIds.has(frame.id)) continue;
          write(frame);
        }
      },
      close(end = false) {
        if (closed) return;
        closed = true;
        cancelHeartbeat();
        allConnections.delete(connection);
        subscriptions.delete(connection);
        if (subscriptions.size === 0) actorConnections.delete(actor.id);
        pending = [];
        if (end) {
          try { endResponse?.(); } catch { /* Klien mungkin sudah memutus koneksi. */ }
        }
      },
    };

    subscriptions.add(connection);
    this.connections.add(connection);
    cancelHeartbeat = this.clock.every(() => {
      if (closed) return;
      try { writer(': heartbeat\n\n'); } catch { connection.close(true); }
    }, HEARTBEAT_INTERVAL_MS);
    return connection;
  }

  async replay(connection: StreamConnection, lastEventId: string | null): Promise<void> {
    try {
      let afterId = lastEventId;
      if (afterId !== null) {
        while (!connection.closed) {
          const page = await queryVisibleEvents(this.pool, connection.actor, { afterId, limit: 100, order: 'ASC' });
          if (connection.closed) return;
          for (const event of page) {
            connection.replay({ event: 'device_event', id: event.id, data: deviceEventData(event) });
            afterId = event.id;
          }
          if (page.length < 100) break;
        }
      }
      connection.finishReplay();
    } catch (error) {
      connection.close(true);
      throw error;
    }
  }

  async publishReading(deviceId: string, data: { measuredAt: string; readings: Record<string, number> }): Promise<void> {
    const frame: StreamFrame = { event: 'reading', data: { deviceId, ...data } };
    await Promise.all([...this.connections].map(async connection => {
      if (connection.closed) return;
      try {
        if (await actorCanSeeDevice(this.pool, connection.actor, deviceId)) connection.queue(frame);
      } catch {
        connection.close(true);
      }
    }));
  }

  async publishDeviceEvents(events: DeviceEvent[]): Promise<void> {
    for (const event of events) {
      await Promise.all([...this.connections].map(async connection => {
        if (connection.closed) return;
        try {
          if (await eventVisibleToActor(this.pool, connection.actor, event.id)) {
            connection.queue({ event: 'device_event', id: event.id, data: deviceEventData(event) });
          }
        } catch {
          connection.close(true);
        }
      }));
    }
  }

  closeAll(): void {
    for (const connection of [...this.connections]) connection.close(true);
  }
}

function readLastEventId(value: string | string[] | undefined): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(value)) {
    failV1(400, 'VALIDATION_FAILED', 'Header Last-Event-ID tidak valid.');
  }
  if (BigInt(value) > 9_223_372_036_854_775_807n) failV1(400, 'VALIDATION_FAILED', 'Header Last-Event-ID tidak valid.');
  return value;
}

const streamSchema = {
  querystring: v1Object({}, []),
  headers: {
    type: 'object',
    properties: {
      accept: { type: 'string' },
      'last-event-id': { type: 'string', maxLength: 19, pattern: '^(0|[1-9][0-9]{0,18})$' },
    },
    required: ['accept'],
    additionalProperties: true,
  },
};

export function registerStreamRoute(app: FastifyInstance, hub: StreamHub) {
  app.get('/api/v1/stream', {
    schema: { ...streamSchema, tags: ['Monitoring'], summary: 'Membuka stream live data IoT' },
    config: { scope: 'readings:read' },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const accept = request.headers.accept ?? '';
    if (!accept.split(',').some(value => value.trim().toLowerCase().startsWith('text/event-stream'))) {
      failV1(400, 'VALIDATION_FAILED', 'Header Accept harus memuat text/event-stream.');
    }
    const actor = requireActor(request);
    const replayFrom = readLastEventId(request.headers['last-event-id']);
    const raw = reply.raw;
    const connection = hub.subscribe(
      actor,
      frame => {
        if (raw.destroyed) throw new Error('Sambungan SSE sudah ditutup.');
        raw.write(frame);
      },
      () => { if (!raw.destroyed) raw.end(); },
    );
    if (!connection) failV1(429, 'RATE_LIMITED', 'Batas koneksi stream per actor tercapai.');

    reply.hijack();
    raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    raw.flushHeaders();
    const cleanup = () => {
      connection.close();
      request.raw.off('aborted', cleanup);
      raw.off('close', cleanup);
      raw.off('error', cleanup);
    };
    request.raw.once('aborted', cleanup);
    raw.once('close', cleanup);
    raw.once('error', cleanup);
    void hub.replay(connection, replayFrom).catch(() => {
      request.log.error({ requestId: request.id }, 'Replay stream gagal.');
      connection.close(true);
    });
    return reply;
  });
}
