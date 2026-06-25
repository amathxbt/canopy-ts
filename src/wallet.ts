import { argon2i } from "@noble/hashes/argon2.js";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";

const ARGON2_PARAMS = {
  t: 3,
  m: 32 * 1024,
  p: 4,
};

const NONCE_LENGTH = 12;

function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password);
  const key = argon2i(passwordBytes, salt, {
    t: ARGON2_PARAMS.t,
    m: ARGON2_PARAMS.m,
    p: ARGON2_PARAMS.p,
    dkLen: 32,
  });
  return new Uint8Array(key);
}

export async function decryptPrivateKey(
  encryptedHex: string,
  saltHex: string,
  password: string
): Promise<Uint8Array> {
  const salt = hexToBytes(saltHex);
  const encryptedData = hexToBytes(encryptedHex);

  const derivedKey = deriveKey(password, salt);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    derivedKey as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // SECURITY NOTE: The nonce is derived deterministically from the same key material
  // (first 12 bytes of the Argon2 output). Because the same password+salt always
  // produces an identical key AND nonce pair, this does not provide nonce randomness.
  // Under AES-GCM, reusing (key, nonce) allows an attacker who obtains two ciphertexts
  // encrypted under the same password to recover the XOR of their plaintexts.
  // This is a protocol-level decision shared with the Go node — changing only this side
  // would break decryption of existing keystores. A follow-up should update both sides
  // to prepend a random nonce to the ciphertext and read it back on decrypt.
  // See: https://github.com/canopy-network/canopy/issues (track as security issue)
  const nonce = derivedKey.slice(0, NONCE_LENGTH);

  try {
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      cryptoKey,
      encryptedData.buffer as ArrayBuffer
    );
    return new Uint8Array(decryptedData);
  } catch (error) {
    if (error instanceof Error && error.name === "OperationError") {
      throw new Error("Wrong password. Please try again.");
    }
    throw error;
  }
}

export async function decryptPrivateKeyHex(
  encryptedHex: string,
  saltHex: string,
  password: string
): Promise<string> {
  const bytes = await decryptPrivateKey(encryptedHex, saltHex, password);
  return bytesToHex(bytes);
}
