# Submission kit

## Project description (≈1,000 characters; form allows 20–2,000)

Residentstart is a Jakarta property developer that funds its own housing projects through a DAO on NEAR. The site works like a property portal: buyers search homes by location, price and bedrooms, compare prices with the monthly installment, and walk through the real show unit in a 13-stop photo tour with arrows, thumbnails and a floor-plan minimap. Investors see projects open for funding, deposit NEAR (testnet) into the dao contract for shares, and vote by share weight to approve funding; an approved project moves to the buyer side. Buyers pay in Indonesian rupiah — cash or a 5/10/15-year installment financed by the DAO pool — through a Virtual Account / QRIS simulator, and every paid installment is hashed and written to the vault contract, so investors can verify on NearBlocks that money comes back. AI agents answer from project data; a blog explains buying, the DAO and on-chain verification. Rust contracts, Next.js, server-side NEAR signer. Testnet demo with synthetic data — no real money.

- Live: https://residentstart.biz.id
- Repo: https://github.com/discoverateagency-ops/residentstart
- Tracks: Real-World Money, Social Money, Open Innovation
- NEAR wallet for prizes: residentstart.testnet (confirm the mainnet prize address with the team lead before submitting)

## X post (≤280 chars)

Built at NEAR HACKATHON 🏠 Residentstart: a property portal where homes are funded by a DAO on @NEARProtocol. Walk the real show unit, invest for shares, pay rupiah installments — every repayment leaves a receipt on NEAR. #NEARHackathon https://residentstart.biz.id

## Screenshots to attach (6)

1. Landing `/` (desktop): photo hero, search, home cards.
2. Home detail `/buy/cilandak-residence`: gallery, price card, installment tabs.
3. Tour `/buy/cilandak-residence/tour`: arrows, thumbnail strip, floor-plan minimap.
4. For Investor `/invest`: funding cards with live shares.
5. Pay page `/pay/<id>`: QRIS SIMULASI with countdown.
6. NearBlocks: the `record_repayment` receipt transaction.

## 90-second video shot list

1. (0–8 s) Landing on a phone: headline, live stats, DEMO banner.
2. (8–20 s) Project page → 360° tour, tap two hotspots.
3. (20–35 s) investor1 invests 10 NEAR → toast → NearBlocks tab shows the tx.
4. (35–45 s) Admin opens proposal → investors vote → finalize → "funded".
5. (45–60 s) buyer1 verified → confirms 10-year installment → schedule (120 × Rp 27.662.692).
6. (60–75 s) QRIS pay page on laptop, phone scans → simulator **Bayar** → laptop flips to Paid ✓ with receipt hash → NearBlocks.
7. (75–85 s) Investor dashboard: 1/120 paid; ask the agent "Show me the latest repayment".
8. (85–90 s) End card: repo URL, "testnet demo, synthetic data", @NEARProtocol #NEARHackathon.
