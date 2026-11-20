import { useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { cariPerangkat } from '../services/iotInfo';
import PanelInfoAlat, { LABEL_BENTUK } from '../../shared/iot/components/PanelInfoAlat';
import QrScanner from '../components/QrScanner';
import {
  Alert, Button, EmptyState, FilterChip, Input, PageHeader, STATUS_LABEL, STATUS_TONE, StatusPill, Table, Tautan,
} from '../../shared/components/ui';

// Halaman Detail Information versi PENGELOLA.
//
// Isi penjelasan alatnya SAMA PERSIS dengan yang dilihat pengguna, karena
// keduanya memakai komponen `PanelInfoAlat`. Bedanya di dua hal yang memang
// khusus pengelola:
//   1. Cara memilih alat — pengelola tidak memindai QR (semua alat ada di
//      tangannya), jadi penelusurannya lewat daftar + pencarian.
//   2. Tautan aksi cepat ke halaman penyuntingan yang terkait.
// Halaman ini tetap pratinjau baca-saja; penyuntingan ada di Kelola IoT.

const STATUS_IKON = { online: 'wifi', warning: 'triangle-alert', maintenance: 'wrench', offline: 'wifi-off' };
const JUDUL = 'font-head text-base font-bold leading-[22px] text-text';

const gulirKeDaftar = () => document.getElementById('pilih-alat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

export default function AdminDetailInformation() {
  const { devices, categoryOf, areaOf } = useSmart();
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState(null);

  const [cari, setCari] = useState('');
  const [pilih, setPilih] = useState(null);
  const [filterKategori, setFilterKategori] = useState('semua');
  const [pindai, setPindai] = useState(false);

  function proses(nilai) {
    const mentah = (nilai || '').trim();
    if (!mentah) {
      setGalat('Isi QR kosong. Tempel kodenya atau pilih alat dari daftar di bawah.');
      setHasil(null);
      return;
    }
    const { device, cara, bentuk } = cariPerangkat(devices, mentah);
    if (!device) {
      setGalat(`Kode "${mentah}" tidak cocok dengan perangkat mana pun. Periksa kembali labelnya.`);
      setHasil(null);
      return;
    }
    setGalat('');
    setHasil({ device, cara, bentuk, mentah });
    setPilih(device.id);
  }

  // Alat yang penjelasannya sedang ditampilkan.
  const device = hasil?.device || devices.find((d) => d.id === pilih) || null;
  const kategori = device ? categoryOf(device.categoryId) : null;
  const area = device ? areaOf(device.areaId) : null;

  const daftar = devices.filter((d) => {
    const kunci = cari.trim().toLowerCase();
    const cocokCari =
      !kunci ||
      [d.name, d.code, d.id, d.model].some((s) => (s || '').toLowerCase().includes(kunci));
    const cocokKategori = filterKategori === 'semua' || d.categoryId === filterKategori;
    return cocokCari && cocokKategori;
  });

  const kategoriAda = [...new Set(devices.map((d) => d.categoryId))]
    .map((id) => categoryOf(id))
    .filter(Boolean);

  const kolom = [
    {
      key: 'name',
      label: 'Alat',
      render: (d) => (
        <span className="font-semibold">
          {d.name}
          {d.id === device?.id && <span className="font-normal text-text-2"> (sedang dilihat)</span>}
        </span>
      ),
    },
    { key: 'code', label: 'Kode', render: (d) => <span className="font-num text-sm">{d.code}</span> },
    { key: 'kategori', label: 'Kategori', render: (d) => categoryOf(d.categoryId)?.name || '·' },
    { key: 'area', label: 'Area', render: (d) => areaOf(d.areaId)?.name || <span className="text-text-2">Belum ditempatkan</span> },
    {
      key: 'status',
      label: 'Status',
      render: (d) => <StatusPill tone={STATUS_TONE[d.status]} icon={STATUS_IKON[d.status] || 'circle-minus'}>{STATUS_LABEL[d.status] || d.status}</StatusPill>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: (d) => (
        <Button
          variant="secondary"
          size="sm"
          icon="eye"
          aria-label={`Lihat penjelasan ${d.name}`}
          onClick={() => {
            setPilih(d.id);
            setHasil(null);
            setGalat('');
          }}
        >
          Lihat penjelasan
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Detail informasi alat"
        subtitle="Penjelasan alat yang sama dengan yang dibaca pengguna setelah memindai QR. Pakai untuk memastikan penjelasan, ambang, dan catatan perawatan yang dibaca pengguna memang benar."
        actions={(
          <>
            <Button
              icon={pindai ? 'x' : 'scan-qr-code'}
              onClick={() => {
                setPindai((v) => !v);
                // Kamera hidup di bagian pilih-alat; tanpa menggulir, pengelola
                // menekan tombol lalu tidak melihat apa pun berubah.
                requestAnimationFrame(gulirKeDaftar);
              }}
            >
              {pindai ? 'Tutup kamera' : 'Pindai QR alat'}
            </Button>
            <Button variant="secondary" icon="list-checks" onClick={gulirKeDaftar}>Pilih dari daftar</Button>
          </>
        )}
      />

      <div className="flex flex-col gap-6">
        <section id="pilih-alat" aria-labelledby="pilih-alat-judul" className="flex min-w-0 scroll-mt-24 flex-col gap-3">
          <div>
            <h2 id="pilih-alat-judul" className={JUDUL}>{pindai ? 'Arahkan kamera ke kode QR' : 'Pilih alat'}</h2>
            <p className="mt-1 text-sm text-text-2">
              {pindai
                ? 'Memindai label fisik yang sudah ditempel memastikan label itu benar-benar terbaca. Daftar alat di bawah tetap tersedia.'
                : 'Pilih alat langsung dari daftar, atau tekan Pindai QR alat untuk memindai label maupun memasukkan kode secara manual.'}
            </p>
          </div>

          {/* Pemindai menyediakan kamera dan satu kolom kode manual. */}
          {pindai && <QrScanner onHasil={proses} onBatal={() => setPindai(false)} />}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="w-full sm:w-[320px]">
              <Input type="search" value={cari} onChange={setCari} placeholder="Nama, kode, atau model" aria-label="Cari alat" />
            </div>
            <div role="group" aria-label="Filter kategori" className="flex flex-wrap items-center gap-2">
              <FilterChip active={filterKategori === 'semua'} onClick={() => setFilterKategori('semua')}>Semua kategori</FilterChip>
              {kategoriAda.map((k) => (
                <FilterChip key={k.id} active={filterKategori === k.id} onClick={() => setFilterKategori(k.id)}>{k.name}</FilterChip>
              ))}
            </div>
          </div>

          {galat && <Alert tone="bad">{galat}</Alert>}

          {daftar.length ? (
            <Table columns={kolom} rows={daftar} />
          ) : (
            <EmptyState title="Tidak ada alat yang cocok" icon="search-x">Ubah kata pencarian atau pilih kategori lain.</EmptyState>
          )}
          <p className="text-sm text-text-2">
            Memindai label yang sudah ditempel di lapangan memastikan label itu benar-benar terbaca pengguna, bukan hanya isi QR yang Anda lihat di layar.
          </p>
        </section>

        <section aria-labelledby="pratinjau-judul" className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 id="pratinjau-judul" className={JUDUL}>Pratinjau untuk pengguna</h2>
            <p className="mt-1 text-sm text-text-2">Seperti yang tampil setelah memindai QR. Penjelasan disunting di Kelola IoT.</p>
          </div>
          {device ? (
            <PanelInfoAlat
              device={device}
              cari={hasil}
              kategori={kategori}
              area={area}
              aksi={
                <div className="flex flex-col gap-2">
                  <Tautan to="/admin/iot" icon="pencil">Sunting di Kelola IoT</Tautan>
                  <StatusPill tone="muted" icon="qr-code">Isi QR: {LABEL_BENTUK[hasil?.bentuk] || 'dipilih dari daftar'}</StatusPill>
                </div>
              }
            />
          ) : (
            <EmptyState title="Belum ada alat yang dipilih" icon="qr-code">
              Pilih alat dari daftar di atas untuk melihat penjelasan yang diterima pengguna.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
