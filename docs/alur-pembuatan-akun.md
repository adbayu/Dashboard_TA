# Alur Pembuatan Akun — JagoFarm SmartDashboard

Dua jalur pembuatan akun. Keduanya berakhir di halaman masuk dan memakai validasi store
yang sama.

---

## Ringkasan cepat

| Jalur | Siapa yang memulai | Status hasil | Bisa langsung masuk? |
| --- | --- | --- | --- |
| A — Daftar sendiri (`/daftar`) sebagai **Operator Farm** | pengguna baru | `aktif` | Ya, langsung diarahkan ke `/` |
| B — Daftar sendiri (`/daftar`) sebagai **Pengelola Farm** | pengguna baru | `menunggu` | Belum — harus disetujui pengelola |
| C — Dibuat pengelola (`/admin/pengguna`) | pengelola | `aktif` | Ya, pakai password awal yang diisi pengelola |

---

## Jalur A — Pendaftaran Operator Farm (pengguna)

```
 /masuk  ──klik "Daftar di sini"──►  /daftar
                                       │
                                       │ pilih peran: Operator Farm
                                       │ isi nama, email, telepon*, jabatan*,
                                       │ password (min 6), ulangi password, foto*
                                       │  (* opsional)
                                       ▼
                              [klik "Daftar & masuk"]
                                       │
                        store.register({ role: 'pengguna' })
                                       │
                  ┌────────────────────┴────────────────────┐
                  │ validasi gagal                          │ validasi lolos
                  ▼                                         ▼
        pesan galat di formulir              users += akun baru (status: aktif)
        (role="alert"), tetap                sessionUserId  =  akun baru
        di /daftar                                       │
                                                         ▼
                                             langsung masuk beranda  /
                                             (tanpa login ulang)
```

Hasil: akun berstatus `aktif`, sesi langsung terbuka. Halaman pengguna menyaring data
berdasarkan `areaIds` akun. Karena akun baru belum punya area, yang terlihat masih kosong
sampai pengelola menugaskan area di **Kelola User**.

---

## Jalur B — Pengajuan Pengelola Farm

```
 /daftar
    │ pilih peran: Pengelola Farm
    │ (catatan: "Perlu persetujuan pengelola yang sudah ada")
    ▼
 [klik "Ajukan akun pengelola"]
    │
 store.register({ role: 'pengelola' })
    │
    ▼
 users += akun baru (status: MENUNGGU)
 sessionUserId TIDAK diisi  ──►  tetap di /daftar
    │
    ▼
 Layar "Pengajuan akun pengelola terkirim"
   ├─ "Ke halaman masuk"               ──► /masuk
   └─ "Daftar sebagai operator farm"   ──► ulangi Jalur A


 ── kalau pendaftar nekat masuk sebelum disetujui ──

 /masuk  ──email+password pendaftar──►  store.login()
                                            │
                                            ▼
                              ditolak: "Akun pengelola ini masih
                              menunggu persetujuan pengelola yang
                              sudah ada..."
                                            │
 halaman masuk juga menampilkan: "1 pendaftar pengelola menunggu
 persetujuan — belum bisa masuk sampai disetujui di menu Kelola User."


 ── pengelola yang sudah ada menyetujui ──

 login pengelola ──► /admin/pengguna
                        │
                        ▼
              Panel "Perlu Persetujuan" (di atas tabel)
              + kartu "Menunggu Persetujuan"
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
     [Setujui]                     [Tolak]
     status: aktif                 status: nonaktif
          │                           │
          ▼                           ▼
   panel hilang; akun itu        tidak bisa masuk
   sekarang bisa masuk           sampai diaktifkan lagi
   sebagai pengelola ke /admin
```

Tombol **Setujui** juga tersedia langsung di baris tabel akun yang berstatus menunggu, supaya
tidak perlu membuka panel.

---

## Jalur C — Dibuat Pengelola

```
 login pengelola ──► /admin/pengguna ──► [Tambah pengguna]
                                              │
                                              ▼
                    ┌───────────────────────────────────────┐
                    │ Nama lengkap      : wajib             │
                    │ Email             : wajib, unik       │
                    │ Peran             : pengguna/pengelola│
                    │ Status akun       : aktif/menunggu/   │
                    │                     nonaktif          │
                    │ Password awal     : kosong = jagofarm123
                    │ Area yang dikelola: pilih (bisa >1)   │
                    └───────────────────────────────────────┘
                                              │
                                              ▼
                                    [Tambah akun]
                                              │
                                              ▼
                       pengguna baru langsung `aktif`
                       pesan konfirmasi menampilkan password awal:
                       "Akun bayu@jagofarm.id ditambahkan.
                        Password awal: bayu123456"
                                              │
                                              ▼
                       sampaikan password itu ke pemilik akun
                       (atau minta ia menggantinya di /profil)
```

Email duplikat ditolak: "Email ... sudah dipakai akun lain — pakai email berbeda."
Saat mengubah akun, kolom password dikosongkan agar password lama tetap dipakai.

---

## Validasi (dijalankan di store, bukan hanya HTML)

| Aturan | Pesan |
| --- | --- |
| Nama/email/password kosong | "Nama, email, dan password wajib diisi." |
| Format email (wajib ada `@` dan domain) | "Format email tidak valid." |
| Password < 6 karakter | "Password minimal 6 karakter." |
| Email sudah terdaftar | "Email ini sudah terdaftar. Coba masuk atau pakai email lain." |
| Konfirmasi password berbeda | "Konfirmasi password tidak sama." (di halaman, sebelum kirim) |

---

## Status akun

| Status | Arti | Bisa masuk? |
| --- | --- | --- |
| `aktif` | Akun berjalan normal | Ya |
| `menunggu` | Pendaftar pengelola, belum diverifikasi | Tidak |
| `nonaktif` | Dibekukan pengelola, atau pengajuan ditolak | Tidak |

---

## Berkas yang terlibat

| Berkas | Peran dalam alur |
| --- | --- |
| `src/pages/Daftar.jsx` | Halaman pendaftaran + layar hasil pengajuan pengelola |
| `src/pages/Login.jsx` | Tautan "Daftar di sini", info pendaftar menunggu, kartu akun demo |
| `src/pages/admin/AdminUsers.jsx` | Pembuatan akun, panel persetujuan, ubah status, area |
| `src/pages/Profil.jsx` | Pemilik akun mengganti password sendiri + Keluar |
| `src/store/SmartStore.jsx` | `register()`, `setUserStatus()`, `saveUser()`, `login()` |
| `src/data/seed.js` | `STATUS_AKUN`, `AVATAR_PILIHAN`, `DEMO_PASSWORD` |
| `src/SmartApp.jsx` | Rute `/daftar` di luar gerbang login |

---

## Catatan keamanan (demo)

Belum ada backend. Password disimpan apa adanya di `localStorage` — cukup untuk demo tugas
akhir, **bukan** untuk data sungguhan. Bila nanti dipakai nyata: pindahkan autentikasi ke
server (hash password + token sesi), tambahkan verifikasi email, dan catat jejak siapa
menyetujui pengajuan.
