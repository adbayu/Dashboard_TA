"""Generate project/tokens.json for the JagoFarm Design System (5 themes x light/dark)."""
import json, sys, pathlib

ORDER = ["bg","surface","surface-2","border","text","text-2","primary","primary-hover","on-primary","focus",
         "band","track","marker","ok-fg","ok-bg","warn-fg","warn-bg","warn-line","bad-fg","bad-bg","bad-line",
         "info-fg","info-bg","side-bg","side-text","side-text-2","side-active","side-active-text","side-line",
         "mark-bg","mark-fg","chart-1","water-bg","water-line","water-fg","leaf-bg","leaf-line","leaf-fg","chip-ink"]

USAGE = {
 "bg":"Latar halaman di belakang semua kartu.",
 "surface":"Permukaan kartu, panel, modal, input.",
 "surface-2":"Permukaan sekunder: hover baris, kotak di dalam kartu, kepala tabel.",
 "border":"Garis tepi kartu, pemisah baris, garis input.",
 "text":"Teks utama dan angka sensor di atas bg/surface.",
 "text-2":"Teks pendukung: satuan, kode alat, waktu ukur, label.",
 "primary":"Tombol utama, menu aktif (tema A), tautan, centang tugas.",
 "primary-hover":"Hover tombol utama.",
 "on-primary":"Teks/ikon di atas primary.",
 "focus":"Cincin fokus keyboard (2px) di area konten.",
 "band":"Pita rentang ideal pada RangeBar.",
 "track":"Lintasan RangeBar dan progress di luar pita.",
 "marker":"Penanda nilai sensor di RangeBar saat normal.",
 "ok-fg":"Status normal/terhubung: teks + ikon.",
 "ok-bg":"Latar keping status normal.",
 "warn-fg":"Status di luar batas/perlu perhatian, garis ambang di grafik.",
 "warn-bg":"Latar Alert peringatan dan kepala kartu di luar batas.",
 "warn-line":"Garis tepi Alert peringatan / kartu di luar batas.",
 "bad-fg":"Galat, alat terputus, aksi hapus. Selalu dengan ikon + teks.",
 "bad-bg":"Latar Alert galat.",
 "bad-line":"Garis tepi Alert galat.",
 "info-fg":"Info netral: perawatan, data tertunda, petunjuk.",
 "info-bg":"Latar Alert info.",
 "side-bg":"Latar sidebar navigasi.",
 "side-text":"Teks menu sidebar.",
 "side-text-2":"Label grup menu dan info akun di sidebar.",
 "side-active":"Latar menu aktif/hover di sidebar.",
 "side-active-text":"Teks menu aktif di sidebar.",
 "side-line":"Pemisah di dalam sidebar.",
 "mark-bg":"Kotak logo JagoFarm.",
 "mark-fg":"Ikon di dalam kotak logo.",
 "chart-1":"Garis seri utama grafik sensor.",
 "water-bg":"Permukaan area kolam/ikan (biru air).",
 "water-line":"Garis tepi area kolam.",
 "water-fg":"Ikon/judul/chip area kolam.",
 "leaf-bg":"Permukaan area growbed/tanaman (hijau daun).",
 "leaf-line":"Garis tepi area growbed.",
 "leaf-fg":"Ikon/judul/chip area growbed.",
 "chip-ink":"Ikon di dalam chip berwarna (water-fg/leaf-fg/warn-fg).",
}

