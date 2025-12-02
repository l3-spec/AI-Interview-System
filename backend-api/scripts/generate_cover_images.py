import random
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parents[1]
WORD_SEED = ROOT / "scripts" / "post_seed.json"
OUTPUT_DIR = ROOT / "uploads" / "post-covers"

COLORS = [
    (79, 70, 229),
    (220, 38, 38),
    (16, 185, 129),
    (59, 130, 246),
    (234, 88, 12),
    (132, 204, 22),
    (236, 72, 153),
    (14, 165, 233),
]


def slugify(text: str, fallback: str) -> str:
    allowed = "abcdefghijklmnopqrstuvwxyz0123456789-"
    text = text.lower().replace(" ", "-")
    slug = "".join(ch for ch in text if ch in allowed)
    return slug[:60] or fallback


def draw_cover(title: str, subtitle: str, path: Path):
    width, height = 1200, 630
    color1, color2 = random.sample(COLORS, 2)
    image = Image.new("RGB", (width, height), color1)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    try:
        font_title = ImageFont.truetype("Arial Unicode.ttf", 54)
        font_sub = ImageFont.truetype("Arial Unicode.ttf", 32)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # 标题居中多行
    wrapped_title = textwrap.wrap(title, width=16)
    start_y = height // 3
    for i, line in enumerate(wrapped_title[:3]):
        w, h = draw.textsize(line, font=font_title)
        draw.text(((width - w) / 2, start_y + i * (h + 8)), line, font=font_title, fill=(255, 255, 255))

    sub_lines = textwrap.wrap(subtitle, width=28)
    sub_y = start_y + len(wrapped_title[:3]) * 70 + 20
    for i, line in enumerate(sub_lines[:2]):
        w, h = draw.textsize(line, font=font_sub)
        draw.text(((width - w) / 2, sub_y + i * (h + 6)), line, font=font_sub, fill=(235, 241, 255))

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def main():
    if not WORD_SEED.exists():
        raise SystemExit("post_seed.json not found")
    seed = json.loads(WORD_SEED.read_text())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for idx, item in enumerate(seed):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        subtitle = " · ".join(item.get("tags") or []) or "AI Interview"
        filename = slugify(title, f"post-{idx+1}") + ".png"
        out_path = OUTPUT_DIR / filename
        draw_cover(title[:40], subtitle, out_path)
        print(f"generated {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
