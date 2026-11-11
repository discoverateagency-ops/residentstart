// Low-level NEAR transaction sender with a local nonce tracker (shared by lib/near.ts and scripts/).
// Why: back-to-back txs from one signer can read a stale access-key nonce from the RPC and fail with InvalidNonce.
import { InMemorySigner, KeyPair, keyStores, providers, transactions, utils } from "near-api-js";
import type { KeyPairString } from "@near-js/crypto";

const lastNonce = new Map<string, bigint>();

export type TxOutcome = Awaited<ReturnType<providers.JsonRpcProvider["sendTransactionUntil"]>>;

export async function sendTx(opts: {
  provider: providers.JsonRpcProvider;
  network: string;
  accountId: string;
  privateKey: string;
  receiverId: string;
  actions: transactions.Action[];
}): Promise<TxOutcome> {
  const { provider, network, accountId, privateKey, receiverId, actions } = opts;
  const keyPair = KeyPair.fromString(privateKey as KeyPairString);
  const publicKey = keyPair.getPublicKey();
  const ks = new keyStores.InMemoryKeyStore();
  await ks.setKey(network, accountId, keyPair);
  const signer = new InMemorySigner(ks);
  const cacheKey = `${accountId}:${publicKey.toString()}`;

  let forced: bigint | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const ak = (await provider.query({ request_type: "view_access_key", finality: "optimistic", account_id: accountId, public_key: publicKey.toString() })) as unknown as { nonce: number | string };
    const fetched = BigInt(ak.nonce);
    const base = [fetched, lastNonce.get(cacheKey) ?? BigInt(0), forced ?? BigInt(0)].reduce((a, b) => (b > a ? b : a));
    const nonce = base + BigInt(1);
    const block = await provider.block({ finality: "final" });
    const blockHash = utils.serialize.base_decode(block.header.hash);
    const tx = transactions.createTransaction(accountId, publicKey, receiverId, nonce, actions, blockHash);
    const [, signed] = await transactions.signTransaction(tx, signer, accountId, network);
    try {
      const out = await provider.sendTransactionUntil(signed, "EXECUTED_OPTIMISTIC");
      lastNonce.set(cacheKey, nonce);
      return out;
    } catch (e) {
      const err = e as { type?: string; ak_nonce?: number | string; message?: string };
      if (err?.type === "InvalidNonce" || /InvalidNonce/.test(err?.message || "")) {
        if (err.ak_nonce !== undefined) forced = BigInt(err.ak_nonce);
        await new Promise((r) => setTimeout(r, 300 + attempt * 400));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Transaction failed: nonce conflict after retries");
}
