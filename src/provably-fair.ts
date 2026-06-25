/**
 * Provably fair verification utilities for canopy casino games.
 *
 * These functions allow clients to independently verify game outcomes
 * after the server seed has been revealed (on seed rotation or cashout).
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Verifies that a server seed matches its previously committed hash.
 */
export function verifyCommitment(serverSeed: string, hash: string): boolean {
  const computed = bytesToHex(sha256(new TextEncoder().encode(serverSeed)));
  return computed === hash;
}

/**
 * Computes the raw HMAC-SHA256 bytes for the given seed pair and nonce.
 * This is the core primitive — game-specific mappers interpret the output.
 */
export function computeHMAC(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Uint8Array {
  const message = `${clientSeed}:${nonce}`;
  return hmac(
    sha256,
    new TextEncoder().encode(serverSeed),
    new TextEncoder().encode(message)
  );
}

/**
 * Computes a dice roll in the range [0, 9999] from the given seeds and nonce.
 * Maps the first 4 bytes of HMAC-SHA256 to a uint32, then takes modulo 10000.
 */
export function computeDiceRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const h = computeHMAC(serverSeed, clientSeed, nonce);
  const view = new DataView(h.buffer, h.byteOffset, h.byteLength);
  const raw = view.getUint32(0, false); // big-endian
  return raw % 10000;
}

/**
 * Verifies that a dice roll matches the expected value for the given seeds.
 */
export function verifyDiceRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedRoll: number
): boolean {
  return computeDiceRoll(serverSeed, clientSeed, nonce) === expectedRoll;
}

/**
 * Computes the crash point for a rocket round.
 * Uses HMAC-SHA256(serverSeed, clientSeed:nonce) with 3% house edge.
 * Result is clamped to [1.01, 100.0].
 *
 * @param clientSeed - Player-supplied seed that contributes entropy to the outcome.
 *   Must not be empty: passing "" removes the client's ability to independently
 *   influence and verify the result, breaking the provably-fair guarantee.
 */
export function computeCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  if (!clientSeed) {
    throw new Error("clientSeed must not be empty — an empty client seed removes player entropy from the provably-fair computation");
  }
  const h = computeHMAC(serverSeed, clientSeed, nonce);
  const hex8 = bytesToHex(h).slice(0, 8);
  const result = parseInt(hex8, 16) >>> 0; // unsigned 32-bit

  if (result % 33 === 0) return 1.0;

  const houseEdge = 0.03;
  const e = 0x100000000;
  let crashPoint = ((1 - houseEdge) * e) / (result + 1);
  crashPoint = Math.floor(crashPoint * 100) / 100;
  if (crashPoint < 1.01) crashPoint = 1.01;
  if (crashPoint > 100.0) crashPoint = 100.0;
  return crashPoint;
}