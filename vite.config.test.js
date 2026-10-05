import assert from 'node:assert/strict';
import { test } from 'node:test';
import { developmentHostOptions } from './vite.config.js';

test('Vite keeps the default host policy when no development allowlist is set', () => {
  assert.deepEqual(developmentHostOptions('serve', ''), {});
  assert.deepEqual(developmentHostOptions('build', 'temporary.trycloudflare.com'), {});
});

test('Vite reads and deduplicates the development host allowlist', () => {
  assert.deepEqual(developmentHostOptions('serve', 'temporary.trycloudflare.com, localhost, temporary.trycloudflare.com'), {
    allowedHosts: ['temporary.trycloudflare.com', 'localhost'],
  });
});
