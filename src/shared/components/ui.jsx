// Pintu masuk komponen bersama. Isinya ada di ./ui/*.jsx; berkas ini hanya
// mengekspor ulang supaya semua `import { ... } from '.../ui.jsx'` lama tetap
// jalan. Nama lama (Badge, Empty, StatCard, Bar) dipertahankan sebagai alias.

// ── Sistem ukuran (satu skala untuk SELURUH aplikasi) ─────────────────────────
// Semua kontrol memakai tinggi eksplisit dari skala berikut, jadi baris tombol
// dan input tidak bisa lagi melenceng antar halaman.
//
//   sm = 32px   (chip, tombol di dalam tabel, aksi sekunder)
//   md = 40px   (bawaan: tombol, input, select)
//   lg = 44px   (aksi utama yang menonjol)
//
// Radius mengikuti tema: rounded-card (kartu), rounded-control (kontrol),
// rounded-pill (keping). Komponen di ./ui membaca UKURAN hanya saat render,
// jadi impor baliknya dari berkas ini aman walau melingkar.
// oxlint-disable-next-line react/only-export-components -- Shared size tokens stay beside their existing consumers.
export const UKURAN = {
  sm: { kontrol: 'h-8 px-3 text-sm', tinggi: 'h-8', ikon: 'h-8 w-8', ikonPx: 16 },
  md: { kontrol: 'h-10 px-4 text-[15px]', tinggi: 'h-10', ikon: 'h-10 w-10', ikonPx: 18 },
  lg: { kontrol: 'h-11 px-5 text-[15px]', tinggi: 'h-11', ikon: 'h-11 w-11', ikonPx: 20 },
};

export { STATUS_LABEL, STATUS_TONE } from './ui/tones.js';
export { Alert } from './ui/Alert.jsx';
export { Avatar, AvatarPilih } from './ui/Avatar.jsx';
export { Bar } from './ui/Bar.jsx';
export { Button, IconButton } from './ui/Button.jsx';
export { Card, SectionTitle } from './ui/Card.jsx';
export { EmptyState, EmptyState as Empty } from './ui/EmptyState.jsx';
export { Checkbox, Field, Input, NumberInput, Select, Switch, TextArea } from './ui/Field.jsx';
export { FilterChip } from './ui/FilterChip.jsx';
export { Metric, Metric as StatCard } from './ui/Metric.jsx';
export { KonfirmasiHapus } from './ui/KonfirmasiHapus.jsx';
export { Modal } from './ui/Modal.jsx';
export { PageHeader } from './ui/PageHeader.jsx';
export { StatusPill, StatusPill as Badge } from './ui/StatusPill.jsx';
export { AksiBaris, Table } from './ui/Table.jsx';
export { Tautan, TautanTombol } from './ui/Tautan.jsx';
export { Tabs } from './ui/Tabs.jsx';
