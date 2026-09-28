import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { IconButton, Button, Card, Empty, Field, Input, Modal, NumberInput, SectionTitle, StatCard, Table } from '../../components/ui';

const empty = { name: '', icon: 'sensors', color: '#0f5238', description: '', metrics: [{ key: 'ph', label: 'pH Air', unit: 'pH', min: 6.2, max: 7.6 }] };
const ICONS = ['water_ec', 'device_thermostat', 'settings_input_component', 'bolt', 'sensors', 'science', 'opacity', 'air', 'thermostat', 'speed'];

export default function AdminCategories() {
  const { categories, devices, saveCategory, removeCategory } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Pintu modal "tambah" tidak bisa memakai `form !== empty`: saat menambah, form
// di-set ke objek `empty` itu sendiri, sehingga perbandingannya SELALU false dan
// modal tidak pernah terbuka. Dipakai state khusus supaya tidak ada ketergantungan
// pada identitas objek.
  const [terbuka, setTerbuka] = useState(false);
  const open = terbuka;
  const closeModal = () => { setEditing(null); setForm(empty); setTerbuka(false); };

  const startEdit = (category) => {
    setEditing(category);
    setForm({ ...empty, ...category, metrics: category.metrics.map((m) => ({ ...m })) });
    setTerbuka(true);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name) return;
    saveCategory({ ...form, metrics: form.metrics.filter((m) => m.key && m.label) });
    closeModal();
  };

  const updateMetric = (index, patch) => {
    setForm((prev) => ({ ...prev, metrics: prev.metrics.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Kategori Device" value={categories.length} icon="category" hint="Jenis alat terdaftar" />
        <StatCard label="Total Parameter" value={categories.reduce((n, c) => n + c.metrics.length, 0)} icon="tune" hint="Metrik yang diukur" />
        <StatCard label="Perangkat Terklasifikasi" value={devices.length} icon="devices" hint="Tersebar di seluruh kategori" />
        <StatCard label="Kategori Kosong" value={categories.filter((c) => !devices.some((d) => d.categoryId === c.id)).length} icon="block" tone="warn" hint="Belum punya perangkat" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kategori Device"
          title="Jenis perangkat & parameter ukurnya"
          subtitle="Kategori menentukan ikon alat, ambang ideal, dan daftar parameter yang bisa dipilih saat menambah perangkat."
          action={<Button icon="add" onClick={() => { setEditing(null); setForm(empty); setTerbuka(true); }}>Tambah kategori</Button>}
        />
        {categories.length === 0 ? (
          <Empty title="Belum ada kategori" icon="category" hint="Tambahkan kategori pertama, misalnya sensor kualitas air." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => {
              const count = devices.filter((d) => d.categoryId === category.id).length;
              return (
                <div key={category.id} className="rounded-2xl border border-outline-variant/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: category.color }}>
                        <span className="material-symbols-outlined text-[22px]">{category.icon}</span>
                      </span>
                      <div>
                        <p className="font-bold text-on-surface">{category.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{category.id} · {count} perangkat</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconButton icon="edit" size="sm" onClick={() => startEdit(category)} title="Ubah kategori" />
                <IconButton icon="delete" tone="bad" size="sm" onClick={() => setConfirm(category)} title="Hapus kategori" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-on-surface-variant">{category.description}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Parameter</p>
                  <div className="mt-2">
                    <Table head={['Parameter', 'Satuan', 'Ambang ideal']}>
                      {category.metrics.map((metric) => (
                        <tr key={metric.key}>
                          <td className="px-3 py-1.5 font-semibold text-on-surface">{metric.label}</td>
                          <td className="px-3 py-1.5 text-on-surface-variant">{metric.unit}</td>
                          <td className="px-3 py-1.5 text-on-surface-variant">
                            {metric.min} – {metric.max} {metric.unit}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah kategori — ${editing.name}` : 'Tambah kategori device'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama kategori">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Sensor Kualitas Air" required />
            </Field>
            <Field label="Ikon (Material Symbols)">
              <div className="flex items-center gap-2">
                <Input value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="water_ec" />
                <span className="material-symbols-outlined text-[24px] text-primary">{form.icon}</span>
              </div>
            </Field>
            <Field label="Warna penanda">
              <div className="flex items-center gap-2">
                <Input type="color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
                <span className="text-xs text-on-surface-variant">{form.color}</span>
              </div>
            </Field>
            <Field label="Deskripsi singkat">
              <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Perangkat pengukur parameter kimia air." />
            </Field>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm({ ...form, icon })}
                className={`inline-flex items-center gap-1 h-7 rounded-full border px-2.5 text-[11px] font-semibold transition-colors ${
                  form.icon === icon ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{icon}</span>
                {icon}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Parameter yang diukur</p>
              <Button
                variant="soft"
                icon="add"
                onClick={() => setForm((prev) => ({ ...prev, metrics: [...prev.metrics, { key: '', label: '', unit: '', min: 0, max: 0 }] }))}
              >
                Tambah parameter
              </Button>
            </div>
            <div className="space-y-2">
              {form.metrics.map((metric, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr,1.2fr,0.8fr,0.8fr,0.8fr,auto] items-start rounded-xl border border-outline-variant/40 p-2">
                  <Field label="Key">
                    <Input value={metric.key} onChange={(v) => updateMetric(index, { key: v })} placeholder="ph" />
                  </Field>
                  <Field label="Label">
                    <Input value={metric.label} onChange={(v) => updateMetric(index, { label: v })} placeholder="pH Air" />
                  </Field>
                  <Field label="Satuan">
                    <Input value={metric.unit} onChange={(v) => updateMetric(index, { unit: v })} placeholder="pH" />
                  </Field>
                  <Field label="Min">
                    <NumberInput step="any" value={metric.min} onChange={(v) => updateMetric(index, { min: v })} />
                  </Field>
                  <Field label="Max">
                    <NumberInput step="any" value={metric.max} onChange={(v) => updateMetric(index, { max: v })} />
                  </Field>
                  <IconButton
                    icon="delete"
                    tone="bad"
                    size="sm"
                    className="mb-0.5"
                    onClick={() => setForm((prev) => ({ ...prev, metrics: prev.metrics.filter((_, i) => i !== index) }))}
                    title="Hapus parameter"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" icon="save">{editing ? 'Simpan perubahan' : 'Tambah kategori'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus kategori device">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Kategori <strong className="text-on-surface">{confirm.name}</strong> akan dihapus.
              {devices.some((d) => d.categoryId === confirm.id) && (
                <>
                  {' '}
                  <strong className="text-red-600">
                    {devices.filter((d) => d.categoryId === confirm.id).length} perangkat
                  </strong>{' '}
                  yang memakai kategori ini juga akan terhapus.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="danger" icon="delete" onClick={() => { removeCategory(confirm.id); setConfirm(null); }}>
                Hapus kategori
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
