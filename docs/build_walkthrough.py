"""Build Residentstart photo-walkthrough tour + gallery from the 15 WhatsApp photos."""
import os, json, shutil
from PIL import Image, ImageDraw, ImageFont, ImageOps

SRC = "/home/claude/prop_in"
OUT = "/home/claude/handoff-2/web/public"
SLUG = "cilandak-residence"
GAL = f"{OUT}/projects/{SLUG}"
TOUR = f"{OUT}/tours/{SLUG}-walkthrough"
for d in (GAL, f"{TOUR}/photos", f"{TOUR}/thumbs", f"{OUT}/hero"):
    os.makedirs(d, exist_ok=True)

files = sorted(f for f in os.listdir(SRC) if f.endswith('.jpeg'))
def src(i): return os.path.join(SRC, files[i-1])

GREEN = (30, 77, 69)

# ---------- gallery ----------
gallery = [  # (index, filename, kind, alt)
    (12, "exterior.jpg", "exterior", "Front facade with carport and garden strip"),
    (13, "exterior-2.jpg", "exterior", "Front facade, street view"),
    (8,  "living.jpg", "living", "Living room with sofa, open to dining and kitchen"),
    (10, "kitchen-dining.jpg", "kitchen", "Dining table and fitted kitchen with dark-wood cabinets"),
    (11, "kitchen.jpg", "kitchen", "Kitchen counter, sink and glass door to the service yard"),
    (15, "dining.jpg", "dining", "Dining area with stairs and pendant lamp"),
    (7,  "living-2.jpg", "living", "View from the living room towards the kitchen"),
    (3,  "master-bedroom.jpg", "bedroom", "Master bedroom with corner window"),
    (4,  "master-bedroom-2.jpg", "bedroom", "Master bedroom wardrobe and TV console"),
    (2,  "bedroom-2.jpg", "bedroom", "Bedroom 2 with built-in bed and wardrobe"),
    (6,  "bedroom-3.jpg", "bedroom", "Bedroom 3 (service / study) with window"),
    (9,  "bathroom-1.jpg", "bathroom", "Bathroom 1 with shower"),
    (14, "bathroom-2.jpg", "bathroom", "Bathroom 2 with frosted window"),
    (1,  "stairs.jpg", "other", "Staircase to the upper floor"),
    (5,  "landing.jpg", "other", "Upper-floor landing"),
]
photos_json = []
for idx, name, kind, alt in gallery:
    im = Image.open(src(idx)).convert("RGB")
    im = ImageOps.exif_transpose(im)
    im.save(f"{GAL}/{name}", quality=86, optimize=True)
    photos_json.append({"kind": kind, "url": f"/projects/{SLUG}/{name}", "alt": alt, "w": im.size[0], "h": im.size[1]})

# cover + hero: 16:9 crop of the exterior
ext = Image.open(src(12)).convert("RGB")
W, H = ext.size
ch = int(W * 2 / 3); top = int(H * 0.45) - ch // 2
ext.crop((0, top, W, top + ch)).save(f"{GAL}/cover.jpg", quality=88)          # 3:2 card cover
ch2 = int(W * 9 / 16); top2 = int(H * 0.45) - ch2 // 2
ext.crop((0, top2, W, top2 + ch2)).resize((1280, 720), Image.LANCZOS).save(f"{OUT}/hero/home.jpg", quality=88)

# ---------- tour stops ----------
# haov/vaov: phone main camera ≈ 70° horizontal in landscape; portrait ≈ 46° × 74°
P = dict(haov=46, vaov=74)
L = dict(haov=70, vaov=43)
# hotspots given as (x%, y%) in the photo
stops = [
 dict(id="exterior", name="Front of house", floor="gf", photo=12, fov=P, map=(50, 86),
      links=[("living", 50, 60, "Enter the house")]),
 dict(id="living", name="Living room", floor="gf", photo=8, fov=L, map=(33, 67),
      links=[("kitchen-dining", 55, 62, "Dining & kitchen"), ("dining", 20, 85, "Dining & stairs"), ("exterior", 92, 75, "Front door")]),
 dict(id="kitchen-dining", name="Dining & kitchen", floor="gf", photo=7, fov=P, map=(45, 48),
      links=[("kitchen", 22, 55, "Kitchen"), ("bedroom-3", 80, 50, "Bedroom 3"), ("living", 50, 92, "Back to living")]),
 dict(id="kitchen", name="Kitchen", floor="gf", photo=11, fov=P, map=(20, 24),
      links=[("kitchen-dining", 50, 92, "Back to dining")]),
 dict(id="bedroom-3", name="Bedroom 3", floor="gf", photo=6, fov=P, map=(77, 42),
      links=[("bathroom-1", 8, 58, "Bathroom 1"), ("kitchen-dining", 50, 92, "Back to dining")]),
 dict(id="bathroom-1", name="Bathroom 1", floor="gf", photo=9, fov=P, map=(77, 22),
      links=[("bedroom-3", 50, 92, "Back")]),
 dict(id="dining", name="Dining & stairs", floor="gf", photo=15, fov=P, map=(22, 50),
      links=[("stairs", 22, 42, "Upstairs"), ("exterior", 86, 50, "Front door"), ("living", 50, 92, "Back to living")]),
 dict(id="stairs", name="Staircase", floor="gf", photo=1, fov=P, map=(40, 24),
      links=[("landing", 50, 45, "Up to landing"), ("dining", 50, 92, "Back down")]),
 dict(id="landing", name="Upper landing", floor="1f", photo=5, fov=P, map=(27, 53),
      links=[("master-bedroom", 75, 40, "Master bedroom"), ("bedroom-2", 35, 30, "Bedroom 2"), ("stairs", 20, 85, "Downstairs")]),
 dict(id="master-bedroom", name="Master bedroom", floor="1f", photo=3, fov=P, map=(75, 35),
      links=[("master-wardrobe", 15, 65, "Wardrobe side"), ("landing", 50, 92, "Back to landing")]),
 dict(id="master-wardrobe", name="Master bedroom · wardrobe", floor="1f", photo=4, fov=L, map=(62, 58),
      links=[("bedroom-2", 62, 30, "Bedroom 2"), ("master-bedroom", 92, 80, "Window side")]),
 dict(id="bedroom-2", name="Bedroom 2", floor="1f", photo=2, fov=P, map=(27, 27),
      links=[("bathroom-2", 90, 50, "Bathroom 2"), ("landing", 50, 92, "Back to landing")]),
 dict(id="bathroom-2", name="Bathroom 2", floor="1f", photo=14, fov=P, map=(59, 16),
      links=[("bedroom-2", 50, 92, "Back")]),
]
def to_yawpitch(x, y, fov):
    return round((x - 50) / 100 * fov["haov"], 1), round((50 - y) / 100 * fov["vaov"], 1)

