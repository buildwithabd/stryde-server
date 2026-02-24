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

export const verifyTokenBurn = async (
  transactionSignature: string,
  walletAddress: string,
) => {
  const connection = getSolanaConnection();

  if (!connection) {
    logger.warn("Solana not configured - simulating burn verification");
    return { verified: true, simulated: true };
  }

  try {
    const txInfo = await connection.getTransaction(transactionSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo)
      return { verified: false, reason: "Transaction not found on chain" };
    if (txInfo.meta?.err)
      return { verified: false, reason: "Transaction failed on chain" };

    logger.info("Burn verified", {
      sig: transactionSignature,
      wallet: walletAddress,
    });
    return { verified: true, slot: txInfo.slot, blockTime: txInfo.blockTime };
  } catch (err) {
    logger.error("Burn verification failed", { error: (err as Error).message });
    return { verified: false, reason: (err as Error).message };
  }
};
