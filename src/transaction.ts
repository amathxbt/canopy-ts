import { signMessage } from "./signing.js";
import { CurveType, TransactionSignature, TransactionParams } from "./types.js";
import { getSignBytesProtobuf, encodeMessage } from "./protobuf.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Plugin transaction format using msgTypeUrl/msgBytes.
 * This is the format accepted by the Canopy RPC /v1/tx endpoint
 * for plugin-defined message types.
 */
export interface PluginTransaction {
  type: string;
  msgTypeUrl: string;
  msgBytes: string; // hex-encoded protobuf
  signature: TransactionSignature;
  time: number;
  createdHeight: number;
  fee: number;
  memo: string;
  networkID: number;
  chainID: number;
}

/**
 * Build, sign, and return a plugin transaction ready for /v1/tx submission.
 */
export function createAndSignTransaction(
  params: TransactionParams,
  privateKeyHex: string,
  publicKeyHex: string,
  curveType: CurveType = CurveType.BLS12381
): PluginTransaction {
  const txTime = Date.now() * 1000; // Unix microseconds

  // Get protobuf sign bytes (unsigned tx)
  const signBytes = getSignBytesProtobuf({
    type: params.type,
    msg: params.msg,
    time: txTime,
    createdHeight: params.height,
    fee: params.fee,
    memo: params.memo,
    networkID: params.networkID,
    chainID: params.chainID,
  });

  // Sign
  const signatureHex = signMessage(signBytes, privateKeyHex, curveType);

  // Encode message for msgTypeUrl/msgBytes format
  const { typeUrl, msgBytes } = encodeMessage(params.type, params.msg);

  return {
    type: params.type,
    msgTypeUrl: typeUrl,
    msgBytes: bytesToHex(msgBytes),
    signature: {
      publicKey: publicKeyHex,
      signature: signatureHex,
    },
    time: txTime,
    createdHeight: params.height,
    fee: params.fee,
    memo: params.memo || "",
    networkID: params.networkID,
    chainID: params.chainID,
  };
}
