# TOPIC-FIX-1 §2.1 - renders 15 eval stems as "photos" of the printed question (typed font on a page,
# slight rotation + blur + noise). Stems only; never a booklet scan. Run: python render_photos.py
import json, os, random, textwrap
from PIL import Image, ImageDraw, ImageFilter, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(HERE, "items.json"), encoding="utf-8"))["items"]
pick = [i for i in items if i["kind"] == "trig-identity"][:10] + [i for i in items if i["kind"] == "confusable"][:5]
os.makedirs(os.path.join(HERE, "images"), exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
rng = random.Random(7)
for it in pick:
    lines = textwrap.wrap(it["text"].replace("\n", " "), 46)
    img = Image.new("RGB", (1000, 120 + 44 * len(lines)), (250, 248, 242))
    d = ImageDraw.Draw(img)
    d.text((40, 30), "Q.", font=font, fill=(20, 20, 20))
    for n, ln in enumerate(lines):
        d.text((90, 30 + 44 * n), ln, font=font, fill=(25, 25, 25))
    img = img.rotate(rng.uniform(-1.2, 1.2), expand=True, fillcolor=(236, 234, 228)).filter(ImageFilter.GaussianBlur(0.6))
    px = img.load()
    for _ in range(img.width * img.height // 40):
        x, y = rng.randrange(img.width), rng.randrange(img.height)
        v = rng.randint(-18, 18); r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + v)), max(0, min(255, g + v)), max(0, min(255, b + v)))
    img.save(os.path.join(HERE, "images", it["id"] + ".jpg"), quality=70)
json.dump([i["id"] for i in pick], open(os.path.join(HERE, "images", "manifest.json"), "w"))
print(len(pick), "images")
