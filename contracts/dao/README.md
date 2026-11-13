# dao contract

Build: `cargo near build non-reproducible-wasm` → `target/near/residentstart_dao.wasm` · Test: `cargo test`

Deploy + init (owner = admin signer):
```
near contract deploy dao.residentstart.testnet use-file target/near/residentstart_dao.wasm with-init-call new json-args '{"owner_id":"residentstart.testnet"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
```

Example calls:
```
near contract call-function as-transaction dao.residentstart.testnet create_project json-args '{"project_id":"p1","name":"Cilandak","share_price_yocto":"10000000000000000000000000","total_shares":200}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as residentstart.testnet network-config testnet sign-with-legacy-keychain send
near contract call-function as-transaction dao.residentstart.testnet invest json-args '{"project_id":"p1"}' prepaid-gas '30 Tgas' attached-deposit '10 NEAR' sign-as investor1.residentstart.testnet network-config testnet sign-with-legacy-keychain send
near contract call-function as-read-only dao.residentstart.testnet get_holding json-args '{"project_id":"p1","account_id":"investor1.residentstart.testnet"}' network-config testnet now
```
Methods: create_project, invest (payable), create_proposal, vote, finalize_proposal, set_project_status, admin_withdraw (owner; recycles testnet NEAR), views get_project / get_holding / get_proposal / get_owner. Events: NEP-297 `EVENT_JSON` (standard `residentstart`).
