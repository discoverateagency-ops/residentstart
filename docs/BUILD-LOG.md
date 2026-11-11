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
- [x] Step 0: tooling, accounts, repo skeleton (`prompts/`, `web/data`, `web/public/brand`, `web/public/tour-sample`, `docs/PRD.md`)
- [x] Step 1: contracts written, 13 unit tests pass, deployed and initialized
- [ ] Step 2: web Phase 1 (scaffold done: Next 15.5.6 + Tailwind 4 in `web/`; next come Prisma schema, auth, seed, pages)
- [ ] Step 3: Phase 2 (tour, agents, marketing, face check, admin designs)
- [ ] Step 4: Supabase + Vercel + Cloudflare deploy (needs tokens; see below)
- [ ] Step 5: QA (unit + `web/scripts/e2e.ts`, T1–T18, Q1–Q12)
- [ ] Step 6: README, docs/submission.md, LICENSE, repo public

## Secrets: where they live (never in git)
- `web/.env.local` (chmod 600) holds the NEAR keys, generated from `~/.near-credentials`.
- The GitHub PAT is in the session scratchpad only. Push with `git -c http.extraHeader="Authorization: Basic <b64 x-access-token:PAT>" push`.
- Vercel/Supabase/Cloudflare/Anthropic tokens: pending from the owner. They go to Vercel env vars and `web/.env.local`.
