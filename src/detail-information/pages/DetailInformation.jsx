import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ambilKodeAlat, useSmart } from '../../shared/store/SmartStore';
import { cariPerangkat } from '../services/iotInfo';
import QrCode from '../../shared/qr/components/QrCode';
import QrScanner from '../components/QrScanner';
import PanelInfoAlat from '../../shared/iot/components/PanelInfoAlat';
import { Button, Card, Empty, SectionTitle } from '../../shared/components/ui';

// Halaman Detail Information (menu sidebar pengguna).
//
// Alur: pengguna memindai QR yang tertempel di alat → isi QR dicocokkan ke data
// perangkat → aplikasi menjelaskan ALAT APA ITU: nama, jenis, fungsi, parameter
// yang diukur beserta ambang idealnya, cara membaca nilainya, perawatan, dan
// letaknya.
//
// Isi penjelasannya sendiri TIDAK ditulis di sini, melainkan di komponen
// `PanelInfoAlat` — komponen yang sama dipakai halaman pengelola
// (/admin/detail-informasi), supaya penjelasan kedua role tidak pernah berbeda.

export default function DetailInformation() {
  const { devices, categoryOf, areaOf, role, currentUser } = useSmart();
  const [hasil, setHasil] = useState(null);
  const [pindai, setPindai] = useState(false);
  const [galat, setGalat] = useState('');

  // Perangkat yang boleh dibaca: pengelola semuanya, pengguna hanya area yang
  // diampu — sama dengan aturan di List IoT.
  const terlihat = (d) => role === 'pengelola' || (d.areaId && (currentUser?.areaIds || []).includes(d.areaId));

  function proses(nilai) {
    const mentah = (nilai || '').trim();
    setPindai(false);
    if (!mentah) {
      setGalat('Isi QR kosong. Coba pindai ulang atau ketik kode alatnya.');
      setHasil(null);
      return;
    }
    const { device, cara, bentuk } = cariPerangkat(devices, mentah);
    if (!device) {
      setGalat(
        `Kode "${mentah}" tidak cocok dengan perangkat mana pun. Periksa kembali labelnya, ` +
          'atau minta pengelola memastikan alat ini sudah terdaftar di Kelola IoT.',
      );
      setHasil(null);
      return;
    }
    setGalat('');
    setHasil({ device, cara, bentuk, mentah });
  }

  const device = hasil?.device;
  const kategori = device ? categoryOf(device.categoryId) : null;
  const area = device ? areaOf(device.areaId) : null;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <SectionTitle
          eyebrow="Detail Information"
          title="Pindai QR alat untuk tahu alatnya"
          subtitle="Setiap perangkat IoT punya kode QR. Setelah dipindai, halaman ini menjelaskan alat apa itu, apa fungsinya, parameter apa yang diukur beserta ambang idealnya, dan bagaimana memperlakukannya."
        />
        {/* Dua kolom sama lebar (bukan flex-wrap): pada lebar efektif layar user
            (~841px CSS) dua tombol ini berjumlah 484px sedangkan ruangnya 480px,
            sehingga tombol kedua terjatuh sendirian dan tampak melenceng. */}
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <Button
            icon="qr_code_scanner"
            className="w-full justify-center"
            onClick={() => {
              setPindai((v) => !v);
              // Turunkan pandangan ke kartu pencarian — tanpa ini pengguna
              // menekan tombol lalu tidak melihat apa pun berubah.
              requestAnimationFrame(() => {
                document.getElementById('cari-perangkat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }}
          >
            {pindai ? 'Tutup kamera' : 'Pindai QR alat'}
          </Button>
          <Link to="/iot" className="inline-flex">
            <Button variant="ghost" icon="sensors" className="w-full justify-center">
              Lihat daftar perangkat
            </Button>
          </Link>
        </div>
      </Card>

      <div id="cari-perangkat" className="scroll-mt-24">
      <Card>
        <SectionTitle
          eyebrow="Cari Perangkat"
          title={pindai ? 'Arahkan kamera ke kode QR' : 'Pindai kode QR perangkat'}
          subtitle={
            pindai
              ? 'Pindai lewat kamera atau gunakan kolom kode pada pemindai bila kamera tidak memungkinkan.'
              : 'Tekan Pindai QR alat untuk membuka kamera atau memasukkan kode alat secara manual.'
          }
        />

        {/* Pemindai menyediakan kamera dan satu kolom kode manual. */}
        {pindai && (
          <div className="mb-6">
            <QrScanner onHasil={proses} onBatal={() => setPindai(false)} />
          </div>
        )}

        {/* Contoh QR asli supaya fitur ini bisa dicoba walau tanpa label fisik. */}
        <div className="mt-5 rounded-2xl panel-inset p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Coba tanpa kamera
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <QrCode value={ambilKodeAlat(devices[0])} size={128} caption={devices[0]?.code} />
            </div>
            <div className="min-w-0 flex-1 text-[12px] text-on-surface-variant">
              <p className="font-bold text-on-surface">{devices[0]?.name || 'Belum ada perangkat'}</p>
              <p className="mt-1">
                Tekan Pindai QR alat lalu masukkan kode di atas pada kolom pemindai, atau tampilkan QR ini
                di layar lain dan pindai dengan kamera.
              </p>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {galat && (
        <Card>
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/25 border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {galat}
          </p>
        </Card>
      )}

      {hasil && device && !terlihat(device) && (
        <Card>
          <Empty
            title="Perangkat ini bukan di area Anda"
            icon="lock"
            hint="Alat ini memang terdaftar, tetapi berada di area yang bukan tanggung jawab Anda. Hubungi pengelola bila perlu akses."
          />
        </Card>
      )}

      {hasil && device && terlihat(device) && (
        <PanelInfoAlat device={device} cari={hasil} kategori={kategori} area={area} />
      )}

      {!hasil && !galat && !pindai && (
        <Card>
          <Empty
            title="Belum ada alat yang dipindai"
            hint="Pindai kode QR yang tertempel di perangkat, atau ketik kode alatnya untuk melihat penjelasan lengkap."
            icon="qr_code_scanner"
          />
        </Card>
      )}
    </div>
  );
}
