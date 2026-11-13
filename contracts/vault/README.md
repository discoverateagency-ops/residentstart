# vault contract

Build: `cargo near build non-reproducible-wasm` → `target/near/residentstart_vault.wasm` · Test: `cargo test`

Deploy + init (owner = admin signer):
```
near contract deploy vault.residentstart.testnet use-file target/near/residentstart_vault.wasm with-init-call new json-args '{"owner_id":"residentstart.testnet"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
```

Example calls:
```
near contract call-function as-transaction vault.residentstart.testnet record_repayment json-args '{"loan_id":"L1","period_index":1,"amount_idr":"27662692","receipt_hash":"<64 hex>"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as residentstart.testnet network-config testnet sign-with-legacy-keychain send
near contract call-function as-read-only vault.residentstart.testnet get_loan json-args '{"loan_id":"L1"}' network-config testnet now
```
`remaining_idr` = monthly × tenor − sum of recorded amounts. Duplicate or out-of-range periods are rejected.