T = {}
T["kebun-air-light"] = dict(zip(ORDER, """#f4f1e9 #fffdf8 #ece7da #ddd5c3 #262318 #665e4c #3f5f26 #334e1e #ffffff #3f5f26
#cfdfae #e8e1d1 #262318 #3f6a1f #e7eed9 #9a3f17 #f8e4d7 #e2a37f #8f1d14 #f6d9d3 #e09a8e
#1f6f8b #e2eef1 #263018 #f1ede2 #bcc0a6 #3a4727 #ffffff #323e21 #a6c46f #18200b #1f6f8b
#e2eef1 #c0d8de #1f6f8b #e7eed9 #cad8b0 #3f5f26 #ffffff""".split()))
T["kebun-air-dark"] = dict(zip(ORDER, """#14130e #1d1b14 #27241b #3a3426 #efe9da #b0a78f #a6c46f #b8d483 #18200b #b8d483
#3a4a20 #2b271d #efe9da #b2cf7c #232d16 #f0a57f #3a2216 #734128 #ff8a7a #3d1510 #7a2a20
#6cc3e0 #15252a #0f120a #efe9da #9a9d85 #232a17 #ffffff #1b2012 #a6c46f #18200b #6cc3e0
#15252a #23414a #6cc3e0 #1d2613 #34431f #a6c46f #10170a""".split()))
T["catatan-lapangan-light"] = dict(zip(ORDER, """#f7f6f1 #fffefb #f0eee6 #e1ddd1 #1f2a1f #5e6457 #235a2f #1b4925 #ffffff #235a2f
#dbe9d4 #ece9df #1f2a1f #2a6b36 #e4eee1 #8a4a10 #fbefd9 #e7c27e #a12a1c #fbe4df #eeb3a8
#2b5f7a #e3eef3 #f7f6f1 #1f2a1f #6b7064 #e8e4d8 #1f2a1f #e1ddd1 #235a2f #ffffff #235a2f
#f7f6f1 #e1ddd1 #5e6457 #f7f6f1 #e1ddd1 #5e6457 #ffffff""".split()))
T["catatan-lapangan-dark"] = dict(zip(ORDER, """#151713 #1c1f1a #242821 #33382f #e9ebe3 #a8ad9f #7fc08a #95cf9f #10200f #95cf9f
#26402a #2b2f27 #e9ebe3 #8fd09a #1f2e1f #f2c17a #352812 #6b5020 #f19a8c #3a1a16 #6e2f27
#8cc4dc #172a33 #151713 #e9ebe3 #9aa091 #262a22 #e9ebe3 #2c3028 #7fc08a #10200f #7fc08a
#151713 #33382f #a8ad9f #151713 #33382f #a8ad9f #10200f""".split()))
T["panel-instrumen-light"] = dict(zip(ORDER, """#f1f3f0 #fcfdfc #eff1ef #d7dad7 #1d211c #60655f #1f7a5c #17644b #ffffff #1f7a5c
#d3ecdf #e7e9e7 #1d211c #1c6e52 #e0f1ea #8f4a00 #fff4d5 #f0c869 #b42318 #fde8e4 #f3b5aa
#00749e #e1f3fa #1d211c #eceeec #a5aba3 #2f342e #ffffff #2b302a #3fb68b #06180f #00749e
#fcfdfc #d7dad7 #60655f #fcfdfc #d7dad7 #60655f #ffffff""".split()))
T["panel-instrumen-dark"] = dict(zip(ORDER, """#111210 #181917 #212220 #383a36 #eceeec #afb5ad #3fb68b #58c79e #06180f #58c79e
#1c3a2d #282a27 #eceeec #6fd3a8 #173026 #ffca16 #302008 #5c4210 #ff8f80 #3b1612 #6f2a22
#75c7f0 #12293a #0b0c0b #eceeec #8d948b #232521 #ffffff #1d1f1c #3fb68b #06180f #75c7f0
#181917 #383a36 #afb5ad #181917 #383a36 #afb5ad #06180f""".split()))
T["tanah-lumut-light"] = dict(zip(ORDER, """#f3efe6 #fffcf6 #ece5d6 #ddd3bf #2a2418 #6a604d #4e6b2a #3f5821 #ffffff #4e6b2a
#dfe7c7 #e9e1d0 #2a2418 #4a6a24 #e7ecd6 #9a3f17 #f9e3d6 #e3a582 #8f1d14 #f8dcd6 #e6a59b
#2d6577 #e2ecec #2f3a1f #f3efe6 #c7c9b2 #45532f #ffffff #3c4828 #a6c46f #18200b #4e6b2a
#fffcf6 #ddd3bf #4e6b2a #fffcf6 #ddd3bf #4e6b2a #ffffff""".split()))
T["tanah-lumut-dark"] = dict(zip(ORDER, """#16140f #1f1c15 #29251c #3b3527 #efe8d8 #b3a990 #a6c46f #b8d483 #18200b #b8d483
#30391d #2c281e #efe8d8 #b2cf7c #2a3319 #f0a57f #3a2216 #734128 #ff8a7a #3d1510 #7a2a20
#8fc3cf #172629 #1d2412 #efe8d8 #a8ab92 #2f3a1f #ffffff #2a3219 #a6c46f #18200b #a6c46f
#1f1c15 #3b3527 #a6c46f #1f1c15 #3b3527 #a6c46f #18200b""".split()))
T["lumina-light"] = dict(zip(ORDER, """#ecfdf5 #ffffff #f1f5f9 #d7efe4 #0f172a #5b6b80 #047857 #065f46 #ffffff #059669
#a7f3d0 #e2e8f0 #0f172a #047857 #d1fae5 #c2410c #fff7ed #fed7aa #b91c1c #fee2e2 #fecaca
#0e7490 #cffafe #065f46 #ecfdf5 #a7f3d0 #1f7059 #ffffff #1a6b55 #34d399 #022c22 #059669
#ecfeff #a5f3fc #0e7490 #ecfdf5 #a7f3d0 #047857 #ffffff""".split()))
T["lumina-dark"] = dict(zip(ORDER, """#020617 #0f172a #1e293b #1f3b35 #f1f5f9 #94a3b8 #34d399 #6ee7b7 #022c22 #34d399
#065f46 #1e293b #f1f5f9 #34d399 #052e24 #fb923c #2a1608 #7c3a12 #f87171 #2a0f12 #7f1d1d
#22d3ee #082f37 #022c22 #ecfdf5 #6ee7b7 #064e3b #ffffff #053d30 #34d399 #022c22 #34d399
#082f37 #155e75 #67e8f9 #052e24 #065f46 #6ee7b7 #022c22""".split()))

