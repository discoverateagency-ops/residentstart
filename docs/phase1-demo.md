# Demo script (≈3 minutes)

Fresh state before recording: `cd web && npx tsx --env-file=.env scripts/near-topup.ts 40 && npm run seed` (creates Bintaro and Depok on-chain).

| # | Who / where | Action | What the viewer sees |
|---|---|---|---|
| 1 | Anyone · `/` | Search Location "Cipete", Price "> 3 M"; then tap the **Jagakarsa** location tile | Property portal: photo hero, search, cards with Rp … Miliar, cicilan line, KT/KM/LT/LB |
| 2 | `/buy/cilandak-residence` | **All photos (15)**, tap a tenor tab, press **◎ 360° tour** | Real show-unit gallery, specs, installment table; photo walkthrough: arrows, thumbnails, floor-plan minimap (13 stops, ground → stairs → upper floor) |
| 3 | **For Investor** · `/invest` | **Investor login** (investor tab pre-selected) as investor1 → Bintaro → **Invest 10 NEAR** | "1 share added · view tx ↗" in ~4 s; funding bar moves; tx on NearBlocks; /invest card updates |
| 4 | admin · `/admin?tab=dao&project=bintaro-green-cluster` | **Open funding proposal** | Proposal row with open tx |
| 5 | investor1 (and investor2 after investing) | **Vote yes / Vote no** on `/investor?project=bintaro-green-cluster` | Weights = shares; non-holders see "Buy shares to vote" |
| 6 | admin · DAO tab | **Finalize proposal** | Status approved; Bintaro moves from For Investor to **For Buyer** |
| 7 | buyer1 · `/buyer` | Upload reference photo → **Start camera** → **Verify my face** (or admin → Buyers → **Mark verified (override)**) | "Verified ✓" |
| 8 | buyer1 · `/buy/cilandak-residence` → **Buy this home** | Installment → 10 yr → **Confirm 10-year installment** | Loan created on NEAR; schedule shows 120 periods × Rp 27.662.692 |
| 9 | buyer1 · `/buyer/schedule` | **Pay** → QRIS | Pay page with SIMULASI QR and countdown |
| 10 | Phone | Scan the QR → simulator page → **Bayar** | Laptop page flips to **Paid ✓** within seconds; receipt hash + NEAR tx link |
| 11 | investor1 · `/investor` | Refresh | Repayments: 1 / 120 periods paid, latest receipt with NearBlocks link |
| 12 | Agents | Investor: "Show me the latest repayment" · Buyer: "Monthly for 10 years?" / "Monthly for 7 years?" | Grounded answers; 7 years → available tenors only |
| 13 | admin · Marketing | **Run agent** on one site | Simulated SEO report + "simulated" chart |
| 14 | **Blog** · `/blog` | Open "5, 10 or 15 years: choosing a tenor" | Article with the Cilandak tenor table, related homes, share buttons |

QA: T1–T18, Q2–Q7 and the PRD-2 cases (R1, L1, B1, B2, I1–I3, P1, A1) are automated by `web/scripts/e2e.ts` (108 checks, on-chain). Tour walk (V1–V3), filters (L2, L3), lightbox, login tab and mobile sticky bars were verified in headless Chromium at 1366 px and 360 px.
