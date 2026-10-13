# Deploy ke VPS

Satu domain melayani web dan API. Caddy menangani HTTPS, API dan database tidak dibuka ke internet.

## Prasyarat

- Domain atau subdomain dengan A record ke IP VPS.
- Firewall VPS membuka 22, 80, dan 443 (443/udp opsional untuk HTTP/3). Port 3001 dan 5432 tetap tertutup.
- Docker dengan plugin Compose.

## Pasang

```bash
git clone <url-repo> jagofarm && cd jagofarm/deploy
cp env.production.example .env && chmod 600 .env
openssl rand -hex 24          # tempel hasilnya ke POSTGRES_PASSWORD
nano .env                     # isi DOMAIN dan POSTGRES_PASSWORD
docker compose up -d --build
docker compose ps             # semua service harus running, api dan database healthy
```

Migration berjalan otomatis setiap `api` start.

## Buat admin pertama

Password dibaca dari environment shell, tidak ditulis sebagai argumen perintah.

```bash
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD   # minimal 12 karakter
docker compose exec -e ADMIN_EMAIL=email@kamu.com -e ADMIN_PASSWORD api \
  node --import tsx server/index.ts admin
unset ADMIN_PASSWORD
```

## Cek dari luar VPS

```bash
curl -i https://DOMAIN/api/health
curl -i -X POST https://DOMAIN/api/ingest -H 'content-type: application/json' -d '{}'
```

Perintah pertama harus 200 dengan `{"status":"ok"}`. Perintah kedua harus ditolak (400 atau 401), bukan timeout.

Cek rantai sertifikat sebelum mem-flash firmware:

```bash
openssl s_client -connect DOMAIN:443 -servername DOMAIN -showcerts </dev/null
```

Root CA yang ditanam di `firmware/include/root_ca.h` harus root dari rantai ini. Di alat, isi URL API dengan `https://DOMAIN` pada portal provisioning.

## Email undangan

Tanpa SMTP asli, email undangan masuk ke Mailpit. Buka lewat SSH tunnel:

```bash
ssh -L 8025:127.0.0.1:8025 <user>@<ip-vps>
# lalu buka http://localhost:8025
```

## Perbarui

```bash
git pull && docker compose up -d --build
```

## Backup

```bash
docker compose exec -T database pg_dump -U pilot jagofarm | gzip > ~/jagofarm-$(date +%F).sql.gz
```

Jangan jalankan `docker compose down -v`. Opsi itu menghapus volume database dan sertifikat.

## Catatan

- `TRUST_PROXY_HOPS=1` membuat API memakai IP klien dari header Caddy untuk rate limit. Nilai ini hanya aman selama API tidak punya port publik, jadi jangan tambahkan `ports` ke service `api`.
- Batas memori tiap service (`mem_limit`) sengaja dibuat kecil karena VPS 2 GB juga dipakai aplikasi lain. Naikkan kalau log menunjukkan proses terbunuh.
- Caddy memakai port 80 dan 443. Aplikasi web lain di VPS yang sama perlu dipasang di belakang Caddy ini.
