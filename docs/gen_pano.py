"""Generate synthetic equirectangular (2:1) room panoramas for the Residentstart tour demo.
Ray-casts a box room from a camera at 1.5 m so walls, floor and ceiling sit at correct angles
when loaded in Pannellum. Pure numpy + PIL."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os, json

W, H = 4096, 2048
OUT = "/home/claude/tour-sample/panoramas"
os.makedirs(OUT, exist_ok=True)

def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)], dtype=np.float32)

GREEN = hexc('#1E4D45')

def render(room):
    w, d, h = room['w'], room['d'], room['h']
    cam = np.array([0.0, 0.0, 1.5])
    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H
    lon = (u - 0.5) * 2*np.pi          # yaw: 0 = +x, +90deg = +y
    lat = (0.5 - v) * np.pi
    LON, LAT = np.meshgrid(lon, lat)
    dx = np.cos(LAT)*np.cos(LON); dy = np.cos(LAT)*np.sin(LON); dz = np.sin(LAT)
    big = 1e9
    def plane_t(num, den):
        t = np.where(np.abs(den) > 1e-9, num/np.where(np.abs(den)>1e-9, den, 1), big)
        return np.where(t > 0, t, big)
    ts = {
        'px': plane_t( w/2 - cam[0], dx), 'nx': plane_t(-w/2 - cam[0], dx),
        'py': plane_t( d/2 - cam[1], dy), 'ny': plane_t(-d/2 - cam[1], dy),
        'ceil': plane_t(h - cam[2], dz),  'floor': plane_t(0 - cam[2], dz),
    }
    names = list(ts.keys())
    stack = np.stack([ts[n] for n in names])
    idx = np.argmin(stack, axis=0); tmin = np.min(stack, axis=0)
    X = cam[0] + tmin*dx; Y = cam[1] + tmin*dy; Z = cam[2] + tmin*dz
    img = np.zeros((H, W, 3), dtype=np.float32)

    # base colours
    wall = hexc(room['wall']); floor = hexc(room['floor']); ceil = hexc('#F4F4F2')
    for i, n in enumerate(names):
        m = idx == i
        if n == 'floor':
            if room['floor_style'] == 'wood':
                stripe = ((np.floor(Y/0.18) % 2) * 0.08) + ((np.floor(X/1.2 + np.floor(Y/0.18)*0.5) % 2) * 0.04)
                col = floor * (1 - stripe[..., None])
            elif room['floor_style'] == 'carpet':
                noise = (np.sin(X*40)*np.sin(Y*40))*0.03
                col = floor * (1 + noise[..., None])
            else:  # tile
                gx = np.abs((X/0.6) - np.round(X/0.6)) < 0.03
                gy = np.abs((Y/0.6) - np.round(Y/0.6)) < 0.03
                col = np.where((gx|gy)[..., None], floor*0.75, floor)
            img[m] = col[m]
        elif n == 'ceil':
            lamp = (X**2 + Y**2) < 0.04
            col = np.where(lamp[..., None], hexc('#FFF6D5'), ceil)
            img[m] = col[m]
        else:
            # wall-local horizontal coordinate s (metres along wall) and height Z
            if n == 'px': s = Y
            elif n == 'nx': s = -Y
            elif n == 'py': s = -X
            else: s = X
            col = np.broadcast_to(wall, (H, W, 3)).copy()
            # skirting + ceiling cornice
            col = np.where((Z < 0.1)[..., None], hexc('#D9D9D4'), col)
            col = np.where((Z > h-0.08)[..., None], hexc('#E8E8E4'), col)
            for f in room['features']:
                if f['wall'] != n: continue
                s0, s1 = f['s'] - f['width']/2, f['s'] + f['width']/2
                z0, z1 = f['z0'], f['z1']
                inside = (s >= s0) & (s <= s1) & (Z >= z0) & (Z <= z1)
                frame = ((s >= s0-0.06) & (s <= s1+0.06) & (Z >= z0-0.06) & (Z <= z1+0.06)) & ~inside
                if f['kind'] == 'window':
                    sky = hexc('#BFE3F2');
                    # mullions
                    mul = (np.abs(((s - s0)/(s1-s0)) - 0.5) < 0.01) | (np.abs(((Z - z0)/(z1-z0)) - 0.5) < 0.012)
                    inner = np.where(mul[..., None], hexc('#FFFFFF'), sky)
                    col = np.where(inside[..., None], inner, col)
                    col = np.where(frame[..., None], hexc('#FFFFFF'), col)
                elif f['kind'] == 'door':
                    col = np.where(inside[..., None], hexc('#6E5B4B'), col)
                    col = np.where(frame[..., None], hexc('#FFFFFF'), col)
                elif f['kind'] == 'opening':   # open doorway: show darker next room
                    col = np.where(inside[..., None], hexc('#CFCFC8')*0.8, col)
                    col = np.where(frame[..., None], hexc('#FFFFFF'), col)
                elif f['kind'] == 'cabinet':
                    col = np.where(inside[..., None], hexc(f.get('color', '#2F5F55')), col)
                    seams = np.abs(((s - s0)/0.6) - np.round((s - s0)/0.6)) < 0.01
                    col = np.where((inside & seams)[..., None], hexc('#1A3A33'), col)
                elif f['kind'] == 'panel':
                    col = np.where(inside[..., None], hexc(f.get('color', '#222222')), col)
                    col = np.where(frame[..., None], hexc('#444444'), col)
                elif f['kind'] == 'tile':
                    gx = np.abs((s/0.3) - np.round(s/0.3)) < 0.02
                    gy = np.abs((Z/0.3) - np.round(Z/0.3)) < 0.02
                    col = np.where((inside & (gx|gy))[..., None], hexc('#D6DEDC'), np.where(inside[..., None], hexc('#F2F5F4'), col))
            img[m] = col[m]
    # distance + vertical shading
    shade = 1.0 - np.clip((tmin - 1.0) / 14.0, 0, 0.35)
    shade *= 1.0 - np.clip((-LAT) / (np.pi/2), 0, 1)*0.15
    img *= shade[..., None]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

    # text labels (near the equator text stays legible)
    draw = ImageDraw.Draw(im)
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 96)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
    except Exception:
        font_big = font_sm = ImageFont.load_default()
    def px(yaw_deg, pitch_deg):
        return int((yaw_deg/360 + 0.5) * W) % W, int((0.5 - pitch_deg/180) * H)
    for lab in room['labels']:
        x, y = px(lab['yaw'], lab['pitch'])
        f = font_big if lab.get('big') else font_sm
        bbox = draw.textbbox((0, 0), lab['text'], font=f)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        pad = 24
        for xx in (x - W, x, x + W):
            draw.rounded_rectangle([xx-tw/2-pad, y-th/2-pad, xx+tw/2+pad, y+th/2+pad], radius=20, fill=tuple(int(c) for c in GREEN))
            draw.text((xx-tw/2, y-th/2-8), lab['text'], font=f, fill='white')
    # watermark
    draw.text((40, H-90), "Residentstart · sample panorama · illustrative, not a real design", font=font_sm, fill=(255,255,255))
    return im

rooms = [
  dict(key='living', name='Living Room', w=6.0, d=4.5, h=2.8, wall='#F1EFE9', floor='#B8905F', floor_style='wood',
       features=[
         dict(kind='window', wall='px', s=0.0, width=2.6, z0=0.9, z1=2.3),
         dict(kind='opening', wall='py', s=1.5, width=1.0, z0=0.0, z1=2.1, to='kitchen'),
         dict(kind='door', wall='nx', s=1.2, width=0.9, z0=0.0, z1=2.1, to='master_bedroom'),
         dict(kind='panel', wall='ny', s=0.0, width=1.6, z0=0.9, z1=1.8, color='#1A1A1A'),  # TV
         dict(kind='cabinet', wall='ny', s=0.0, width=2.2, z0=0.0, z1=0.5, color='#8C6E4E'), # TV console
       ],
       labels=[dict(text='LIVING ROOM', yaw=0, pitch=38, big=True),
               dict(text='→ Kitchen', yaw=64, pitch=14), dict(text='→ Master Bedroom', yaw=180, pitch=14)]),
  dict(key='kitchen', name='Kitchen', w=4.0, d=3.5, h=2.8, wall='#F6F4EE', floor='#D9D4C7', floor_style='tile',
       features=[
         dict(kind='cabinet', wall='px', s=0.0, width=3.4, z0=0.0, z1=0.9, color='#2F5F55'),
         dict(kind='tile', wall='px', s=0.0, width=3.4, z0=0.9, z1=1.5),
         dict(kind='cabinet', wall='px', s=0.0, width=3.4, z0=1.5, z1=2.2, color='#3B6E63'),
         dict(kind='window', wall='py', s=0.0, width=1.4, z0=1.0, z1=2.0),
         dict(kind='opening', wall='ny', s=-1.0, width=1.0, z0=0.0, z1=2.1, to='living'),
       ],
       labels=[dict(text='KITCHEN', yaw=0, pitch=38, big=True), dict(text='→ Living Room', yaw=-116, pitch=14)]),
  dict(key='master_bedroom', name='Master Bedroom', w=4.5, d=4.0, h=2.8, wall='#EFF2F0', floor='#A9B5AF', floor_style='carpet',
       features=[
         dict(kind='window', wall='px', s=0.0, width=2.0, z0=0.9, z1=2.2),
         dict(kind='panel', wall='px', s=0.0, width=1.8, z0=0.0, z1=1.1, color='#5B6F68'),  # bed headboard side
         dict(kind='door', wall='py', s=0.0, width=0.9, z0=0.0, z1=2.1, to='living'),
         dict(kind='door', wall='ny', s=1.0, width=0.8, z0=0.0, z1=2.1, to='bathroom'),
         dict(kind='cabinet', wall='nx', s=0.0, width=2.4, z0=0.0, z1=2.2, color='#C9B79C'),  # wardrobe
       ],
       labels=[dict(text='MASTER BEDROOM', yaw=0, pitch=38, big=True),
               dict(text='→ Living Room', yaw=90, pitch=14), dict(text='→ Bathroom', yaw=-63, pitch=14)]),
  dict(key='bathroom', name='Bathroom', w=2.6, d=2.0, h=2.6, wall='#F2F5F4', floor='#CDD6D3', floor_style='tile',
       features=[
         dict(kind='tile', wall='px', s=0.0, width=2.0, z0=0.0, z1=2.6),
         dict(kind='tile', wall='nx', s=0.0, width=2.0, z0=0.0, z1=2.6),
         dict(kind='tile', wall='ny', s=0.0, width=2.6, z0=0.0, z1=2.6),
         dict(kind='window', wall='px', s=0.0, width=0.7, z0=1.6, z1=2.2),
         dict(kind='panel', wall='nx', s=0.0, width=0.9, z0=0.8, z1=1.6, color='#DCE7E4'),  # mirror
         dict(kind='door', wall='py', s=0.0, width=0.8, z0=0.0, z1=2.1, to='master_bedroom'),
       ],
       labels=[dict(text='BATHROOM', yaw=0, pitch=38, big=True), dict(text='→ Master Bedroom', yaw=90, pitch=14)]),
]

import math
def feat_world(r, f):
    w, d = r['w'], r['d']; s = f['s']
    if f['wall']=='px': X, Y = w/2, s
    elif f['wall']=='nx': X, Y = -w/2, -s
    elif f['wall']=='py': X, Y = -s, d/2
    else: X, Y = s, -d/2
    zc = (f['z0']+f['z1'])/2
    yaw = math.degrees(math.atan2(Y, X)); dist = math.hypot(X, Y)
    pitch = math.degrees(math.atan2(zc-1.5, dist))
    return round(yaw,1), round(pitch,1)

names = {r['key']: r['name'] for r in rooms}
config = []
for r in rooms:
    r['labels'] = [l for l in r['labels'] if l.get('big')]
    hs = []
    for f in r['features']:
        if f['kind'] in ('door','opening') and f.get('to'):
            yaw, pitch = feat_world(r, f)
            r['labels'].append(dict(text='→ ' + names[f['to']], yaw=yaw, pitch=pitch+22))
            hs.append(dict(pitch=pitch, yaw=yaw, type='scene', text=names[f['to']], sceneId=f['to']))
    config.append(dict(key=r['key'], name=r['name'], panorama=f"panoramas/{r['key']}.jpg", hotSpots=hs))
    im = render(r)
    path = os.path.join(OUT, f"{r['key']}.jpg")
    im.save(path, quality=82, optimize=True)
    print('wrote', path, os.path.getsize(path)//1024, 'KB')
json.dump(config, open('/home/claude/tour-sample/rooms.json','w'), indent=2)
