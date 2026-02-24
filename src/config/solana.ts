import { Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import logger from "../utils/logger.js";

// Connection
export const getSolanaConnection = (): Connection => {
  return new Connection(
    process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"),
    "confirmed",
  );
};

// Treasury Keypair
export const getTreasuryKeypair = (): Keypair | null => {
  const key = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!key) {
    logger.warn(
      "SERVER_WALLET_PRIVATE_KEY not set - Solana features will be simulated",
    );
    return null;
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(key));
  } catch (err) {
    logger.error("Invalid SERVER_WALLET_PRIVATE_KEY format", {
      error: (err as Error).message,
    });
    return null;
  }
};

// Walk Token Mint
export const getWalkTokenMint = (): PublicKey | null => {
  const mint = process.env.WALK_TOKEN_MINT_ADDRESS;
  if (!mint) {
    logger.warn(
      "WALK_TOKEN_MINT_ADDRESS not set - token features will be simulated",
    );
    return null;
  }
  try {
    return new PublicKey(mint);
  } catch (err) {
    logger.error("Invalid WALK_TOKEN_MINT_ADDRESS", {
      error: (err as Error).message,
    });
    return null;
  }
};

// Helpers
export const isMainnet = (): boolean =>
  process.env.SOLANA_NETWORK === "mainnet-beta";

export const getExplorerUrl = (signature: string): string =>
  `https://explorer.solana.com/tx/${signature}${isMainnet() ? "" : "?cluster=devnet"}`;
