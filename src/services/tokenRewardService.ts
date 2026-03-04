import {
  ACTIVITY_CONFIG,
  type ActivityType,
} from "../config/activityConfig.js";
import {
  getTreasuryKeypair,
  getWalkTokenMint,
  getSolanaConnection,
} from "../config/solana.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import logger from "../utils/logger.js";

const SEEKER_MULTIPLIER = 1.5;
const BASE_TOKENS_PER_KM = 10;
const TOKEN_DECIMALS = 6;

export function calculateTokenReward(
  activityType: ActivityType,
  distanceMeters: number,
  durationSeconds: number,
  isSeeker: boolean,
): {
  tokens: number;
  seekerMultiplier: number;
  activityMultiplier: number;
  breakdown: string;
} {
  const config = ACTIVITY_CONFIG[activityType];

  // Check minimums
  if (durationSeconds < config.minDurationSeconds) {
    return {
      tokens: 0,
      seekerMultiplier: 1,
      activityMultiplier: config.tokenMultiplier,
      breakdown: "Did not meet minimum duration",
    };
  }

  if (distanceMeters < config.minDistanceMeters) {
    return {
      tokens: 0,
      seekerMultiplier: 1,
      activityMultiplier: config.tokenMultiplier,
      breakdown: "Did not meet minimum distance",
    };
  }

  const distanceKm = distanceMeters / 1000;
  const baseTokens = distanceKm * BASE_TOKENS_PER_KM;
  const activityMultiplier = config.tokenMultiplier;
  const seekerMultiplier = isSeeker ? SEEKER_MULTIPLIER : 1.0;

  const tokens = Math.floor(baseTokens * activityMultiplier * seekerMultiplier);

  return {
    tokens,
    seekerMultiplier,
    activityMultiplier,
    breakdown: `${distanceKm.toFixed(2)}km × ${BASE_TOKENS_PER_KM} × ${activityMultiplier} activity × ${seekerMultiplier} seeker = ${tokens} tokens`,
  };
}

export async function mintWalkTokens(
  walletAddress: string,
  amount: number,
): Promise<string | null> {
  try {
    const connection = getSolanaConnection();
    const treasury = getTreasuryKeypair();
    const mint = getWalkTokenMint();

    if (!treasury || !mint) {
      logger.warn("Solana not configured — skipping token mint");
      return null;
    }

    const userPublicKey = new PublicKey(walletAddress);

    // Get or create user's token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      mint,
      userPublicKey,
    );

    // Mint tokens (amount * 10^decimals)
    const mintAmount = BigInt(amount) * BigInt(10 ** TOKEN_DECIMALS);

    const signature = await mintTo(
      connection,
      treasury,
      mint,
      tokenAccount.address,
      treasury,
      mintAmount,
    );

    logger.info(
      `Minted ${amount} tokens to ${walletAddress} — tx: ${signature}`,
    );
    return signature;
  } catch (error) {
    logger.error("Token mint failed:", error);
    return null;
  }
}

export async function checkSeekerStatus(
  walletAddress: string,
): Promise<boolean> {
  try {
    // TODO: Check for Seeker Genesis Token NFT in wallet
    // For now return false — implement when Seeker SDK is available
    // const connection = getSolanaConnection()
    // const nfts = await fetchNFTs(walletAddress)
    // return nfts.some(nft => nft.collection === SEEKER_GENESIS_COLLECTION)
    return false;
  } catch {
    return false;
  }
}