rooms = []
for s in stops:
    im = Image.open(src(s["photo"])).convert("RGB")
    fn = f"{s['id']}.jpg"
    im.save(f"{TOUR}/photos/{fn}", quality=86, optimize=True)
    th = ImageOps.fit(im, (480, 270), Image.LANCZOS); th.save(f"{TOUR}/thumbs/{fn}", quality=80)
    links = []
    for to, x, y, label in s["links"]:
        yaw, pitch = to_yawpitch(x, y, s["fov"])
        links.append(dict(to=to, yaw=yaw, pitch=pitch, text=label))
    rooms.append(dict(id=s["id"], name=s["name"], floor=s["floor"], panorama=f"photos/{fn}", thumbnail=f"thumbs/{fn}",
                      haov=s["fov"]["haov"], vaov=s["fov"]["vaov"], vOffset=0, initialYaw=0,
                      map={"x": s["map"][0] / 100, "y": s["map"][1] / 100}, links=links))
ids = {r["id"] for r in rooms}
for r in rooms:
    for l in r["links"]: assert l["to"] in ids, l
config = dict(
    project=SLUG, mode="photo-walkthrough",
    note="Flat photos shown as partial panoramas (haov/vaov = camera field of view). Replace with 2:1 equirectangular files and set haov=360, vaov=180 to upgrade to full 360 in place.",
    floorplans={"gf": "floorplan-gf.png", "1f": "floorplan-1f.png"}, rooms=rooms)
json.dump(config, open(f"{TOUR}/rooms.json", "w"), indent=2)

# ---------- floor plans (imagined, consistent with photos) ----------
def floorplan(path, title, rooms_rects, pins):
    W, H = 900, 600
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18); fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception: f = fb = ImageFont.load_default()
    d.text((20, 14), title, font=fb, fill=GREEN)
    for name, (x0, y0, x1, y1) in rooms_rects:
        d.rectangle([x0, y0, x1, y1], outline=(60, 60, 60), width=4, fill=(243, 246, 245))
        d.text((x0 + 10, y0 + 8), name, font=f, fill=(40, 40, 40))
    for pid, (px, py) in pins:
        x, y = px / 100 * W, py / 100 * H
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=GREEN, outline="white", width=3)
    d.text((20, H - 30), "Illustrative plan · not to scale · LT 72 m² (6 × 12) · LB 90 m²", font=f, fill=(120, 120, 120))
    im.save(path)
gf = [("Carport", (60, 470, 840, 560)), ("Living room", (60, 330, 540, 470)), ("Dining", (60, 210, 540, 330)),
      ("Kitchen", (60, 80, 300, 210)), ("Stairs", (300, 80, 420, 210)), ("Bedroom 3", (540, 180, 840, 330)),
      ("Bathroom 1", (540, 80, 840, 180)), ("Service yard", (420, 80, 540, 210))]
floorplan(f"{TOUR}/floorplan-gf.png", "Ground floor", gf, [(r["id"], (r["map"]["x"]*100, r["map"]["y"]*100)) for r in rooms if r["floor"] == "gf"])
f1 = [("Master bedroom", (420, 130, 840, 400)), ("Bedroom 2", (60, 80, 420, 240)), ("Bathroom 2", (420, 60, 640, 130)),
      ("Landing", (60, 240, 420, 400)), ("Balcony / void", (60, 400, 840, 500))]
floorplan(f"{TOUR}/floorplan-1f.png", "Upper floor", f1, [(r["id"], (r["map"]["x"]*100, r["map"]["y"]*100)) for r in rooms if r["floor"] == "1f"])

json.dump(dict(slug=SLUG, cover=f"/projects/{SLUG}/cover.jpg", photos=photos_json,
               floorplans=[f"/tours/{SLUG}-walkthrough/floorplan-gf.png", f"/tours/{SLUG}-walkthrough/floorplan-1f.png"]),
          open(f"{GAL}/photos.json", "w"), indent=2)
print("stops:", len(rooms), "gallery:", len(photos_json))
for r in rooms: print(r["id"], [(l["to"], l["yaw"], l["pitch"]) for l in r["links"]])
