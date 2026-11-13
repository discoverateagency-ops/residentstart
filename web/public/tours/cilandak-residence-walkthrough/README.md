# Cilandak Residence — photo walkthrough tour

Real show-unit photos (not 360°) shown in a 360 viewer as **partial panoramas**: each photo is projected at its camera field of view (`haov` × `vaov`), so the visitor drags to look around inside the shot with correct perspective, and green arrows walk room to room. Thumbnail strip + floor-plan minimap included.

```
rooms.json         13 stops, links with yaw/pitch, map pins, haov/vaov per photo
photos/            one JPG per stop (from the gallery set)
thumbs/            480×270 thumbnails
floorplan-gf.png   ground floor (illustrative) with pin positions
floorplan-1f.png   upper floor
tour-test.html     standalone test page (Pannellum via CDN); serve the folder and open it
```

Test: `python3 -m http.server` in this folder → http://localhost:8000/tour-test.html (laptop and phone). Add `?debug=1` and click anywhere to print yaw/pitch in the console when adjusting an arrow.

Field of view used: portrait phone photos `haov 46 / vaov 74`, landscape `haov 70 / vaov 43`. If a photo looks stretched, lower `haov` by 5 and re-check.

**Upgrading to full 360° later:** replace a stop's `panorama` with a 2:1 equirectangular file and set `haov: 360, vaov: 180`. Nothing else changes.
