# AGENTS.md — rules for coding agents working on this repo

- Stack: Next.js App Router + TypeScript (strict) + Tailwind 4 in `web/`; Prisma + Postgres; Rust contracts in `contracts/dao`, `contracts/vault`; near-api-js server-side only.
- Every NEAR call goes through `web/lib/near.ts` (+ `lib/near-tx.ts`). Keys are server-side env only and never imported into client components.
- Money: integer rupiah with `_idr` suffix (BigInt in DB, digit strings on-chain); NEAR amounts as yocto strings/BigInt. No floats in storage.
- Runtime prompts are loaded from `prompts/` (`web/prompts` copy), never inlined. All LLM calls go through `web/lib/llm.ts`; CONTEXT is built only by `web/lib/agent-context.ts`.
- Every dashboard, pay, simulator and receipt screen renders `<DemoBanner/>`. Payment status changes only through the webhook handler or the expiry check.
- Face verification runs in the browser; only the reference photo and numeric descriptor are stored.
- Definition of done: `npm run build`, `npm test`, `cargo test` pass, and `scripts/e2e.ts` passes against a freshly seeded app.
- Progress/decisions log: `docs/BUILD-LOG.md`.

## Revision (PRD-2)
- No vector illustrations of houses anywhere; all imagery comes from `web/public/projects`, `/tours`, `/hero`, `/blog`, `/areas`, with credits in `docs/credits.md`.
- Project audience is computed from status (`funding` → investor; `funded`/`in_construction`/`completed` → buyer) in `lib/project.ts#audienceOf`, never stored.
- Routes: `/buy/*`, `/invest/*`, `/blog/*`; `/project/[slug]` (and `/tour`) 301-redirect by audience; a slug opened under the wrong audience redirects to the right one.
- Tour keeps Pannellum; behaviour and styling match `web/public/tours/cilandak-residence-walkthrough/tour-test.html` (partial panoramas via haov/vaov, arrows, thumbnail strip, floor-plan minimap). Component: `components/TourWalkthrough.tsx`; config lives in the `tour_sets` table (rooms.json shape).
- Blog bodies live in `web/content/blog/*.md` with frontmatter; `npm run seed` imports them. Admin can only toggle `published`.
- Funding projects are created on-chain by the seed when `NEAR_ADMIN_KEY` is set (or from /admin → DAO). Only `funding` projects may be created on-chain.
- Repayments on the investor dashboard are the whole DAO pool (installments on every home are financed by the pool).
