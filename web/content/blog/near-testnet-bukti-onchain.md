---
slug: near-testnet-bukti-onchain
title: "How to verify a Residentstart transaction on NearBlocks"
excerpt: "A step-by-step guide to finding Residentstart's contracts on NearBlocks and reading invest and repayment transactions yourself."
category: Investing
cover: /blog/near-testnet-bukti-onchain.jpg
author: Residentstart Team
authorRole: Editorial
date: 2026-11-11
readMinutes: 4
related: [bintaro-green-cluster]
---

One reason to put records on a blockchain is that you do not have to take our word for them. You can check. This guide shows how to look up Residentstart's contracts and transactions on NearBlocks, a public explorer for the NEAR network.

## What testnet is

NEAR, like most blockchains, runs more than one network. Mainnet is where tokens have real value. Testnet is a separate network that works the same way technically but uses tokens with no value. Developers use it to build and test before going live.

Residentstart's demo runs entirely on NEAR testnet. That means:

- the NEAR you see deposited has no monetary value,
- the transactions are still real, public and permanent on that network,
- anyone can inspect them with the testnet explorer at [testnet.nearblocks.io](https://testnet.nearblocks.io).

So the numbers are play money, but the record-keeping is genuine.

## Finding the dao and vault contracts

The demo uses two contracts:

1. **`dao.residentstart.testnet`** holds investor deposits, shares and votes.
2. **`vault.residentstart.testnet`** holds loan records and repayment receipts.

To open either one, go to the address page on the explorer:

- `https://testnet.nearblocks.io/address/dao.residentstart.testnet`
- `https://testnet.nearblocks.io/address/vault.residentstart.testnet`

Each address page lists the transactions that called the contract, newest first. You will see the method name (for example `invest`, `create_loan` or `record_repayment`), the account that signed, the time and the transaction hash. Click a hash to open the full transaction at `/txns/<hash>`.

## Reading an invest transaction

When an investor puts NEAR into a project such as [Bintaro Green Cluster](/invest/bintaro-green-cluster), the app calls `invest` on the dao contract. Open one of these transactions and look for:

- **Signer:** the account that sent the deposit.
- **Receiver:** `dao.residentstart.testnet`.
- **Method:** `invest`.
- **Deposit:** the amount of NEAR attached.
- **Arguments:** usually the project id.

Remember the rule: one share costs 10 NEAR, and any remainder is refunded in the same transaction. If someone attached 25 NEAR, you should see 2 shares recorded and a refund of 5 NEAR back to the signer in the transaction's receipts. Bintaro's target is 300 shares, or 3.000 NEAR, so you can follow progress toward that target by adding up deposits.

In this demo, investor keys are held server-side, so the signer accounts are created by the app. A production version would have investors sign with their own wallets.

## Reading a repayment receipt

Repayments work differently, because buyers pay in rupiah rather than NEAR. The buyer pays a Virtual Account or QRIS on a simulator page. When the simulator confirms the payment, the Residentstart server calls `record_repayment` on the vault contract.

Open one of those transactions and check the arguments. You will find:

- `loan_id` and the `period_index` (which month was paid),
- `amount_idr`, the rupiah amount,
- `paid_at`, the payment time,
- `receipt_hash`.

The receipt hash is computed as:

`sha256(loan_id|period_index|amount_idr|paid_at)`

That is, the four values joined with a vertical bar and hashed with SHA-256. If you hold the original payment details, you can compute the same hash with any SHA-256 tool and compare. A match shows the on-chain record agrees with your receipt. A mismatch means something is wrong and should be raised.

> The explorer cannot tell you who paid. It can tell you that a specific payment, for a specific month and amount, was recorded at a specific time.

Because only the next unpaid period can be paid in the demo, period indexes for a loan should appear in order without gaps.

## Why hashes, not names

You will not find any buyer's name, email or phone number on the vault contract. Each loan uses an opaque `borrower_ref`, which is simply the loan id. This is deliberate.

Blockchain records are public and cannot be deleted. Writing personal data there would expose it to everyone, permanently. Instead, the demo writes only what is needed to prove a record exists and has not changed:

- an id that means nothing outside Residentstart,
- amounts and dates,
- a hash that ties those values together.

The link between a loan id and a real person stays off-chain, in the application. The buyer can see their own loan id in their account and use it to find their records on NearBlocks. Others can verify that payments were recorded consistently, without learning who made them.

For the bigger picture of how investing and repayments connect, read [What is a property DAO, in plain words](/blog/apa-itu-dao-properti). To see the buyer side, start at [/buy](/buy).

*This article is part of a hackathon demo on NEAR testnet.*
