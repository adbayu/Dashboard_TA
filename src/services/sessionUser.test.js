import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapSessionUser } from './sessionUser.js';

test('sesi backend memakai ID dan peran backend sambil mempertahankan metadata profil berdasarkan email', () => {
  const mapped = mapSessionUser(
    { id: 'backend-user-id', email: 'operator@example.test', role: 'admin' },
    [{ id: 'local-id', email: 'OPERATOR@example.test', name: 'Operator Lapangan', role: 'pengguna', phone: '0812', bio: 'Profil lama', password: 'jangan-simpan' }],
  );

  assert.deepEqual(mapped, {
    id: 'backend-user-id',
    email: 'operator@example.test',
    name: 'Operator Lapangan',
    role: 'pengelola',
    status: 'aktif',
    phone: '0812',
    bio: 'Profil lama',
  });
});

test('sesi backend tanpa profil lama memakai email sebagai nama', () => {
  assert.deepEqual(mapSessionUser({ id: 'user-id', email: 'baru@example.test', role: 'user' }, []), {
    id: 'user-id',
    email: 'baru@example.test',
    name: 'baru@example.test',
    role: 'pengguna',
    status: 'aktif',
  });
});

test('role partner tetap menjadi role mitra di SmartDashboard', () => {
  assert.deepEqual(mapSessionUser({ id: 'partner-id', email: 'mitra@example.test', role: 'partner' }), {
    id: 'partner-id',
    email: 'mitra@example.test',
    name: 'mitra@example.test',
    role: 'mitra',
    status: 'aktif',
  });
});
