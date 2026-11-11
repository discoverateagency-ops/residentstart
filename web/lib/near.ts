import "server-only";
// The ONLY module that talks to NEAR. Keys come from server env; nothing here is imported by client components.
import { KeyPair, Near, keyStores, providers, transactions } from "near-api-js";
import type { KeyPairString } from "@near-js/crypto";
import { sendTx } from "./near-tx";

const NETWORK = process.env.NEAR_NETWORK || "testnet";
const RPC = process.env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";
const NEARBLOCKS = process.env.NEARBLOCKS_BASE || "https://testnet.nearblocks.io";
export const DAO = process.env.NEAR_DAO_CONTRACT || "dao.residentstart.testnet";
export const VAULT = process.env.NEAR_VAULT_CONTRACT || "vault.residentstart.testnet";

const GAS = BigInt("100000000000000"); // 100 Tgas
export const YOCTO_PER_NEAR = BigInt("1000000000000000000000000");

export type CallResult<T = unknown> = { result: T; txHash: string; nearblocksUrl: string; latencyMs: number };

/** Map of accountId -> private key, from env NEAR_<NAME>_ACCOUNT / NEAR_<NAME>_KEY. */
function signerKeys(): Map<string, string> {
  const m = new Map<string, string>();
  for (const name of ["ADMIN", "INVESTOR1", "INVESTOR2"]) {
    const acc = process.env[`NEAR_${name}_ACCOUNT`];
    const key = process.env[`NEAR_${name}_KEY`];
    if (acc && key) m.set(acc, key);
  }
  return m;
}

export function adminAccountId(): string {
  const a = process.env.NEAR_ADMIN_ACCOUNT;
  if (!a) throw new Error("NEAR_ADMIN_ACCOUNT is not configured");
  return a;
}

export function hasSigner(accountId: string | null | undefined): boolean {
  return !!accountId && signerKeys().has(accountId);
}

let nearPromise: Promise<Near> | null = null;
async function getNear(): Promise<Near> {
  if (!nearPromise) {
    nearPromise = (async () => {
      const keyStore = new keyStores.InMemoryKeyStore();
      for (const [acc, key] of signerKeys()) {
        await keyStore.setKey(NETWORK, acc, KeyPair.fromString(key as KeyPairString));
      }
      return new Near({ networkId: NETWORK, nodeUrl: RPC, keyStore });
    })();
  }
  return nearPromise;
}

/** Pulls the human-readable panic message out of a near-api-js error. */
export function nearErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.match(/Smart contract panicked: (.*?)(?:"|\n|$)/) || raw.match(/panicked at .*?:\s*(.*?)(?:"|\n|$)/);
  if (m) return m[1].trim();
  if (/NotEnoughBalance|LackBalanceForState/.test(raw)) return "The account does not have enough NEAR for this transaction";
  return raw.length > 300 ? raw.slice(0, 300) + "…" : raw;
}

async function call<T>(signer: string, contractId: string, methodName: string, args: object, depositYocto?: bigint): Promise<CallResult<T>> {
  const started = Date.now();
  const key = signerKeys().get(signer);
  if (!key) throw new Error(`No server key configured for ${signer}`);
  const near = await getNear();
  // Wait for EXECUTED_OPTIMISTIC (tx + all receipts executed) instead of full finality: a few seconds instead of ~20 s.
  const outcome = await sendTx({
    provider: near.connection.provider as providers.JsonRpcProvider,
    network: NETWORK,
    accountId: signer,
    privateKey: key,
    receiverId: contractId,
    actions: [transactions.functionCall(methodName, Buffer.from(JSON.stringify(args)), GAS, depositYocto ?? BigInt(0))],
  });
  const txHash = outcome.transaction.hash as string;
  const failure = findFailure(outcome);
  if (failure) {
    const err = new Error(`Smart contract panicked: ${failure}`) as Error & { txHash?: string };
    err.txHash = txHash;
    throw err;
  }
  const result = providers.getTransactionLastResult(outcome) as T;
  return { result, txHash, nearblocksUrl: `${NEARBLOCKS}/txns/${txHash}`, latencyMs: Date.now() - started };
}

