import { detectPublicKeyCurve } from "./curve-detection.js";
import { deriveAddress } from "./address.js";
import { decryptPrivateKeyHex } from "./wallet.js";
import type { CurveType } from "./types.js";

export interface GoKeystoreEntry {
  publicKey: string;
  salt: string;
  encrypted: string;
  keyAddress: string;
  keyNickname?: string;
}

export interface ParsedKeystoreEntry {
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  address: string;
  curveType: CurveType;
  nickname?: string;
}

export function importFromGoKeystore(
  entry: GoKeystoreEntry
): ParsedKeystoreEntry {
  const curveType = detectPublicKeyCurve(entry.publicKey);

  const derivedAddress = deriveAddress(entry.publicKey, curveType);
  if (derivedAddress.toLowerCase() !== entry.keyAddress.toLowerCase()) {
    console.warn(
      `Address mismatch: expected ${entry.keyAddress}, derived ${derivedAddress}`
    );
  }

  return {
    publicKey: entry.publicKey,
    encryptedPrivateKey: entry.encrypted,
    salt: entry.salt,
    address: entry.keyAddress,
    curveType,
    nickname: entry.keyNickname,
  };
}

export async function decryptEntry(
  entry: ParsedKeystoreEntry,
  password: string
): Promise<string> {
  return decryptPrivateKeyHex(entry.encryptedPrivateKey, entry.salt, password);
}
