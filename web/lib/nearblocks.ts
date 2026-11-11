// Client-safe URL helpers (no secrets).
export const NEARBLOCKS = process.env.NEXT_PUBLIC_NEARBLOCKS_BASE || "https://testnet.nearblocks.io";
export const DAO_CONTRACT = process.env.NEXT_PUBLIC_DAO_CONTRACT || "dao.residentstart.testnet";
export const VAULT_CONTRACT = process.env.NEXT_PUBLIC_VAULT_CONTRACT || "vault.residentstart.testnet";
export const txUrl = (hash: string) => `${NEARBLOCKS}/txns/${hash}`;
export const accountUrl = (acc: string) => `${NEARBLOCKS}/address/${acc}`;
