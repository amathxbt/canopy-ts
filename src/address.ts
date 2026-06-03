import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";
import { CurveType, KEY_SIZES } from "./types.js";

export function deriveAddress(
  publicKeyHex: string,
  curveType: CurveType
): string {
  const pubKeyBytes = hexToBytes(publicKeyHex);

  switch (curveType) {
    case CurveType.ED25519: {
      const hash = sha256(pubKeyBytes);
      return bytesToHex(hash.slice(0, KEY_SIZES.ADDRESS));
    }
    case CurveType.BLS12381: {
      const hash = sha256(pubKeyBytes);
      return bytesToHex(hash.slice(0, KEY_SIZES.ADDRESS));
    }
    case CurveType.SECP256K1: {
      const sha = sha256(pubKeyBytes);
      const rip = ripemd160(sha);
      return bytesToHex(rip);
    }
    case CurveType.ETHSECP256K1: {
      let keyBytes = pubKeyBytes;
      if (pubKeyBytes.length === 65 && pubKeyBytes[0] === 0x04) {
        keyBytes = pubKeyBytes.slice(1);
      }
      const keccak = keccak_256(keyBytes);
      return bytesToHex(keccak.slice(12, 32));
    }
    default:
      throw new Error(`Unsupported curve type: ${curveType}`);
  }
}

export function isValidAddress(address: string): boolean {
  return /^[0-9a-fA-F]{40}$/.test(address);
}