for k, v in T.items():
    assert len(v) == len(ORDER), (k, len(v))

THEMES = [
 ("kebun-air-light","Kebun Air · Terang"),("kebun-air-dark","Kebun Air · Gelap"),
 ("catatan-lapangan-light","Catatan Lapangan · Terang"),("catatan-lapangan-dark","Catatan Lapangan · Gelap"),
 ("panel-instrumen-light","Panel Instrumen · Terang"),("panel-instrumen-dark","Panel Instrumen · Gelap"),
 ("tanah-lumut-light","Tanah & Lumut · Terang"),("tanah-lumut-dark","Tanah & Lumut · Gelap"),
 ("lumina-light","Lumina · Terang"),("lumina-dark","Lumina · Gelap"),
]

color_tokens = [{"name": n, "value": {tid: T[tid][n] for tid, _ in THEMES}, "usage": USAGE[n]} for n in ORDER]

tokens = {
 "name": "JagoFarm", "version": 1,
 "meta": {"source": "Keputusan desain sesi 2026-11-18; mockup arah-visual v1 (A asli) dan v3 (D berwarna)."},
 "color": {"themes": [{"id": i, "name": n} for i, n in THEMES], "tokens": color_tokens},
 "type": {
  "fonts": [],
  "families": {
   "jakarta": "\"Plus Jakarta Sans\", system-ui, sans-serif",
   "source": "\"Source Sans 3\", system-ui, sans-serif",
   "fraunces": "\"Fraunces\", Georgia, serif",
   "inter": "\"Inter\", system-ui, sans-serif",
   "mono": "\"JetBrains Mono\", ui-monospace, monospace"
  },
  "groups": [
   {"name": "Kebun Air (bawaan)", "family": "jakarta", "styles": [
     {"name": "page-title", "fontSize": "26px", "lineHeight": "32px", "fontWeight": 700},
     {"name": "section-title", "fontSize": "19px", "lineHeight": "26px", "fontWeight": 700},
     {"name": "card-title", "fontSize": "16px", "lineHeight": "22px", "fontWeight": 700},
     {"name": "body", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 400},
     {"name": "small", "fontSize": "14px", "lineHeight": "20px", "fontWeight": 400},
     {"name": "caption", "fontSize": "12px", "lineHeight": "16px", "fontWeight": 500}]},
   {"name": "Angka & kode (Kebun Air, Panel Instrumen)", "family": "mono", "styles": [
     {"name": "value-lg", "fontSize": "26px", "lineHeight": "30px", "fontWeight": 500},
     {"name": "code", "fontSize": "12px", "lineHeight": "16px", "fontWeight": 500}]},
   {"name": "Catatan Lapangan: judul", "family": "fraunces", "styles": [
     {"name": "page-title-serif", "fontSize": "30px", "lineHeight": "35px", "fontWeight": 600},
     {"name": "section-title-serif", "fontSize": "19px", "lineHeight": "26px", "fontWeight": 600}]},
   {"name": "Catatan Lapangan & Panel Instrumen: isi", "family": "source", "styles": [
     {"name": "body-source", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 400},
     {"name": "value-lg-source", "fontSize": "28px", "lineHeight": "31px", "fontWeight": 600}]},
   {"name": "Lumina", "family": "inter", "styles": [
     {"name": "page-title-inter", "fontSize": "30px", "lineHeight": "36px", "fontWeight": 800},
     {"name": "body-inter", "fontSize": "15px", "lineHeight": "22px", "fontWeight": 400},
     {"name": "value-lg-inter", "fontSize": "32px", "lineHeight": "36px", "fontWeight": 800}]}
  ]
 },
 "spacing": {"tokens": [
  {"name": "space-1", "value": "4px", "usage": "Jarak ikon ke teks di dalam keping."},
  {"name": "space-2", "value": "8px", "usage": "Jarak antar elemen kecil dalam satu baris."},
  {"name": "space-3", "value": "12px", "usage": "Jarak antar petak sensor, padding keping."},
  {"name": "space-4", "value": "16px", "usage": "Padding kartu/panel, gutter mobile."},
  {"name": "space-5", "value": "20px", "usage": "Jarak judul halaman ke konten."},
  {"name": "space-7", "value": "28px", "usage": "Jarak antar bagian (area) dalam halaman."},
  {"name": "space-8", "value": "32px", "usage": "Padding samping konten di desktop."}
 ]},
 "radius": {"tokens": [
  {"name": "radius-catatan-lapangan", "value": "4px", "usage": "Semua kartu & kontrol di tema Catatan Lapangan."},
  {"name": "radius-panel-instrumen", "value": "6px", "usage": "Semua kartu & kontrol di tema Panel Instrumen."},
  {"name": "radius-kebun-air", "value": "8px", "usage": "Semua kartu & kontrol di tema Kebun Air (bawaan)."},
  {"name": "radius-tanah-lumut", "value": "10px", "usage": "Semua kartu & kontrol di tema Tanah & Lumut."},
  {"name": "radius-lumina", "value": "20px", "usage": "Kartu di tema Lumina; tombol & keping memakai radius-pill."},
  {"name": "radius-pill", "value": "999px", "usage": "Keping status Lumina, tombol Lumina, avatar bundar."}
 ]}
}

out = pathlib.Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(tokens, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out, "colors:", len(color_tokens), "themes:", len(THEMES))
