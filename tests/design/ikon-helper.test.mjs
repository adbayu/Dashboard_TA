import assert from 'node:assert/strict'
import { test } from 'node:test'

import { namaIkonDalamSumber, namaIkonTidakDikenal } from '../helpers/ikon.mjs'

const peta = { plus: 1, 'trash-2': 2, radio: 3, wifi: 4 }

test('pemindai ikon bersama menangkap semua bentuk literal', () => {
  const sumber = `
    <Button icon="plus" />
    const a = { icon: 'trash-2' }
    <Icon name="radio" />
    <Badge icon={ok ? 'wifi' : 'wifi_off'} tone="ok" />
    const IKON_KATEGORI = ['radio', 'sensors']
    <input name="aksi" />
  `
  const nama = namaIkonDalamSumber(sumber)
  for (const wajib of ['plus', 'trash-2', 'radio', 'wifi', 'wifi_off', 'sensors']) assert.ok(nama.includes(wajib), wajib)
  assert.equal(nama.includes('aksi'), false, 'name pada <input> bukan ikon')
})

test('nama ikon yang tak ada di peta (Material lama atau salah ketik) dilaporkan', () => {
  const sumber = '<Button icon="plus" /><Button icon="add" /><Icon name="wifi-of" />'
  assert.deepEqual(namaIkonTidakDikenal(sumber, peta), ['add', 'wifi-of'])
  assert.deepEqual(namaIkonTidakDikenal('<Button icon="plus" />', peta), [])
})
