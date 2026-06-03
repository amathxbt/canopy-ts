import { importFromGoKeystore, GoKeystoreEntry, ParsedKeystoreEntry } from "./keystore.js";

interface KeystoreResponse {
  addressMap: Record<string, GoKeystoreEntry>;
  nicknameMap: Record<string, string>;
}

/**
 * Fetch all keystore entries from the Canopy admin RPC.
 * Calls GET /v1/admin/keystore (default port 50003).
 *
 * @param baseUrl - Optional origin (e.g. "http://localhost:50003"). Defaults to ""
 *                  which works when requests are proxied by the dev server.
 */
export async function fetchKeystore(baseUrl = ""): Promise<ParsedKeystoreEntry[]> {
  const res = await fetch(`${baseUrl}/v1/admin/keystore`);
  if (!res.ok) {
    throw new Error(`Failed to fetch keystore: ${res.status} ${res.statusText}`);
  }
  const data: KeystoreResponse = await res.json();
  if (!data.addressMap) return [];

  return Object.entries(data.addressMap).map(([address, entry]) => {
    const fullEntry: GoKeystoreEntry = { ...entry, keyAddress: entry.keyAddress ?? address };
    return importFromGoKeystore(fullEntry);
  });
}

/**
 * Fetch the current block height from the Canopy public RPC.
 * Calls POST /v1/query/height (default port 50002).
 *
 * @param baseUrl - Optional origin (e.g. "http://localhost:50002"). Defaults to ""
 *                  which works when requests are proxied by the dev server.
 */
export async function fetchHeight(baseUrl = ""): Promise<number> {
  const res = await fetch(`${baseUrl}/v1/query/height`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch height: ${res.status} ${res.statusText}`);
  }
  const data: { height: number } = await res.json();
  return data.height;
}

/**
 * Submit a signed transaction to the Canopy public RPC.
 * Calls POST /v1/tx (default port 50002).
 *
 * @param baseUrl - Optional origin (e.g. "http://localhost:50002"). Defaults to ""
 *                  which works when requests are proxied by the dev server.
 */
export async function submitTx(baseUrl = "", tx: object): Promise<void> {
  const res = await fetch(`${baseUrl}/v1/tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Transaction failed: ${text}`);
  }
}
