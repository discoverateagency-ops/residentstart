# NEAR notes (what this repo actually uses)

- **Network:** testnet. RPC `https://test.rpc.fastnear.com` (rpc.testnet.near.org is deprecated and rate-limited). Explorer `https://testnet.nearblocks.io/txns/<hash>` and `/address/<account>`.
- **Contracts:** Rust, near-sdk 5.x, built with `cargo near build non-reproducible-wasm` (cargo-near 0.23, stable rustc). Deploy + init:
  `near contract deploy dao.residentstart.testnet use-file contracts/dao/target/near/residentstart_dao.wasm with-init-call new json-args '{"owner_id":"residentstart.testnet"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send`
- **Accounts (near-cli-rs 0.31):** `near account create-account sponsor-by-faucet-service <name>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create` (10 NEAR); sub-accounts with `create-account fund-myself <sub>.<parent> '5 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as <parent> network-config testnet sign-with-legacy-keychain send`.
- **Server signing (near-api-js 5):** `web/lib/near-tx.ts` builds and signs transactions from env keys with a local nonce tracker and sends with `wait_until=EXECUTED_OPTIMISTIC` (~4 s round trip, vs ~20 s waiting for finality). Payable `invest` needs a full-access key (function-call keys cannot attach deposits) — acceptable for zero-value testnet demo accounts only.
- **Views:** `query` / `call_function` with `finality: optimistic`.