/** Returns the panic message if the tx or any receipt failed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findFailure(outcome: any): string | null {
  const all = [outcome.transaction_outcome, ...(outcome.receipts_outcome || [])];
  for (const o of all) {
    const st = o?.outcome?.status;
    if (st && typeof st === "object" && "Failure" in st) {
      const f = st.Failure;
      const panic = f?.ActionError?.kind?.FunctionCallError?.ExecutionError;
      return panic ? String(panic).replace(/^Smart contract panicked: /, "") : JSON.stringify(f);
    }
  }
  const top = outcome.status;
  if (top && typeof top === "object" && "Failure" in top) return JSON.stringify(top.Failure);
  return null;
}

async function view<T>(contractId: string, methodName: string, args: object): Promise<T> {
  const near = await getNear();
  const provider = near.connection.provider as providers.JsonRpcProvider;
  const res = (await provider.query({
    request_type: "call_function",
    finality: "optimistic",
    account_id: contractId,
    method_name: methodName,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  })) as unknown as { result: number[] };
  return JSON.parse(Buffer.from(res.result).toString()) as T;
}

export const callDao = <T = unknown>(method: string, args: object, opts: { signer: string; depositYocto?: bigint }) =>
  call<T>(opts.signer, DAO, method, args, opts.depositYocto);
export const callVault = <T = unknown>(method: string, args: object, opts: { signer: string }) =>
  call<T>(opts.signer, VAULT, method, args);
export const viewDao = <T = unknown>(method: string, args: object) => view<T>(DAO, method, args);
export const viewVault = <T = unknown>(method: string, args: object) => view<T>(VAULT, method, args);

// ---------- typed views ----------
export type ChainProject = { name: string; share_price_yocto: string; total_shares: number; shares_sold: number; status: string };
export type ChainProposal = {
  id: string;
  project_id: string;
  kind: string;
  description: string;
  yes_weight: number;
  no_weight: number;
  status: string;
  voters: { account_id: string; yes: boolean; weight: number }[];
};
export type ChainLoan = {
  loan_id: string;
  principal_idr: string;
  tenor_months: number;
  monthly_idr: string;
  paid_periods: number;
  paid_total_idr: string;
  remaining_idr: string;
  status: string;
};
export type ChainRepayment = { period_index: number; amount_idr: string; receipt_hash: string; ts: number };

export const getChainProject = (projectId: string) => viewDao<ChainProject | null>("get_project", { project_id: projectId });
export const getChainHolding = (projectId: string, accountId: string) =>
  viewDao<number>("get_holding", { project_id: projectId, account_id: accountId });
export const getChainProposal = (proposalId: string) => viewDao<ChainProposal | null>("get_proposal", { proposal_id: proposalId });
export const getChainLoan = (loanId: string) => viewVault<ChainLoan | null>("get_loan", { loan_id: loanId });
export const getChainRepayments = (loanId: string) => viewVault<ChainRepayment[]>("get_repayments", { loan_id: loanId });

/** Available (unstaked, unlocked) balance in yocto. */
export async function accountBalanceYocto(accountId: string): Promise<bigint> {
  const near = await getNear();
  const provider = near.connection.provider as providers.JsonRpcProvider;
  const res = (await provider.query({ request_type: "view_account", finality: "optimistic", account_id: accountId })) as unknown as { amount: string; storage_usage: number };
  const storageCost = BigInt(res.storage_usage) * BigInt("10000000000000000000"); // 1e19 yocto per byte
  const amt = BigInt(res.amount);
  return amt > storageCost ? amt - storageCost : BigInt(0);
}

export function nearToYocto(amountNear: number): bigint {
  // amountNear is validated to at most 4 decimals by callers
  const scaled = Math.round(amountNear * 10000);
  return (BigInt(scaled) * YOCTO_PER_NEAR) / BigInt(10000);
}

export function yoctoToNear(yocto: string | bigint): number {
  const y = BigInt(yocto);
  return Number(y / BigInt("1000000000000000000")) / 1e6;
}

export const nearblocksTx = (h: string) => `${NEARBLOCKS}/txns/${h}`;
export const nearblocksAccount = (a: string) => `${NEARBLOCKS}/address/${a}`;
