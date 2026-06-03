import { bytesToHex } from "@noble/hashes/utils.js";
import { deriveAddress } from "./address.js";
import { decryptEntry, importFromGoKeystore } from "./keystore.js";
import { detectPublicKeyCurve } from "./curve-detection.js";
import { createAndSignTransaction } from "./transaction.js";
import type {
  CurveType,
  TransactionParams,
  WalletAccount,
} from "./types.js";
import type { PluginTransaction } from "./transaction.js";
import type { GoKeystoreEntry, ParsedKeystoreEntry } from "./keystore.js";

/**
 * WalletManager — high-level wallet operations for Canopy blockchain transactions
 *
 * Handles:
 * - Account loading from Go keystore JSON
 * - Encrypted private key decryption with password
 * - Transaction building and signing
 * - Address derivation and validation
 */
export class WalletManager {
  private accounts: Map<string, WalletAccount> = new Map();
  private keystoreData: Map<string, ParsedKeystoreEntry> = new Map();

  /**
   * Load wallet accounts from Go keystore JSON format
   * @param keystoreJson - Raw keystore JSON object with entries array
   */
  loadKeystoreJson(keystoreJson: { entries: GoKeystoreEntry[] }): void {
    if (!keystoreJson.entries || !Array.isArray(keystoreJson.entries)) {
      throw new Error("Invalid keystore format: missing entries array");
    }

    keystoreJson.entries.forEach((entry) => {
      const parsed = importFromGoKeystore(entry);
      const address = entry.keyAddress.toLowerCase();

      this.keystoreData.set(address, parsed);
      this.accounts.set(address, {
        address,
        publicKey: parsed.publicKey,
        curveType: parsed.curveType,
      });
    });
  }

  /**
   * Get list of available account addresses
   */
  getAccounts(): string[] {
    return Array.from(this.accounts.keys());
  }

  /**
   * Get account details by address
   */
  getAccount(address: string): WalletAccount | undefined {
    return this.accounts.get(address.toLowerCase());
  }

  /**
   * Decrypt and unlock an account's private key
   * @param address - Account address
   * @param password - Wallet password
   * @returns Hex-encoded private key
   */
  async unlockAccount(address: string, password: string): Promise<string> {
    const addr = address.toLowerCase();
    const keystoreEntry = this.keystoreData.get(addr);

    if (!keystoreEntry) {
      throw new Error(`Account not found: ${address}`);
    }

    try {
      const privateKeyHex = await decryptEntry(keystoreEntry, password);
      return privateKeyHex;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to unlock account ${address}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Build and sign a transaction for an account
   * @param address - Account address to sign with
   * @param params - Transaction parameters
   * @param privateKeyHex - Hex-encoded private key (from unlockAccount)
   * @returns Signed PluginTransaction ready for /v1/tx submission
   */
  buildTransaction(
    address: string,
    params: TransactionParams,
    privateKeyHex: string
  ): PluginTransaction {
    const addr = address.toLowerCase();
    const account = this.accounts.get(addr);

    if (!account) {
      throw new Error(`Account not found: ${address}`);
    }

    return createAndSignTransaction(
      params,
      privateKeyHex,
      account.publicKey,
      account.curveType
    );
  }

  /**
   * All-in-one: unlock account and build signed transaction
   * Combines unlockAccount + buildTransaction
   * @param address - Account address
   * @param password - Wallet password
   * @param params - Transaction parameters
   * @returns Signed PluginTransaction
   */
  async signTransaction(
    address: string,
    password: string,
    params: TransactionParams
  ): Promise<PluginTransaction> {
    const privateKeyHex = await this.unlockAccount(address, password);
    return this.buildTransaction(address, params, privateKeyHex);
  }

  /**
   * Validate address format and check if account exists
   */
  isValidAccount(address: string): boolean {
    return this.accounts.has(address.toLowerCase());
  }

  /**
   * Get account's curve type
   */
  getCurveType(address: string): CurveType | undefined {
    const account = this.accounts.get(address.toLowerCase());
    return account?.curveType;
  }

  /**
   * Clear all loaded accounts (secure cleanup)
   */
  clear(): void {
    this.accounts.clear();
    this.keystoreData.clear();
  }
}
