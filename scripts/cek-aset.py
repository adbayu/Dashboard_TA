"""Validate user-supplied pet PNGs and sensor icons."""
import re
import sys
import xml.dom.minidom as minidom
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "assets" / "v-pet"
SENSOR_KEYS = ("aman", "bahaya", "ph", "tds", "temp", "waspada")
USER_IMAGE = "karakter-arcade/nila/body.png"
PNG_SIGNATURE = bytes((137, 80, 78, 71, 13, 10, 26, 10))
LEVEL_IMAGE_PATTERN = re.compile(r"karakter-level/[a-z0-9-]+/level-(\d+)(?:-(\d+))?(?:__[a-z0-9-]+)?\.png$")


def main() -> int:
    if not ROOT.exists():
        print(f"GAGAL: folder aset tidak ditemukan: {ROOT}")
        return 1

    issues = []
    svg_files = sorted(ROOT.rglob("*.svg"))
    png_files = sorted(ROOT.rglob("*.png"))

    for path in svg_files:
        relative = path.relative_to(ROOT).as_posix()
        if not relative.startswith("ikon-sensor/"):
            issues.append((relative, "SVG karakter/dekorasi lama tidak diizinkan"))
            continue
        try:
            document = minidom.parseString(path.read_text(encoding="utf-8"))
        except Exception as error:
            issues.append((relative, f"XML tidak valid: {str(error)[:90]}"))
            continue
        root = document.documentElement
        if root.tagName != "svg" or root.getAttribute("viewBox") != "0 0 24 24":
            issues.append((relative, "ikon sensor harus berupa SVG dengan viewBox 0 0 24 24"))

    for path in png_files:
        relative = path.relative_to(ROOT).as_posix()
        parts = path.relative_to(ROOT).parts
        is_base_art = len(parts) == 3 and parts[0] == "karakter-arcade" and parts[2] == "body.png"
        level_match = LEVEL_IMAGE_PATTERN.fullmatch(relative)
        if not is_base_art and not level_match:
            issues.append((relative, "gambar hanya boleh berupa body.png atau PNG level yang dikirim pengguna"))
        if level_match:
            min_level = int(level_match.group(1))
            max_level = int(level_match.group(2) or level_match.group(1))
            if min_level < 1 or max_level < min_level:
                issues.append((relative, "rentang level gambar harus positif dan tidak terbalik"))

        data = path.read_bytes()
        if len(data) < 26 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
            issues.append((relative, "header PNG tidak valid"))
            continue
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        if width < 1 or height < 1:
            issues.append((relative, f"dimensi PNG tidak valid: {width}x{height}"))
        if relative == USER_IMAGE and (width, height) != (1536, 1024):
            issues.append((relative, f"ukuran {width}x{height}; sumber pengguna seharusnya 1536x1024"))

    required = [USER_IMAGE, *[f"ikon-sensor/{key}.svg" for key in SENSOR_KEYS]]
    for relative in required:
        if not (ROOT / relative).is_file():
            issues.append((relative, "aset wajib tidak ditemukan"))

    print(f"Memeriksa {len(svg_files)} ikon SVG dan {len(png_files)} gambar karakter di {ROOT}")
    if issues:
        print(f"\nDITEMUKAN {len(issues)} MASALAH:")
        for relative, message in issues:
            print(f"  - {relative}: {message}")
        return 1

    print("Aset valid: gambar Nila pengguna tetap utuh, ikon sensor tersedia, dan tidak ada ilustrasi tambahan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
