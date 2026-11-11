# Residentstart — virtual tour sample assets

Synthetic 360° panoramas for testing the room-by-room tour before real photos exist. Copy this folder to `web/public/tour-sample/` (or `docs/tour-sample/`) and use it in build prompt M1.

```
tour-sample/
  tour-test.html        standalone Pannellum test page (open in a browser; needs internet for the Pannellum CDN)
  rooms.json            scene list with hotspot yaw/pitch for each doorway — same shape the rooms table uses
  panoramas/
    living.jpg          6.0 × 4.5 m, wood floor, window, TV wall, doorways to Kitchen and Master Bedroom
    kitchen.jpg         4.0 × 3.5 m, tiles, green cabinets, window, doorway to Living Room
    master_bedroom.jpg  4.5 × 4.0 m, carpet, window, wardrobe, doors to Living Room and Bathroom
    bathroom.jpg        2.6 × 2.0 m, white tiles, mirror, small window, door to Master Bedroom
```

All four are 4096 × 2048 equirectangular JPGs (2:1), camera height 1.5 m, rendered geometrically so walls, floor and ceiling sit at the correct angles in any 360° viewer. Each carries a watermark "illustrative, not a real design".

## How to test

1. Serve the folder (any static server, e.g. `npx serve tour-sample` or `python3 -m http.server`), open `tour-test.html` on a laptop and on a phone.
2. Drag to look around; on a phone, tilt (gyroscope) also works after the first touch.
3. Tap the green dots above each doorway to move between rooms. Expected graph: Living ↔ Kitchen, Living ↔ Master Bedroom, Master Bedroom ↔ Bathroom.
4. Use the chips at the bottom to jump directly to a room.

## Replacing with real panoramas

- Shoot or generate 2:1 equirectangular images, ≤ 4096 px wide, JPEG quality ~80 (keep each under ~1.5 MB for 4G).
- Keep the same file names, then update `rooms.json` hotspot `yaw`/`pitch` to point at the real doorways (yaw 0 = image centre, +90 = right quarter, pitch negative = below the horizon).
- Hotspot yaw/pitch for the synthetic set was computed from the room geometry (`gen_pano.py`), which is why the dots sit exactly on the doorways.

Regenerate the synthetic set with `python3 gen_pano.py` (numpy + Pillow, ~25 s).
