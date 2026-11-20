import { useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { Button, Card, EmptyState, Field, FilterChip, IconButton, Input, Modal, NumberInput, PageHeader, Table, Tautan } from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { formatAngka } from '../../kelola-area/model/areaTampil.js';
import { LABEL_NADA_KATEGORI, NADA_KATEGORI, nadaKategori } from '../model/nadaKategori.js';

const empty = { name: '', icon: 'radio', area: 'water', description: '', metrics: [{ key: 'ph', label: 'pH Air', unit: 'pH', min: 6.2, max: 7.6 }] };
// Nama ikon lucide yang bisa dipilih cepat; kolom nama ikon tetap menerima nama lain.
const IKON_KATEGORI = ['radio', 'flask-conical', 'thermometer', 'droplet', 'droplets', 'gauge', 'zap', 'wind', 'waves', 'cpu'];

const KOLOM_PARAMETER = [
  { key: 'label', label: 'Parameter', render: (m) => <span className="font-semibold">{m.label}</span> },
  { key: 'key', label: 'Kunci', render: (m) => <span className="font-num text-sm">{m.key}</span> },
  { key: 'unit', label: 'Satuan' },
  {
    key: 'ambang',
    label: 'Ambang ideal',
    render: (m) => <span className="whitespace-nowrap font-num">{formatAngka(m.min)}–{formatAngka(m.max)} {m.unit}</span>,
  },
];

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
  const bukaTambah = () => { setEditing(null); setForm(empty); setTerbuka(true); };

  const startEdit = (category) => {
    setEditing(category);
    setForm({ ...empty, ...category, area: nadaKategori(category), metrics: category.metrics.map((m) => ({ ...m })) });
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
    <div>
      <PageHeader
        title="Kategori alat"
        subtitle="Kategori menentukan ikon alat, ambang ideal, dan parameter yang bisa dipilih saat menambah perangkat."
        actions={<Button icon="plus" onClick={bukaTambah}>Tambah kategori</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {categories.length === 0 ? (
            <EmptyState title="Belum ada kategori" icon="inbox">Tambahkan kategori pertama, misalnya sensor kualitas air.</EmptyState>
          ) : (
            categories.map((category) => {
              const alat = devices.filter((d) => d.categoryId === category.id);
              return (
                <Card
                  key={category.id}
                  area={nadaKategori(category)}
                  title={(
                    <span className="inline-flex items-center gap-2">
                      <span data-ui="area-icon" className="inline-flex"><IkonSlot icon={category.icon} size={18} /></span>
                      {category.name}
                    </span>
                  )}
                  subtitle={`${category.id} · ${alat.length} perangkat`}
                  action={(
                    <div className="flex gap-1">
                      <IconButton icon="pencil" size="sm" onClick={() => startEdit(category)} label={`Ubah kategori ${category.name}`} />
                      <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => setConfirm(category)} label={`Hapus kategori ${category.name}`} />
                    </div>
                  )}
                >
                  <div className="flex flex-col gap-4">
                    {category.description && <p className="text-text-2">{category.description}</p>}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-head text-[15px] font-bold leading-[22px] text-text">Parameter yang diukur</h3>
                      <Table columns={KOLOM_PARAMETER} rows={category.metrics.map((m) => ({ ...m, id: m.key }))} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-head text-[15px] font-bold leading-[22px] text-text">Perangkat dalam kategori ini</h3>
                      {alat.length === 0 ? (
                        <p className="text-sm text-text-2">Belum ada perangkat.</p>
                      ) : (
                        <p className="flex flex-wrap gap-x-3 gap-y-1 font-num text-sm">
                          {alat.map((d) => <span key={d.id}>{d.code}</span>)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <section aria-labelledby="cara-kategori-judul" className="flex min-w-0 flex-col gap-2">
          <h2 id="cara-kategori-judul" className="font-head text-base font-bold leading-[22px] text-text">Cara kategori dipakai</h2>
          <p className="text-sm text-text-2">
            Ambang ideal kategori berlaku untuk semua area. Area yang punya ambang sendiri memakai ambang itu, dan area lain kembali ke ambang kategori.
          </p>
          <p className="text-sm text-text-2">Menghapus kategori ikut menghapus perangkat yang memakainya, jadi penghapusan selalu meminta konfirmasi.</p>
          <span><Tautan to="/admin/area">Atur ambang per area</Tautan></span>
        </section>
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah kategori: ${editing.name}` : 'Tambah kategori alat'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama kategori">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Sensor Kualitas Air" required />
            </Field>
            <Field label="Nama ikon" hint="Pilih di bawah atau ketik nama ikon lucide.">
              <div className="flex items-center gap-2">
                <Input value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="flask-conical" />
                <span className="inline-flex shrink-0 text-primary"><IkonSlot icon={form.icon} size={22} /></span>
              </div>
            </Field>
            <Field label="Deskripsi singkat" className="sm:col-span-2">
              <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Perangkat pengukur parameter kimia air." />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-text">Ikon</p>
            <div role="group" aria-label="Pilihan ikon" className="flex flex-wrap gap-2">
              {IKON_KATEGORI.map((icon) => (
                <FilterChip key={icon} icon={icon} active={form.icon === icon} onClick={() => setForm({ ...form, icon })}>
                  {icon}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-text">Warna penanda</p>
            <div role="group" aria-label="Warna penanda" className="flex flex-wrap gap-2">
              {NADA_KATEGORI.map((nada) => (
                <FilterChip key={nada} active={form.area === nada} onClick={() => setForm({ ...form, area: nada })}>
                  {LABEL_NADA_KATEGORI[nada]}
                </FilterChip>
              ))}
            </div>
            <p className="mt-1 text-sm text-text-2">Warna kartu mengikuti tema: air, daun, atau netral.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">Parameter yang diukur</p>
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={() => setForm((prev) => ({ ...prev, metrics: [...prev.metrics, { key: '', label: '', unit: '', min: 0, max: 0 }] }))}
              >
                Tambah parameter
              </Button>
            </div>
            <div className="space-y-2">
              {form.metrics.map((metric, index) => (
                <div
                  key={index}
                  className="grid items-end gap-2 rounded-card border border-border p-2 sm:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.8fr_auto]"
                >
                  <Field label="Kunci">
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
                    icon="trash-2"
                    variant="danger"
                    onClick={() => setForm((prev) => ({ ...prev, metrics: prev.metrics.filter((_, i) => i !== index) }))}
                    label={`Hapus parameter ${metric.label || index + 1}`}
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

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus kategori alat">
        {confirm && (
          <div className="space-y-4">
            <p className="text-text-2">
              Kategori <strong className="text-text">{confirm.name}</strong> akan dihapus.
              {devices.some((d) => d.categoryId === confirm.id) && (
                <>
                  {' '}
                  <strong className="text-bad-fg">
                    {devices.filter((d) => d.categoryId === confirm.id).length} perangkat
                  </strong>{' '}
                  yang memakai kategori ini juga akan terhapus.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="danger" icon="trash-2" onClick={() => { removeCategory(confirm.id); setConfirm(null); }}>
                Hapus kategori
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
