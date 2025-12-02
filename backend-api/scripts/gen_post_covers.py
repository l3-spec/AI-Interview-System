import os
import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from prisma import PrismaClient  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = ROOT / "uploads" / "post-covers"
DATA_PATH = ROOT / "scripts" / "post_seed.json"

COLORS = [
    (79, 70, 229),   # indigo
    (220, 38, 38),   # red
    (16, 185, 129),  # emerald
    (59, 130, 246),  # blue
    (234, 88, 12),   # orange
    (132, 204, 22),  # lime
    (236, 72, 153),  # pink
    (14, 165, 233),  # sky
]

# 简单 slug

def slugify(text: str) -> str:
    allowed = "abcdefghijklmnopqrstuvwxyz0123456789-"
    text = text.lower().replace(" ", "-")
    slug = "".join(ch for ch in text if ch in allowed)
    return slug[:60] or "post"


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

    # 字体
    try:
        font_title = ImageFont.truetype("Arial Unicode.ttf", 54)
        font_sub = ImageFont.truetype("Arial Unicode.ttf", 32)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    margin = 80
    max_width = width - margin * 2

    # 标题分行
    wrapped_title = []
    for line in textwrap.wrap(title, width=16):
        wrapped_title.append(line)
    title_y = height // 2 - len(wrapped_title) * 35
    for i, line in enumerate(wrapped_title):
        w, h = draw.textsize(line, font=font_title)
        draw.text(((width - w) / 2, title_y + i * (h + 8)), line, font=font_title, fill=(255, 255, 255))

    sub_lines = textwrap.wrap(subtitle, width=24)
    sub_y = title_y + len(wrapped_title) * 70 + 20
    for i, line in enumerate(sub_lines[:3]):
        w, h = draw.textsize(line, font=font_sub)
        draw.text(((width - w) / 2, sub_y + i * (h + 6)), line, font=font_sub, fill=(240, 244, 255))

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def main():
    import json

    if not DATA_PATH.exists():
        raise SystemExit("post_seed.json not found")

    seed = json.loads(DATA_PATH.read_text())
    prisma = PrismaClient()

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    prisma.connect()
    for item in seed:
        title = item.get("title", "").strip()
        if not title:
            continue
        subtitle = (item.get("tags") or [])
        subtitle_text = " · ".join(subtitle[:3]) if subtitle else "AI Interview Posts"
        filename = slugify(title) + ".png"
        cover_path = UPLOAD_DIR / filename
        draw_cover(title[:40], subtitle_text, cover_path)

        rel_path = f"/uploads/post-covers/{filename}"
        prisma.userPost.update_many(
            where={"title": title},
            data={"coverImage": rel_path, "images": None},
        )
        print(f"updated cover for {title} -> {rel_path}")
    prisma.disconnect()


if __name__ == "__main__":
    main()
