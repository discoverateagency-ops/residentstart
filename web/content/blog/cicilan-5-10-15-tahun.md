---
slug: cicilan-5-10-15-tahun
title: "5, 10 or 15 years: choosing a tenor"
excerpt: "How the annuity formula sets your monthly installment, and how 5, 10 and 15 year tenors compare on Cilandak Residence."
category: Financing
cover: /blog/cicilan-5-10-15-tahun.jpg
author: Residentstart Team
authorRole: Editorial
date: 2026-11-13
readMinutes: 5
related: [cilandak-residence]
---

When you choose installments on Residentstart, you pick one of three tenors: 5, 10 or 15 years. That choice sets your monthly payment and the total you pay. This article explains how the numbers are calculated and what to weigh before you confirm.

## How the annuity formula works

An annuity is a loan repaid in equal monthly amounts. Each payment covers that month's interest plus part of the principal. Early in the loan, more of each payment goes to interest. Later, more goes to principal. The monthly amount stays the same throughout.

Residentstart's demo uses this formula:

`monthly = ceil(principal × r / (1 − (1 + r)^−n))`

where:

- **principal** is the amount financed, which is the list price minus the 20 % down payment,
- **r** is the monthly rate, 0.08 / 12, from an 8 % annual demo rate,
- **n** is the number of months, the tenor in years × 12,
- **ceil** rounds up to the next whole rupiah.

The 8 % figure is a demo rate used to make the calculation concrete. It is not an offer and not a market rate.

## The three tenors side by side

Here is [Cilandak Residence](/buy/cilandak-residence) as an example. The list price is Rp 2.850.000.000. The down payment is Rp 570.000.000, leaving a principal of Rp 2.280.000.000 financed by the DAO pool.

| Tenor | Monthly installment | Total of installments (excl. DP) |
|---|---|---|
| 5 years (60 months) | Rp 46.230.179 | Rp 2.773.810.740 |
| 10 years (120 months) | Rp 27.662.692 | Rp 3.319.523.040 |
| 15 years (180 months) | Rp 21.788.868 | Rp 3.921.996.240 |

For comparison, the cash price, 5 % below list, is Rp 2.707.500.000.

To find the full amount paid under each tenor, add the Rp 570.000.000 down payment to the total of installments.

## Total cost vs monthly comfort

The table shows the basic trade-off clearly. A longer tenor lowers the monthly payment, but because interest accrues for longer, the total rises.

> A lower monthly figure is not a lower price. It is the same house paid for over more months, with more interest along the way.

Some ways to think about it:

- **5 years** has the highest monthly payment and the lowest total. It suits buyers with a high, stable income who want to finish quickly.
- **10 years** sits in the middle. The monthly amount is noticeably lower than 5 years, and the total is lower than 15 years.
- **15 years** has the lowest monthly payment and the highest total. It leaves the most room in your monthly budget, but you pay the longest.

A useful exercise is to take your real monthly income after fixed costs and ask how each option would feel in a tight month, not an average one. A payment that is comfortable today should still be manageable if income drops for a while.

## Can you change later (not in demo)

In this demo, the tenor you choose is fixed. Specifically:

- you can only pay the next unpaid month,
- early payoff is not available,
- switching to a longer or shorter tenor is not available,
- missed-payment handling is not implemented; a production DAO would define it in its proposal terms.

A production product would need clear rules for all of these, set out before the buyer signs and reviewed by a lawyer. It would also need OJK securities-crowdfunding licensing. Until then, treat your tenor choice in the demo as final for that loan.

## Checklist before confirming

Before you confirm an installment plan, go through this list:

1. **Check the down payment.** It is 20 % of the list price. For Cilandak Residence that is Rp 570.000.000, due up front.
2. **Compare with cash.** If you can pay in full, the cash price is 5 % below list.
3. **Read the total, not just the monthly.** Look at the total of installments for your tenor in the table above.
4. **Test your budget.** Make sure the monthly payment fits a difficult month, not only a normal one.
5. **Know how you will pay.** Each month you receive a Virtual Account number (BCA, BNI or Mandiri) or a QRIS code. In the demo these are simulated, with numbers starting 9999 and marked SIMULASI.
6. **Know what is recorded.** Each payment creates an on-chain record with a receipt hash and no personal data. See [How to verify a Residentstart transaction on NearBlocks](/blog/near-testnet-bukti-onchain).
7. **See the home first.** Walk through the [show-unit tour](/buy/cilandak-residence/tour) and ask the questions in [our tour guide](/blog/virtual-tour-sebelum-beli).

If you are new to the process, start with [How to buy a new house in Jakarta without a bank loan](/blog/cara-beli-rumah-tanpa-bank), then browse homes on [/buy](/buy).

*This article is part of a hackathon demo on NEAR testnet.*
