import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { cariPerangkat } from '../../services/iotInfo';
import PanelInfoAlat, { LABEL_BENTUK } from '../../components/PanelInfoAlat';
import QrScanner from '../../components/QrScanner';
import { Badge, Button, Card, Empty, Field, Input, SectionTitle, Table, STATUS_LABEL, STATUS_TONE } from '../../components/ui';

// Halaman Detail Information versi PENGELOLA.
//
// Isi penjelasan alatnya SAMA PERSIS dengan yang dilihat pengguna, karena
// keduanya memakai komponen `PanelInfoAlat`. Bedanya di dua hal yang memang
// khusus pengelola:
//   1. Cara memilih alat — pengelola tidak memindai QR (semua alat ada di
//      tangannya), jadi penelusurannya lewat daftar + pencarian.
//   2. Tautan aksi cepat ke halaman penyuntingan yang terkait.

export default function AdminDetailInformation() {
  const { devices, categoryOf, areaOf } = useSmart();
  const [teksQr, setTeksQr] = useState('');
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

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <SectionTitle
          eyebrow="Detail Information"
          title="Penjelasan alat yang diterima pengguna"
          subtitle="Halaman ini menampilkan penjelasan alat yang SAMA dengan yang dilihat pengguna saat mereka memindai QR. Pakai untuk memastikan penjelasan, ambang, dan catatan perawatan yang dibaca pengguna memang benar."
        />
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <Button
            icon={pindai ? 'close' : 'qr_code_scanner'}
            className="w-full justify-center"
            onClick={() => {
              setPindai((v) => !v);
              // Kamera hidup di kartu pilih-alat; tanpa menggulir, pengelola
              // menekan tombol lalu tidak melihat apa pun berubah.
              requestAnimationFrame(() => {
                document.getElementById('pilih-alat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }}
          >
            {pindai ? 'Tutup kamera' : 'Pindai QR alat'}
          </Button>
          <Button
            variant="ghost"
            icon="devices"
            className="w-full justify-center"
            onClick={() => document.getElementById('pilih-alat')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            Pilih dari daftar
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-on-surface-variant">
          Memindai label yang sudah ditempel di lapangan memastikan label itu benar-benar terbaca pengguna, bukan
          hanya isi QR yang Anda lihat di layar.
        </p>
      </Card>

      <div id="pilih-alat" className="scroll-mt-24">
        <Card>
          <SectionTitle
            eyebrow="Pilih Perangkat"
            title={pindai ? 'Arahkan kamera ke kode QR' : 'Tempel isi QR atau pilih dari daftar'}
            subtitle={
              pindai
                ? 'Memindai label fisik yang sudah ditempel memastikan label itu benar-benar terbaca. Kamera ada di perangkat yang Anda pakai; daftar alat di bawah tetap tersedia.'
                : 'Tempel kode hasil pemindaian pengguna, atau pilih alat langsung. Isi QR yang diterima sama dengan yang dibaca halaman pengguna.'
            }
          />

          {/* Kamera jadi blok di ATAS kolom kode, bukan kartu terpisah —
              kalau bergantian muncul, seluruh isi halaman melompat naik-turun. */}
          {pindai && (
            <div className="mb-6">
              <QrScanner onHasil={proses} onBatal={() => setPindai(false)} />
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              proses(teksQr);
            }}
            className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-start"
          >
            <Field label="Isi QR atau kode alat" hint="cth. AQ-PH-001, JAGOFARM|AQ-PH-001|IOT-001, atau tautan /iot/IOT-001">
              <Input value={teksQr} onChange={setTeksQr} placeholder="AQ-PH-001" />
            </Field>
            <Button type="submit" icon="search" className="w-full lg:w-auto">
              Tampilkan penjelasan
            </Button>
          </form>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr,220px]">
            <Field label="Cari alat">
              <Input value={cari} onChange={setCari} placeholder="nama, kode, atau model" />
            </Field>
            <Field label="Kategori">
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full min-w-0 rounded-xl glass-input px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="semua">Semua kategori</option>
                {kategoriAda.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {galat && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/25 border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-100"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              {galat}
            </p>
          )}

          <div className="mt-4">
            <Table head={['Alat', 'Kode', 'Kategori', 'Area', 'Status', '']}>
              {daftar.map((d) => (
                <tr key={d.id} className={d.id === device?.id ? 'bg-primary/5' : ''}>
                  <td className="px-3 py-2 font-semibold text-on-surface">{d.name}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-on-surface-variant">{d.code}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{categoryOf(d.categoryId)?.name || '·'}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{areaOf(d.areaId)?.name || 'belum ditempatkan'}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="soft"
                      icon="visibility"
                      onClick={() => {
                        setPilih(d.id);
                        setHasil(null);
                        setGalat('');
                      }}
                    >
                      Lihat penjelasan
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            {!daftar.length && (
              <Empty
                title="Tidak ada alat yang cocok"
                hint="Ubah kata pencarian atau pilih kategori lain."
                icon="devices"
              />
            )}
          </div>
        </Card>
      </div>

      {device ? (
        <PanelInfoAlat
          device={device}
          cari={hasil}
          kategori={kategori}
          area={area}
          aksi={
            <div className="flex flex-col gap-2">
              <Badge tone="info" icon="edit">
                Sunting di Kelola IoT
              </Badge>
              <Badge tone="muted">Isi QR: {LABEL_BENTUK[hasil?.bentuk] || 'dipilih dari daftar'}</Badge>
            </div>
          }
        />
      ) : (
        <Card>
          <Empty
            title="Belum ada alat yang dipilih"
            hint="Pilih alat dari daftar di atas untuk melihat penjelasan yang diterima pengguna."
            icon="qr_code_2"
          />
        </Card>
      )}
    </div>
  );
}
