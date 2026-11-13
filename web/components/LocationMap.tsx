// Schematic location map (no map tiles, no house illustration): area pin + nearby points by distance.
type Nearby = { name: string; kind: string; distance_km: number };
const ANGLE: Record<string, number> = { transport: -35, school: 200, mall: 45, hospital: 140 };

export function LocationMap({ area, nearby }: { area: string; nearby: Nearby[] }) {
  const W = 800, H = 360, cx = 400, cy = 185;
  const max = Math.max(3, ...nearby.map((n) => n.distance_km));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-2xl border border-rs-border" role="img" aria-label={`Schematic map of ${area} with nearby places`}>
      <rect width={W} height={H} fill="#EEF2EF" />
      {Array.from({ length: 12 }, (_, i) => <line key={`a${i}`} x1={i * 80} y1={0} x2={i * 80 - 100} y2={H} stroke="#E0E7E3" strokeWidth={8} />)}
      <path d={`M0 ${H - 70} C 260 ${H - 100}, 520 ${H - 60}, ${W} ${H - 110}`} stroke="#F4C46B" strokeWidth={22} fill="none" />
      <path d={`M${cx - 160} 0 C ${cx - 140} 140, ${cx - 190} 240, ${cx - 120} ${H}`} stroke="#fff" strokeWidth={16} fill="none" />
      {[1, 2, 3].map((k) => <circle key={k} cx={cx} cy={cy} r={(k / 3) * 150} fill="none" stroke="#C9D6D1" strokeDasharray="4 6" />)}
      {nearby.map((n) => {
        const a = ((ANGLE[n.kind] ?? 90) * Math.PI) / 180;
        const r = (n.distance_km / max) * 150;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const right = x > cx;
        return (
          <g key={n.name}>
            <circle cx={x} cy={y} r={8} fill="#2E6B60" stroke="#fff" strokeWidth={3} />
            <text x={right ? x + 14 : x - 14} y={y + 5} textAnchor={right ? "start" : "end"} fontSize={15} fontFamily="Inter, Arial" fill="#1A1F1E">{n.name} · {n.distance_km.toLocaleString("id-ID")} km</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={26} fill="#1E4D45" opacity={0.18} />
      <circle cx={cx} cy={cy} r={11} fill="#1E4D45" stroke="#fff" strokeWidth={4} />
      <text x={cx} y={cy - 34} textAnchor="middle" fontSize={17} fontWeight={600} fontFamily="Poppins, Inter, Arial" fill="#163B35">{area}</text>
      <text x={16} y={H - 14} fontSize={13} fontFamily="Inter, Arial" fill="#4A5552">Schematic · not to scale · demo location</text>
    </svg>
  );
}
