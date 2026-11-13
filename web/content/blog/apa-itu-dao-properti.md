---
slug: apa-itu-dao-properti
title: "What is a property DAO, in plain words"
excerpt: "A DAO explained without jargon: a shared wallet with rules, shares that carry votes, and repayments recorded on-chain."
category: Investing
cover: /blog/apa-itu-dao-properti.jpg
author: Residentstart Team
authorRole: Editorial
date: 2026-11-10
readMinutes: 4
related: [bintaro-green-cluster, depok-hills-cluster]
---

"DAO" stands for decentralised autonomous organisation. The phrase sounds abstract, but the idea behind Residentstart's demo is simple. This article explains it step by step, using the projects that are currently open for funding in the demo.

## A DAO is a shared wallet with rules

Imagine a group of people putting money into one account. Normally, someone has to be trusted to manage it: a treasurer, a fund manager or a bank. In a DAO, the account is a smart contract. The contract holds the funds and follows rules written in code. Anyone can read those rules, and anyone can see what the contract has done.

On Residentstart, that contract is `dao.residentstart.testnet` on NEAR testnet. It does three things:

- accepts deposits from investors and gives them shares,
- lets share holders vote on proposals,
- records the outcome of each vote.

The rules apply the same way to everyone. Nobody can quietly change a balance or a vote count.

## Shares, votes, proposals

When an investor deposits NEAR testnet with the `invest` function, the contract converts it into shares. One share costs 10 NEAR. If you send an amount that is not a multiple of 10, the remainder is refunded in the same transaction.

Each project has a share target. For example:

- [Bintaro Green Cluster](/invest/bintaro-green-cluster) in Pondok Aren, Tangerang Selatan: 300 shares × 10 NEAR, a target of 3.000 NEAR, for 2 units with a planned buyer price of Rp 2.400.000.000 each.
- Depok Hills Cluster in Cimanggis, Depok: 250 shares × 10 NEAR, a target of 2.500 NEAR, for 2 units with a planned buyer price of Rp 1.750.000.000 each.

Share holders then vote. The demo has one proposal type: "approve funding". Each vote is weighted by the number of shares the voter holds. When voting closes, the admin finalizes the proposal. If yes votes are greater than no votes, the project status changes to "funded".

> Your vote counts in proportion to your shares, and the result is written where everyone can read it.

You can browse open projects on [/invest](/invest).

## Where the money goes

In a funded project, the pool finances the part of each home that buyers pay in installments. Buyers put down 20 % of the list price themselves, and the remaining 80 % is financed by the pool. The buyer then repays that amount in monthly installments over 5, 10 or 15 years, at an 8 % annual demo rate.

The buyer pays in rupiah, by Virtual Account or QRIS. They never need a crypto wallet. The buyer side is described in [How to buy a new house in Jakarta without a bank loan](/blog/cara-beli-rumah-tanpa-bank).

It is worth being clear about scale: testnet NEAR has no value, and the rupiah payments in the demo go through a simulator. The flow is real; the money is not.

## How repayments come back on-chain

Each loan is created on a second contract, `vault.residentstart.testnet`, with the `create_loan` function. The loan is identified by an opaque `borrower_ref`, which is the loan id. Names and email addresses are never written on-chain.

When a buyer pays a month, the payment flow looks like this:

1. The buyer pays the Virtual Account or QRIS on the simulator page.
2. The simulator sends a "paid" webhook to the Residentstart server.
3. The server calls `record_repayment` on the vault contract.
4. The record includes a `receipt_hash`, a SHA-256 hash of the loan id, period index, amount in rupiah and payment time.

Anyone with the hash and the original values can confirm the receipt matches. For a walk-through on the explorer, see [How to verify a Residentstart transaction on NearBlocks](/blog/near-testnet-bukti-onchain).

## What this demo does and doesn't do

The demo shows the full shape of the idea, but several parts are intentionally missing:

- **Repayment distribution to share holders is not implemented.** Repayments are recorded, but not yet paid out to investors.
- **Default handling is not implemented.** A production DAO would define it in the proposal terms.
- **Investor keys are held server-side.** This keeps the demo simple. A production version would use the investor's own wallet.
- **Only one proposal type exists.** Real governance would need more, such as changing terms or replacing a contractor.
- **No licensing.** A production version would need OJK securities-crowdfunding licensing and a lawyer's review.

Nothing here is an offer to invest, and the demo makes no statement about returns. It is a working sketch of how shared funding, voting and repayment records could fit together in one transparent system.

*This article is part of a hackathon demo on NEAR testnet.*
