# Demo script (≈3 minutes)

Fresh state before recording: `cd web && npx tsx --env-file=.env scripts/near-topup.ts 40 && npm run seed`, then log in as admin → **DAO → Create project on-chain**.

| # | Who / where | Action | What the viewer sees |
|---|---|---|---|
| 1 | Anyone · `/` | Scroll the landing page | Hero, live trust stats (shares sold / target), project card, how it works, FAQ |
| 2 | `/project/cilandak-residence` | Open gallery, tap a tenor tab, press **◎ Virtual tour** | 2D designs, specs, cash vs installment table, 360° walk (Living → Kitchen, Living → Master Bedroom → Bathroom) |
| 3 | investor1 · `/investor` | Enter 10 NEAR → **Invest 10 NEAR** → confirm | "1 share added · view tx ↗" in ~4 s; funding bar moves; tx on NearBlocks |
| 4 | admin · `/admin?tab=dao` | **Open funding proposal** | Proposal row with open tx |
| 5 | investor1 (and investor2 after investing) | **Vote yes / Vote no** | Weights = shares; non-holders see "Buy shares to vote" |
| 6 | admin · DAO tab | **Finalize proposal** | Status approved; landing card shows **funded** |
| 7 | buyer1 · `/buyer` | Upload reference photo → **Start camera** → **Verify my face** (or admin → Buyers → **Mark verified (override)**) | "Verified ✓" |
| 8 | buyer1 · `/buyer` | Installment → 10 yr → **Confirm 10-year installment** | Loan created on NEAR; schedule shows 120 periods × Rp 27.662.692 |
| 9 | buyer1 · `/buyer/schedule` | **Pay** → QRIS | Pay page with SIMULASI QR and countdown |
| 10 | Phone | Scan the QR → simulator page → **Bayar** | Laptop page flips to **Paid ✓** within seconds; receipt hash + NEAR tx link |
| 11 | investor1 · `/investor` | Refresh | Repayments: 1 / 120 periods paid, latest receipt with NearBlocks link |
| 12 | Agents | Investor: "Show me the latest repayment" · Buyer: "Monthly for 10 years?" / "Monthly for 7 years?" | Grounded answers; 7 years → available tenors only |
| 13 | admin · Marketing | **Run agent** on one site | Simulated SEO report + "simulated" chart |

Phase 1 gate (PRD): T1–T13 pass — automated by `web/scripts/e2e.ts` (72 checks).
