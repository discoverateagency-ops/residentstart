// Generates the illustrative 2D designs for the demo project as SVG files in public/designs/.
// Run: node scripts/gen-designs.mjs   (no dependencies)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "designs");
mkdirSync(out, { recursive: true });

const G9 = "#163B35", G7 = "#1E4D45", G5 = "#2E6B60", G1 = "#E3EEEB", BG = "#F7F9F8", INK = "#1A1F1E";
const S = 52; // px per metre
const OX = 60, OY = 90;

function room(x, y, w, h, name, dims, fill = "#fff") {
  const cx = OX + (x + w / 2) * S, cy = OY + (y + h / 2) * S;
  return `<rect x="${OX + x * S}" y="${OY + y * S}" width="${w * S}" height="${h * S}" fill="${fill}" stroke="${G9}" stroke-width="4"/>
  <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Poppins,Inter,Arial" font-size="17" font-weight="600" fill="${G9}">${name}</text>
  ${dims ? `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="${INK}">${dims}</text>` : ""}`;
}
function door(x, y, horizontal) {
  return horizontal
    ? `<line x1="${OX + x * S}" y1="${OY + y * S}" x2="${OX + (x + 0.9) * S}" y2="${OY + y * S}" stroke="#fff" stroke-width="7"/>`
    : `<line x1="${OX + x * S}" y1="${OY + y * S}" x2="${OX + x * S}" y2="${OY + (y + 0.9) * S}" stroke="#fff" stroke-width="7"/>`;
}
function stairs(x, y, w, h) {
  let s = `<rect x="${OX + x * S}" y="${OY + y * S}" width="${w * S}" height="${h * S}" fill="${G1}" stroke="${G9}" stroke-width="3"/>`;
  for (let i = 1; i < 10; i++) s += `<line x1="${OX + x * S}" y1="${OY + (y + (h * i) / 10) * S}" x2="${OX + (x + w) * S}" y2="${OY + (y + (h * i) / 10) * S}" stroke="${G5}" stroke-width="1.5"/>`;
  return s + `<text x="${OX + (x + w / 2) * S}" y="${OY + (y + h / 2) * S}" text-anchor="middle" font-family="Inter,Arial" font-size="13" fill="${G9}">Stairs</text>`;
}
function frame(title, body, W = 8, H = 15) {
  const w = OX * 2 + W * S, h = OY + H * S + 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <text x="${OX}" y="44" font-family="Poppins,Inter,Arial" font-size="26" font-weight="600" fill="${G9}">${title}</text>
  <text x="${OX}" y="70" font-family="Inter,Arial" font-size="15" fill="${G5}">Residentstart Cilandak Residence · lot 8 × 15 m (120 m²)</text>
  <rect x="${OX}" y="${OY}" width="${W * S}" height="${H * S}" fill="none" stroke="${G5}" stroke-width="2" stroke-dasharray="8 6"/>
  ${body}
  <text x="${OX}" y="${OY + H * S + 36}" font-family="Inter,Arial" font-size="14" fill="${INK}">Front (street) ↑ · scale approx. · dimensions per room table</text>
  <text x="${OX}" y="${OY + H * S + 62}" font-family="Inter,Arial" font-size="14" font-weight="600" fill="#B54708">Illustrative design for a hackathon demo, not a construction drawing</text>
</svg>`;
}

const fp1 = frame(
  "Floor plan · 1st floor",
  [
    room(0, 0, 3, 5, "Carport", "3.0 × 5.0 m", G1),
    room(3, 0, 5, 2.2, "Front garden", "", "#EEF5EE"),
    room(3, 2.2, 5, 2.8, "Terrace", "", "#fff"),
    room(0, 5, 6, 4.5, "Living / dining", "6.0 × 4.5 m · 27 m²"),
    room(6, 5, 2, 1.8, "Guest bath", "1.8 × 1.6 m"),
    stairs(6, 6.8, 2, 2.7),
    room(0, 9.5, 4, 3.5, "Kitchen", "4.0 × 3.5 m · 14 m²"),
    room(4, 9.5, 4, 3.5, "Dining nook", "part of living"),
    room(0, 13, 2.6, 2, "Service yard", "2.0 × 3.0 m", G1),
    room(2.6, 13, 5.4, 2, "Back garden", "", "#EEF5EE"),
    door(3.6, 5, true), door(2, 9.5, true), door(6, 5.5, false), door(1, 13, true),
  ].join("\n"),
);

const fp2 = frame(
  "Floor plan · 2nd floor",
  [
    room(0, 0, 8, 5, "Carport roof (below)", "", "#EFEFEF"),
    room(0, 5, 4.5, 4, "Master bedroom", "4.5 × 4.0 m · 18 m²"),
    room(4.5, 5, 3.5, 2.1, "Master bath", "2.6 × 2.0 m"),
    stairs(6, 7.1, 2, 2.4),
    room(4.5, 7.1, 1.5, 2.4, "Hall", ""),
    room(0, 9, 4.2, 3.6, "Bedroom 2", "3.5 × 3.0 m"),
    room(4.2, 9.5, 3.8, 3.1, "Bedroom 3", "3.0 × 3.0 m · study"),
    room(0, 12.6, 8, 2.4, "Roof (below)", "", "#EFEFEF"),
    door(4.5, 7.6, false), door(5, 7.1, true), door(4.5, 9.5, true), door(3, 9, true),
  ].join("\n"),
);

const renderFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE6E0"/><stop offset="1" stop-color="#F7F9F8"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9CC3BA"/><stop offset="1" stop-color="#2E6B60"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <circle cx="1350" cy="150" r="70" fill="#FFF3CD"/>
  <rect y="700" width="1600" height="200" fill="#CBD5D1"/>
  <rect y="760" width="1600" height="140" fill="#8E9A96"/>
  <!-- trees -->
  <circle cx="160" cy="520" r="110" fill="#2E6B60"/><rect x="150" y="560" width="20" height="160" fill="#5B4636"/>
  <circle cx="1450" cy="540" r="95" fill="#1E4D45"/><rect x="1440" y="580" width="20" height="140" fill="#5B4636"/>
  <!-- carport -->
  <rect x="330" y="470" width="360" height="16" fill="#163B35"/>
  <rect x="340" y="486" width="12" height="214" fill="#163B35"/><rect x="668" y="486" width="12" height="214" fill="#163B35"/>
  <rect x="380" y="610" width="260" height="70" rx="22" fill="#B42318"/><rect x="420" y="585" width="170" height="45" rx="16" fill="#D9534F"/>
  <circle cx="430" cy="685" r="22" fill="#1A1F1E"/><circle cx="590" cy="685" r="22" fill="#1A1F1E"/>
  <!-- house body -->
  <rect x="690" y="290" width="640" height="410" fill="#FFFFFF" stroke="#163B35" stroke-width="6"/>
  <rect x="690" y="290" width="640" height="200" fill="#F2F5F4" stroke="#163B35" stroke-width="6"/>
  <polygon points="660,300 1010,170 1360,300" fill="#1E4D45"/>
  <rect x="690" y="482" width="640" height="16" fill="#163B35"/>
  <!-- upper windows -->
  <rect x="740" y="330" width="250" height="120" fill="url(#glass)" stroke="#163B35" stroke-width="5"/>
  <line x1="865" y1="330" x2="865" y2="450" stroke="#163B35" stroke-width="4"/>
  <rect x="1060" y="330" width="210" height="120" fill="url(#glass)" stroke="#163B35" stroke-width="5"/>
  <!-- lower -->
  <rect x="740" y="530" width="300" height="140" fill="url(#glass)" stroke="#163B35" stroke-width="5"/>
  <line x1="890" y1="530" x2="890" y2="670" stroke="#163B35" stroke-width="4"/>
  <rect x="1110" y="520" width="110" height="180" fill="#5B4636" stroke="#163B35" stroke-width="5"/>
  <circle cx="1200" cy="615" r="6" fill="#FFF3CD"/>
  <!-- fence -->
  ${Array.from({ length: 24 }, (_, i) => `<rect x="${700 + i * 27}" y="650" width="8" height="58" fill="#2E6B60"/>`).join("")}
  <rect x="690" y="660" width="660" height="8" fill="#2E6B60"/>
  <text x="60" y="80" font-family="Poppins,Inter,Arial" font-size="40" font-weight="600" fill="#163B35">Residentstart Cilandak Residence</text>
  <text x="60" y="122" font-family="Inter,Arial" font-size="24" fill="#2E6B60">2-storey · 3 bed · 2 bath · land 120 m² · building 150 m²</text>
  <text x="60" y="860" font-family="Inter,Arial" font-size="22" font-weight="600" fill="#FFFFFF">Illustrative render · not a real design</text>
</svg>`;

const renderLiving = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="#F2EEE6"/>
  <polygon points="0,0 1600,0 1250,180 350,180" fill="#FFFFFF"/>
  <polygon points="0,900 1600,900 1250,640 350,640" fill="#C9A77C"/>
  ${Array.from({ length: 12 }, (_, i) => `<line x1="${350 + i * 82}" y1="640" x2="${-200 + i * 180}" y2="900" stroke="#B48F63" stroke-width="2"/>`).join("")}
  <polygon points="0,0 350,180 350,640 0,900" fill="#E9E4DA"/>
  <polygon points="1600,0 1250,180 1250,640 1600,900" fill="#E9E4DA"/>
  <rect x="350" y="180" width="900" height="460" fill="#F7F4EE"/>
  <!-- window -->
  <rect x="430" y="230" width="420" height="300" fill="#CFE6E0" stroke="#163B35" stroke-width="8"/>
  <line x1="640" y1="230" x2="640" y2="530" stroke="#163B35" stroke-width="6"/>
  <rect x="410" y="215" width="40" height="330" fill="#2E6B60" opacity=".85"/><rect x="830" y="215" width="40" height="330" fill="#2E6B60" opacity=".85"/>
  <!-- TV wall -->
  <rect x="920" y="230" width="280" height="300" fill="#1E4D45"/>
  <rect x="960" y="290" width="200" height="115" fill="#1A1F1E"/>
  <rect x="920" y="520" width="280" height="40" fill="#163B35"/>
  <!-- sofa -->
  <rect x="470" y="600" width="520" height="120" rx="24" fill="#2E6B60"/>
  <rect x="470" y="560" width="520" height="70" rx="22" fill="#1E4D45"/>
  <rect x="440" y="590" width="60" height="140" rx="20" fill="#163B35"/><rect x="960" y="590" width="60" height="140" rx="20" fill="#163B35"/>
  <!-- rug & table -->
  <ellipse cx="760" cy="790" rx="330" ry="70" fill="#E3EEEB"/>
  <rect x="640" y="740" width="240" height="30" rx="10" fill="#5B4636"/>
  <!-- plant -->
  <rect x="1300" y="690" width="70" height="90" fill="#5B4636"/>
  <circle cx="1335" cy="640" r="70" fill="#2E6B60"/><circle cx="1300" cy="600" r="50" fill="#1E4D45"/>
  <!-- lamp -->
  <line x1="800" y1="0" x2="800" y2="120" stroke="#1A1F1E" stroke-width="4"/>
  <ellipse cx="800" cy="130" rx="60" ry="22" fill="#FFF3CD"/>
  <text x="40" y="70" font-family="Poppins,Inter,Arial" font-size="38" font-weight="600" fill="#163B35">Living room · 6.0 × 4.5 m</text>
  <text x="40" y="870" font-family="Inter,Arial" font-size="22" font-weight="600" fill="#163B35">Illustrative render · not a real design</text>
</svg>`;

writeFileSync(join(out, "floor_plan_1f.svg"), fp1);
writeFileSync(join(out, "floor_plan_2f.svg"), fp2);
writeFileSync(join(out, "render_front.svg"), renderFront);
writeFileSync(join(out, "render_living.svg"), renderLiving);
const map = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="1200" height="600">
  <rect width="1200" height="600" fill="#EEF2EF"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 90}" y1="0" x2="${i * 90 - 120}" y2="600" stroke="#DDE5E1" stroke-width="10"/>`).join("")}
  <path d="M0 470 C 300 440, 700 470, 1200 420" stroke="#F4C46B" stroke-width="34" fill="none"/>
  <text x="840" y="410" font-family="Inter,Arial" font-size="22" font-weight="600" fill="#8A5A00">Jl. TB Simatupang</text>
  <path d="M520 0 C 540 200, 500 380, 560 600" stroke="#FFFFFF" stroke-width="26" fill="none"/>
  <text x="560" y="120" font-family="Inter,Arial" font-size="20" fill="#4A5552" transform="rotate(84 560 120)">Jl. RS Fatmawati</text>
  <circle cx="525" cy="190" r="16" fill="#1E4D45"/><text x="550" y="196" font-family="Inter,Arial" font-size="20" fill="#1E4D45">MRT Fatmawati</text>
  <circle cx="515" cy="40" r="16" fill="#1E4D45"/><text x="540" y="46" font-family="Inter,Arial" font-size="20" fill="#1E4D45">MRT Cipete Raya</text>
  <rect x="160" y="140" width="220" height="150" rx="16" fill="#CFE6D6"/><text x="190" y="225" font-family="Inter,Arial" font-size="20" fill="#2E6B60">Green area</text>
  <circle cx="700" cy="300" r="34" fill="#1E4D45" opacity=".18"/>
  <path d="M700 250 C 676 250 660 268 660 290 C 660 322 700 350 700 350 C 700 350 740 322 740 290 C 740 268 724 250 700 250 Z" fill="#1E4D45"/>
  <circle cx="700" cy="290" r="12" fill="#fff"/>
  <rect x="750" y="262" width="330" height="62" rx="12" fill="#fff" stroke="#1E4D45" stroke-width="2"/>
  <text x="768" y="290" font-family="Poppins,Inter,Arial" font-size="20" font-weight="600" fill="#163B35">Cilandak Residence</text>
  <text x="768" y="314" font-family="Inter,Arial" font-size="16" fill="#4A5552">Cilandak, Jakarta Selatan (demo location)</text>
  <text x="24" y="580" font-family="Inter,Arial" font-size="16" fill="#4A5552">Schematic map · not to scale · exact address not published</text>
</svg>`;
writeFileSync(join(out, "map_cilandak.svg"), map);
console.log("designs written to", out);
