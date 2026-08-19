"""Generate dependency-free PNG PWA icons matching the Lingua Live SVG mark."""
from pathlib import Path
import struct
import zlib


def inside_round_rect(x, y, left, top, right, bottom, radius):
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def render(size, destination):
    scale = size / 512
    pixels = bytearray()
    colors = {
        "base": (180, 83, 60, 255),
        "paper": (255, 250, 244, 255),
        "peach": (216, 137, 104, 255),
        "sage": (115, 141, 105, 255),
        "ink": (61, 51, 47, 255),
    }
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            sx, sy = x / scale, y / scale
            color = colors["base"]
            if inside_round_rect(sx, sy, 100, 77, 412, 347, 45):
                color = colors["paper"]
            if 159 <= sx <= 246 and 330 <= sy <= 420 and sy >= 420 - (sx - 159) * 0.84:
                color = colors["paper"]
            for cx, dot_color in ((178, "base"), (256, "peach"), (334, "sage")):
                if (sx - cx) ** 2 + (sy - 214) ** 2 <= 25 ** 2:
                    color = colors[dot_color]
            if 166 <= sx <= 346 and 270.5 <= sy <= 295.5:
                if sx < 178 and (sx - 178) ** 2 + (sy - 283) ** 2 > 12.5 ** 2:
                    pass
                elif sx > 334 and (sx - 334) ** 2 + (sy - 283) ** 2 > 12.5 ** 2:
                    pass
                else:
                    color = colors["ink"]
            pixels.extend(color)
    raw = bytes(pixels)
    chunks = []
    for kind, data in ((b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)), (b"IDAT", zlib.compress(raw, 9)), (b"IEND", b"")):
        chunks.append(struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))
    Path(destination).write_bytes(b"\x89PNG\r\n\x1a\n" + b"".join(chunks))


if __name__ == "__main__":
    render(192, "public/icons/icon-192.png")
    render(512, "public/icons/icon-512.png")
    render(180, "public/icons/apple-touch-icon.png")
    print("Generated Lingua Live PNG icons.")
