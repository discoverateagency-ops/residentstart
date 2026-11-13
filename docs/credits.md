# Image credits

Every image and panorama on residentstart.biz.id, with source and licence. No stock or third-party images are used.

| Path | What | Source | Licence / permission |
|---|---|---|---|
| `web/public/projects/cilandak-residence/*.jpg` (15 photos + `cover.jpg`) | Show-unit photos: exterior, living, dining, kitchen, bedrooms, bathrooms, stairs, landing | Supplied by Septianus Angga (Residentstart team), 13 Nov 2026, via WhatsApp (720 × 1280 compressed) | Team's own photos; permission to use on residentstart.biz.id and in this public repo |
| `web/public/projects/{jagakarsa-townhouse,cipete-garden-home,bintaro-green-cluster,depok-hills-cluster}/*.jpg` | 6 photos + cover per project | Same show-unit photo set, re-ordered and re-cropped by `web/scripts/build-project-photos.mjs`; labelled "show-unit reference" / "design reference" (same unit type) | Same as above |
| `web/public/hero/home.jpg` | Landing hero | Crop of the Cilandak exterior photo | Same as above |
| `web/public/hero/invest.jpg` | For Investor hero | Crop of `exterior-2.jpg` | Same as above |
| `web/public/blog/*.jpg` | Blog covers (6) | Crops of the show-unit photos | Same as above |
| `web/public/areas/*.jpg` | Location tiles (5) | Crops of the show-unit photos (illustrative, not photos of those areas) | Same as above |
| `web/public/tours/cilandak-residence-walkthrough/photos/*.jpg`, `thumbs/*.jpg` | 13 tour stops + thumbnails | Same photo set, one file per stop | Same as above |
| `web/public/tours/cilandak-residence-walkthrough/floorplan-*.png` | Ground / upper floor plans | Drawn for the demo (`docs/build_walkthrough.py`); illustrative, not to scale | Residentstart |
| `web/public/brand/*` | Logo concept and icon | Residentstart | Residentstart |
| Location maps on detail pages | Schematic SVG drawn in code (`web/components/LocationMap.tsx`) | Residentstart | MIT (this repo) |

Notes
- The WhatsApp copies are compressed to 720 px on the short side. Drop the originals over the same file names for sharper galleries; nothing else changes.
- The four non-Cilandak projects reuse the Cilandak show unit because they share its unit type. Replace their folders with real photos (same names) when available.
- The tour uses Pannellum 2.5.6 (MIT) loaded from jsDelivr. Face verification models: `@vladmandic/face-api` (MIT).
