"""Generate the extension icons (a red "no" sign over a dark disc).

Standard library only:  python3 tools/make_icons.py
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "extension", "icons")
SS = 4  # supersampling for anti-aliasing

BG = (23, 26, 33)
RED = (215, 38, 61)
WHITE = (238, 240, 244)


def sample(x, y):
    """Colour at (x, y) in a unit square centred on 0.5, or None if transparent."""
    dx, dy = x - 0.5, y - 0.5
    r = math.hypot(dx, dy)
    if r > 0.5:
        return None
    # Red ring.
    if r > 0.40:
        return RED
    # Red diagonal slash (top-left to bottom-right).
    if abs(dx - dy) / math.sqrt(2) < 0.065:
        return RED
    # White "6" built from a circle and a stem, under the slash.
    cx, cy = 0.5, 0.58
    rr = math.hypot(x - cx, y - cy)
    if 0.075 < rr < 0.135:
        return WHITE
    # Curved stem: upper-left quarter of a larger circle, ending at the loop.
    ax, ay = 0.635, 0.58
    ar = math.hypot(x - ax, y - ay)
    if 0.21 < ar < 0.27 and x <= ax and y <= ay:
        return WHITE
    return BG


def render(size):
    rows = []
    n = SS * SS
    for py in range(size):
        row = bytearray([0])  # filter type: none
        for px in range(size):
            acc = [0, 0, 0]
            alpha = 0
            for sy in range(SS):
                for sx in range(SS):
                    c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size)
                    if c is not None:
                        alpha += 1
                        for i in range(3):
                            acc[i] += c[i]
            if alpha:
                row += bytes([acc[0] // alpha, acc[1] // alpha, acc[2] // alpha, 255 * alpha // n])
            else:
                row += b"\0\0\0\0"
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, raw):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for s in (16, 48, 128):
        with open(os.path.join(OUT, f"icon{s}.png"), "wb") as f:
            f.write(png(s, render(s)))
        print(f"icons/icon{s}.png")
