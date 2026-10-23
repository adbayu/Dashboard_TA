# Source code berdasarkan nama output fitur

Nama folder mengikuti nama yang terlihat pada menu atau halaman, ditulis dalam huruf kecil dengan tanda hubung. Halaman dengan nama output berbeda mempunyai folder sendiri. Halaman pengguna dan pengelola dengan nama output yang sama berada dalam satu folder, dengan awalan Admin pada halaman pengelola.

| Output/menu aplikasi | Folder source | Halaman awal | Route |
| --- | --- | --- | --- |
| Dashboard | `dashboard/` | [Dashboard.jsx](dashboard/pages/Dashboard.jsx) | `/` |
| Dashboard Pengelola | `dashboard-pengelola/` | [AdminDashboard.jsx](dashboard-pengelola/pages/AdminDashboard.jsx) | `/admin` |
| List IoT | `list-iot/` | [ListIot.jsx](list-iot/pages/ListIot.jsx) | `/iot dan /iot/:id` |
| Detail Information | `detail-information/` | [AdminDetailInformation.jsx](detail-information/pages/AdminDetailInformation.jsx) | `/detail-informasi dan /admin/detail-informasi` |
| Kelola IoT | `kelola-iot/` | [AdminIot.jsx](kelola-iot/pages/AdminIot.jsx) | `/admin/iot` |
| Kategori Device | `kategori-device/` | [AdminCategories.jsx](kategori-device/pages/AdminCategories.jsx) | `/admin/kategori` |
| Kelola Area | `kelola-area/` | [AdminAreas.jsx](kelola-area/pages/AdminAreas.jsx) | `/area, /area/:id dan /admin/area` |
| V-Pet | `v-pet/` | [VPet.jsx](v-pet/pages/VPet.jsx) | `/v-pet` |
| Kelola Virtual Pet | `kelola-virtual-pet/` | [AdminVPet.jsx](kelola-virtual-pet/pages/AdminVPet.jsx) | `/admin/v-pet` |
| Gamifikasi | `gamifikasi/` | [Gamifikasi.jsx](gamifikasi/pages/Gamifikasi.jsx) | `/gamifikasi` |
| Sistem Point | `sistem-point/` | [AdminPoints.jsx](sistem-point/pages/AdminPoints.jsx) | `/admin/point` |
| Chatbot Aquaponik | `chatbot-aquaponik/` | [Chatbot.jsx](chatbot-aquaponik/pages/Chatbot.jsx) | `/chatbot` |
| Masuk | `masuk/` | [Login.jsx](masuk/pages/Login.jsx) | `/masuk` |
| Daftar | `daftar/` | [Daftar.jsx](daftar/pages/Daftar.jsx) | `/daftar` |
| Profil Saya | `profil-saya/` | [Profil.jsx](profil-saya/pages/Profil.jsx) | `/profil` |
| Pilot PostgreSQL | `pilot/` | [PilotApp.jsx](pilot/PilotApp.jsx) | `/pilot dan /pilot/*` |

Setiap folder mempunyai README yang menunjukkan file halaman dan pendukungnya. pages/ berisi halaman, components/ berisi komponen khusus fitur, data/ berisi data awal, model/ berisi aturan, services/ berisi layanan, styles/ berisi CSS, dan assets/ berisi gambar. Subfolder dibuat sesuai kebutuhan.

Kode yang digunakan beberapa fitur disimpan satu kali di shared/: UI umum, state, dan kunci tanggal lokal dari `shared/model/localDate.js`. SmartStore menghubungkan event kolam, poin akun, quest harian/bulanan V-Pet, dan EXP melalui [pondActivityState.js](shared/store/pondActivityState.js). V-Pet dan Kelola Virtual Pet memakai aturan dan GIF yang sama dari v-pet/. Sistem Point dan Gamifikasi memakai aturan poin bersama dari gamifikasi/. Halaman akun memakai data akun dari kelola-user/data/.

Router dan layout tetap berada di app/. Route, teks, class tampilan, aset, dan perilaku aplikasi tidak diubah dalam pemindahan ini.

Lihat [panduan struktur proyek](../docs/struktur-proyek.md) untuk backend, tes, dan skrip.
