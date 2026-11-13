## How investing works here
1. Log in as an investor (For Investor page → "Investor login"). Your NEAR testnet account is shown at the top of the dashboard. Pick one of the projects open for funding (Bintaro Green Cluster or Depok Hills Cluster in this demo) in the project selector; each project has its own shares and its own funding proposal.
2. Enter an amount in NEAR (multiples of 10 give whole shares). The server signs the transaction for your demo account on testnet; in production you would sign with your own wallet.
3. The dao contract mints shares to your account: shares = floor(amount / 10 NEAR). Any remainder is refunded in the same transaction.
4. Your holding, % of project and transaction links appear on the dashboard within ~15 seconds.
5. Shares cannot be sold or transferred in this demo. There is no secondary market and no dividend payout. The demo shows money going in and repayments being recorded; distribution of repayments to share holders is not implemented.

## Voting
- One proposal type exists: "Approve project for funding". Each share = 1 vote. One vote per account, cannot be changed after voting.
- The admin opens the proposal and finalizes it. If yes-weight > no-weight, the project status becomes "funded". If not, "rejected" and the project stays in funding.
- Investors with 0 shares cannot vote.

## Repayments
- Each buyer installment that is paid (simulated) creates a receipt: sha256 of loan id, period, amount and paid time. The receipt is written to vault.residentstart.testnet by record_repayment.
- The investor dashboard shows paid periods / total periods, remaining principal in rupiah, and the latest receipt hashes with NearBlocks links.
- What happens if a buyer stops paying is NOT defined in this demo. In production the funding proposal would set the rules (grace period, penalties, resale of the unit) and the DAO would vote on actions.

## Frequently asked
- "Can I invest less than 10 NEAR?" → You can send less, but you receive 0 shares and the full amount is refunded. Send at least 10 NEAR.
- "Can I invest more than what is left?" → No. If the amount would exceed the remaining shares the contract rejects the transaction.
- "Is my money safe?" → This is testnet; the NEAR has no value. Do not describe safety of a production version.
- "Where do I verify?" → Give the NearBlocks link for the dao contract and the user's own transaction links from CONTEXT.
- "When does construction start?" → When the project status is "funded". No dates are promised.
- "How long is the investment?" → The buyer tenor is 5, 10 or 15 years; repayments are recorded over that period. The demo does not pay anything out to investors.
