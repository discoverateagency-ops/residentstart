# AGENTS.md — rules for coding agents working on this repo

- Stack: Next.js App Router + TypeScript (strict) + Tailwind 4 in `web/`; Prisma + Postgres; Rust contracts in `contracts/dao`, `contracts/vault`; near-api-js server-side only.
- Every NEAR call goes through `web/lib/near.ts` (+ `lib/near-tx.ts`). Keys are server-side env only and never imported into client components.
- Money: integer rupiah with `_idr` suffix (BigInt in DB, digit strings on-chain); NEAR amounts as yocto strings/BigInt. No floats in storage.
- Runtime prompts are loaded from `prompts/` (`web/prompts` copy), never inlined. All LLM calls go through `web/lib/llm.ts`; CONTEXT is built only by `web/lib/agent-context.ts`.
- Every dashboard, pay, simulator and receipt screen renders `<DemoBanner/>`. Payment status changes only through the webhook handler or the expiry check.
- Face verification runs in the browser; only the reference photo and numeric descriptor are stored.
- Definition of done: `npm run build`, `npm test`, `cargo test` pass, and `scripts/e2e.ts` passes against a freshly seeded app.
- Progress/decisions log: `docs/BUILD-LOG.md`.
