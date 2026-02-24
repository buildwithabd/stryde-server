import { PublicKey } from "@solana/web3.js";
import {
  getSolanaConnection,
  getTreasuryKeypair,
  getWalkTokenMint,
} from "../config/solana.js";
import logger from "../utils/logger.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export const mintWalkTokens = async (
  toWalletAddress: string,
  amount: number,
) => {
  const connection = getSolanaConnection();
  const treasury = getTreasuryKeypair();
  const mint = getWalkTokenMint();

  if (!treasury || !mint) {
    logger.warn("Solana not fully configured - simulating token mint");
    return { simulated: true, amount, toWallet: toWalletAddress };
  }

  try {
    const toPubKey = new PublicKey(toWalletAddress);
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      mint,
      toPubKey,
    );

    const tokenAmount = Math.floor(amount);
    const signature = await mintTo(
      connection,
      treasury,
      mint,
      toTokenAccount.address,
      treasury,
      tokenAmount,
    );

    logger.info("Tokens minted", {
      to: toWalletAddress,
      amount: tokenAmount,
      sig: signature,
    });
    return {
      signature,
      amount: tokenAmount,
      tokenAccount: toTokenAccount.address.toBase58(),
    };
  } catch (err) {
    logger.error("Token mint failed", {
      error: (err as Error).message,
      toWallet: toWalletAddress,
    });
    throw new Error(`Token minting failed: ${(err as Error).message}`);
  }
};
