"""Periksa aset Virtual Pet sebelum build.

Alasan berkas ini ada: seluruh 40 SVG pernah terkirim TANPA penutup `</svg>`,
sehingga XML-nya rusak dan browser tidak menggambar apa pun. Build tetap hijau,
`background-image` tetap terisi, dan halaman tidak melempar galat — jadi bug ini
tidak terlihat oleh uji biasa. Skrip ini menangkapnya lebih awal.

Jalankan: npm run cek:aset   (atau: python scripts/cek-aset.py)
Keluar dengan kode 1 kalau ada berkas bermasalah, supaya bisa dipakai di CI.
"""
import sys
import xml.dom.minidom as minidom
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "assets" / "v-pet"

# Ukuran kanvas yang disepakati per folder. Perubahan ukuran tidak otomatis
# salah, tetapi harus disengaja: kalau angkanya berbeda, skrip melaporkannya.
KANVAS = {
    "karakter": (240, 160),
    "ekspresi": (60, 60),
    "aksesori": (60, 60),
    "gelembung": (200, 110),
    "latar": (480, 260),
    "ikon-sensor": (24, 24),
}


def main() -> int:
    if not ROOT.exists():
        print(f"GAGAL: folder aset tidak ditemukan: {ROOT}")
        return 1

    berkas = sorted(ROOT.rglob("*.svg"))
    masalah = []
    ringkas = {}

    for f in berkas:
        teks = f.read_text(encoding="utf-8")
        folder = f.parent.name
        nama = f.relative_to(ROOT).as_posix()
        ringkas.setdefault(folder, 0)
        ringkas[folder] += 1

        if not teks.lstrip().startswith("<svg"):
            masalah.append((nama, "tidak diawali <svg"))
            continue
        if not teks.rstrip().endswith("</svg>"):
            masalah.append((nama, "tidak diakhiri </svg> (XML rusak, tidak akan digambar browser)"))
            continue
        try:
            dok = minidom.parseString(teks)
        except Exception as e:
            masalah.append((nama, f"XML tidak valid: {str(e)[:90]}"))
            continue

        svg = dok.documentElement
        if svg.tagName != "svg":
            masalah.append((nama, f"akar bukan <svg> melainkan <{svg.tagName}>"))
            continue
        if not svg.getAttribute("viewBox"):
            masalah.append((nama, "tanpa viewBox (skala tidak bisa diprediksi)"))

        harap = KANVAS.get(folder)
        if harap:
            kotak = svg.getAttribute("viewBox").split()
            if len(kotak) != 4:
                masalah.append((nama, f"viewBox tidak lengkap: '{svg.getAttribute('viewBox')}'"))
            else:
                _, _, w, h = kotak
                if not (abs(float(w) - harap[0]) < 0.5 and abs(float(h) - harap[1]) < 0.5):
                    masalah.append((nama, f"kanvas {w}x{h}, seharusnya {harap[0]}x{harap[1]} untuk folder {folder}"))

    print("Aset Virtual Pet:", len(berkas), "berkas di", ROOT)
    for folder in sorted(ringkas):
        ukuran = KANVAS.get(folder)
        tanda = f"kanvas {ukuran[0]}x{ukuran[1]}" if ukuran else "kanvas bebas"
        print(f"  {folder:14s} {ringkas[folder]:3d} berkas   ({tanda})")

    # Berkas yang wajib ada, karena nama-namanya dipanggil dari kode/data.
    wajib = [
        "karakter/nila.svg",
        "ekspresi/netral.svg",
        "aksesori/none.svg",
        "gelembung/bulat.svg",
        "latar/kolam-jernih.svg",
        "ikon-sensor/aman.svg",
    ]
    hilang = [w for w in wajib if not (ROOT / w).exists()]
    for h in hilang:
        masalah.append((h, "berkas wajib tidak ada (dipakai sebagai nilai bawaan di kode)"))

    if masalah:
        print(f"\nDITEMUKAN {len(masalah)} MASALAH:")
        for nama, pesan in masalah:
            print(f"  - {nama}: {pesan}")
        return 1

    print("\nSemua aset valid: XML sehat, viewBox sesuai, berkas wajib lengkap.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
