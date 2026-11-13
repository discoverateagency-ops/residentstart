# Build log: where we are and how to resume

Source spec: `docs/PRD.md` (Residentstart). The plan lives at `~/.claude/plans/read-all-the-documents-magical-giraffe.md`.
The `Dao/docs/` "Gotong" spec is **not** this project and is ignored.

## Decisions (final)
| Item | Choice |
|---|---|
| Hosting | Vercel (Next.js, root dir `web/`) |
| DB / storage | Supabase Postgres via Prisma 6 (pooled `DATABASE_URL` + `DIRECT_URL`); Supabase Storage for uploads |
| DNS | Cloudflare zone `residentstart.biz.id` (nameservers already switched by the owner) → CNAME to Vercel, DNS-only |
| Contracts | Rust, near-sdk 5.x, cargo-near 0.23, rustc stable 1.99 |
| LLM | Anthropic (`LLM_PROVIDER=anthropic`), with mock as the fallback |
| Repo | github.com/discoverateagency-ops/residentstart (private until submission, then public) |
| Local DB | `embedded-postgres` npm package (no Docker access on this box) |

## Toolchain on this machine (no sudo)
- Node 22.21.1 is at `~/.local/node/bin`. Prefix commands with `export PATH=$HOME/.local/node/bin:$HOME/.cargo/bin:$PATH`.
- rustup, cargo-near and near-cli-rs (`near`) are in `~/.cargo/bin`.
- NEAR keys are in `~/.near-credentials/testnet/*.json` (legacy keychain).

## NEAR testnet (done)
| Account | Role | Funded |
|---|---|---|
| residentstart.testnet | admin / contract owner | ~15 NEAR left |
| dao.residentstart.testnet | dao contract (deployed + `new(owner_id=residentstart.testnet)`) | 5 |
| vault.residentstart.testnet | vault contract (deployed + init) | 5 |
| investor1.residentstart.testnet | demo investor | 40 |
| investor2.residentstart.testnet | demo investor | 30 |

- Deploy tx: dao `42JXaeHoCofSSjyHc4xtcesu9HGzjps6uhnHwJ4qTuxy`, vault `4f9nRW9ZhSQYEmJRvEBmiLYjKq6WyobLKMxe1LpX9JAH`.
- Faucet: `near account create-account sponsor-by-faucet-service <name>.testnet ...` gives 10 NEAR. It rate-limits after ~10 accounts, so sweep funds with `delete-account <acc> beneficiary residentstart.testnet`.
- `dao.admin_withdraw(amount_yocto)` (owner only) recycles invested testnet NEAR.
- Contract extras beyond the PRD: `set_project_status`, `admin_withdraw`, `get_owner`. Vault `remaining_idr` = monthly × tenor − paid.

## Status checklist
- [x] Step 0: tooling, accounts, repo skeleton
- [x] Step 1: contracts written (13 unit tests), deployed and initialized
- [x] Step 2: web Phase 1 (auth, landing, project, investor, buyer, schedule, pay, simulator, admin)
- [x] Step 3: Phase 2 (360° tour, investor/buyer agents, marketing agents, face check, admin designs/rooms)
- [x] Step 4 infra: Supabase project `residentstart` (ref ghxdpemqzaostfewgvis, ap-southeast-1) + bucket `uploads`; Vercel project `residentstart` (team traces-fund) with 28 env vars; Cloudflare A `@` → 76.76.21.21 and CNAME `www` → cname.vercel-dns.com (DNS only)
- [ ] Step 4 deploy: Vercel deploy must come from a clean `git archive` export (commit author is not a Vercel team member → BLOCKED otherwise). See "Deploy" below.
- [x] Step 5 QA local: `scripts/e2e.ts` 72/72 pass; unit tests 14/14; bundle secret scan clean
- [ ] Step 5 QA production: run e2e against https://residentstart.biz.id, then reseed + create project on-chain for a clean demo
- [x] Step 6 docs: README, LICENSE, docs/phase1-demo.md, docs/submission.md, docs/near-notes.md, AGENTS.md
- [ ] Pending from owner: LLM key (Anthropic or OpenAI) → set LLM_PROVIDER + key on Vercel; make repo public at submission; confirm mainnet prize wallet

## Deploy
```
S=<scratchpad>; D=$S/deploy; rm -rf $D; mkdir -p $D; git archive HEAD | tar -x -C $D
mkdir -p $D/.vercel && cp .vercel/project.json .vercelignore $D/ (project.json into $D/.vercel)
cd $D && npx vercel@48.10.2 deploy --prod --yes --token "$(cat $S/vercel_token)"
```

## Fresh demo reset
`cd web && npx tsx --env-file=.env scripts/near-topup.ts 40 && npm run seed` → admin → DAO → Create project on-chain.
(e2e spends ~45 NEAR of investor funds into the dao contract; top-up recycles it via `admin_withdraw`.)

## Lessons / gotchas
- rpc.testnet.near.org is deprecated (-429). Use https://test.rpc.fastnear.com.
- near-api-js default send waits for finality (~20 s). lib/near-tx.ts uses EXECUTED_OPTIMISTIC + local nonce tracker (~4 s, no InvalidNonce).
- Vercel blocks Next.js < patched versions; we run next 15.5.29.
- Agent history ordering: assistant rows get createdAt +1 ms.

## Secrets: where they live (never in git)
- `web/.env.local` (chmod 600) holds the NEAR keys, generated from `~/.near-credentials`.
- The GitHub PAT is in the session scratchpad only. Push with `git -c http.extraHeader="Authorization: Basic <b64 x-access-token:PAT>" push`.
- Vercel/Supabase/Cloudflare/Anthropic tokens: pending from the owner. They go to Vercel env vars and `web/.env.local`.

## PRD-2 revision (2026-11-13) — done
- Source: `docs/PRD-2.md` + `handoff-2/` (assets copied to `web/public/{projects,hero,tours}`, `docs/credits.md`, `docs/build_walkthrough.py`).
- Data: migration `20261113080000_prd2_portal` (project columns, `tour_sets`, `blog_posts`, `testimonials`; dropped `designs`/`rooms`). Seed = 5 projects, 1 tour set, 6 posts (`web/content/blog`), 3 testimonials; creates Bintaro + Depok on-chain.
- Other-project photos: generated from the Cilandak show-unit set by `web/scripts/build-project-photos.mjs` (labelled show-unit reference). Replace with real photos under the same names when available.
- Pages: `/`, `/buy`, `/buy/[slug]`, `/buy/[slug]/tour`, `/invest`, `/invest/[slug]`, `/invest/[slug]/tour`, `/blog`, `/blog/[slug]`, login role tabs, legacy `/project/*` 301s, investor project selector, buyer `?project=`, admin Projects list/edit + Blog tab + DAO project selector.
- QA: unit 22/22; API e2e 108/108 (local, on-chain); headless-Chromium UI checks 33/33 (tour walk 13 stops via arrows, minimap/floor tab, L2/L3 filters, lightbox, login tab, mobile sticky bar) at 1366 px and 360 px; no horizontal overflow on any public page at 360 px.
- UI test tooling: Playwright 1.56 + chromium headless shell installed under ~/.cache/ms-playwright (via PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64); scripts in the session scratchpad (`pw/ui.mjs`, `pw/shots.mjs`).
- Production (https://residentstart.biz.id, deploy residentstart-l9aoqpjep): API e2e 108/108 on-chain; browser UI 33/33 (desktop + 360 px). Demo state reset afterwards (fresh seed; Bintaro + Depok on-chain, 0 shares sold).
