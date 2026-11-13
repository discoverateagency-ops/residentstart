---
slug: cara-beli-rumah-tanpa-bank
title: "How to buy a new house in Jakarta without a bank loan"
excerpt: "A plain walk-through of DAO-financed installments on Residentstart: who it is for, the five steps, and what you actually pay."
category: Buying
cover: /blog/cara-beli-rumah-tanpa-bank.jpg
author: Residentstart Team
authorRole: Editorial
date: 2026-11-08
readMinutes: 5
related: [cilandak-residence, jagakarsa-townhouse]
---

Most people who want a new house in Jakarta start at a bank. Many of them leave without a loan. This article explains another route that Residentstart is testing in a hackathon demo: an installment plan financed by a pool of investors organised as a DAO on NEAR testnet, while the buyer pays in rupiah.

## Why banks reject first-time buyers

A bank mortgage is built around documents that prove steady income over a long period. That works well for salaried employees with several years at the same company. It works less well for many first-time buyers:

- freelancers and small business owners whose income changes month to month,
- young workers who have not yet built a credit history,
- people paid partly in cash, with income that is hard to show on paper,
- households where two incomes are combined but only one is formal.

None of this means these buyers cannot pay a monthly installment. It means the bank's checklist does not see them clearly. The result is a long wait, a smaller loan than needed, or a rejection.

## What DAO-financed installment means

On Residentstart, the money for a home loan does not come from a bank. It comes from a pool. Investors deposit NEAR testnet tokens into a shared contract, receive shares, and vote on whether a project should be funded. When a project is approved, buyers of that project can choose to pay in installments, and the outstanding amount is financed by that pool.

> The buyer never touches crypto. You pay in rupiah, by Virtual Account or QRIS, and the record of each payment is written on-chain for anyone to check.

Each loan is recorded on the `vault.residentstart.testnet` contract. Each paid month adds a repayment record with a receipt hash. The loan uses an opaque reference, the loan id, never your name or email. If you want to understand the investor side, read [What is a property DAO, in plain words](/blog/apa-itu-dao-properti).

## The 5-step process on Residentstart

1. **Choose a home.** Browse the listings on [/buy](/buy). For example, [Cilandak Residence](/buy/cilandak-residence) has a photo walkthrough of the real show unit that you can open as a [360° tour](/buy/cilandak-residence/tour).
2. **Sign up.** Create an account with your email.
3. **Do the face check.** The demo runs a simple face check. It is a demonstration step, not real KYC.
4. **Pick cash or installment.** Cash is 5 % below the list price. Installment means a down payment now and monthly payments over a tenor you choose.
5. **Pay each month.** You get a Virtual Account number (BCA, BNI or Mandiri) or a QRIS code. In the demo these open a simulator page that plays the role of the bank. Numbers start with 9999 and are marked SIMULASI.

After a payment is confirmed, the server writes a repayment record to the vault contract. You can look it up yourself, as explained in [How to verify a Residentstart transaction on NearBlocks](/blog/near-testnet-bukti-onchain).

## What you pay (DP, monthly, tenor)

The terms are the same for every home in the demo:

- **Down payment:** 20 % of the list price.
- **Financed amount:** the remaining 80 %, provided by the DAO pool.
- **Rate:** 8 % per year, calculated as an annuity. This is a demo rate, not an offer.
- **Tenor:** 5, 10 or 15 years.

Take Cilandak Residence, listed at Rp 2.850.000.000. The down payment is Rp 570.000.000 and the financed principal is Rp 2.280.000.000. The monthly installment is then:

- 5 years: Rp 46.230.179 per month
- 10 years: Rp 27.662.692 per month
- 15 years: Rp 21.788.868 per month

If you pay cash instead, the price is Rp 2.707.500.000. A longer tenor lowers the monthly amount but raises the total you pay over the life of the loan. We compare the three options in [5, 10 or 15 years: choosing a tenor](/blog/cicilan-5-10-15-tahun).

A lower-priced example is [Jagakarsa Townhouse](/buy) at Rp 1.950.000.000, which is already completed and ready to move in. The same 20 % down payment and 8 % demo rate apply.

## What's not included

This is a hackathon demo, so several things a real product would need are deliberately left out:

- **No real money moves.** Payments go through a simulator, and NEAR testnet has no value.
- **No early payoff or tenor change.** You can only pay the next unpaid month.
- **No default handling.** A production DAO would define what happens after missed payments in its proposal terms.
- **No real identity check.** The face check is for demonstration only.
- **No licensing yet.** A production version would need OJK securities-crowdfunding licensing and a lawyer's review before taking real funds.

Notaris fees, taxes and certificate transfer costs are also outside the scope of the demo. Ask a qualified professional about those for any real purchase.

*This article is part of a hackathon demo on NEAR testnet.*
