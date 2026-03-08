import type { Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User.js";
import type { AuthRequest } from "../middleware/auth.js";
import type { CreateUserInput } from "../types/user.js";
import { isValidSolanaAddress } from "../services/solanaService.js";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendError,
} from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

// Types
interface RefreshTokenPayload extends JwtPayload {
  id: string;
}

// Helpers
const generateAccessToken = (id: string, walletAddress: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return jwt.sign({ id, walletAddress }, secret, { expiresIn: "2h" });
};

const generateRefreshToken = (id: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign({ id }, secret, { expiresIn: "30d" });
};

// Connect Wallet
export const connectWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress: string };

    if (!walletAddress) {
      return sendBadRequest(res, "Wallet address is required");
    }

    if (!isValidSolanaAddress(walletAddress)) {
      return sendBadRequest(res, "Invalid Solana wallet address");
    }

    let user = await User.findOne({ walletAddress });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        walletAddress,
        username: `user_${walletAddress.slice(0, 8).toLowerCase()}`,
        avatarUrl: "",
        bio: "",
      });
      isNewUser = true;
      logger.info(`New user created: ${walletAddress}`);
    } else {
      logger.info(`Existing user connected: ${walletAddress}`);
    }

    const accessToken = generateAccessToken(
      user._id.toString(),
      user.walletAddress,
    );
    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = refreshToken;
    await user.save();

    return isNewUser
      ? sendCreated(res, {
          message: "Account created successfully",
          data: {
            isNewUser,
            accessToken,
            refreshToken,
            user: user.toPublicProfile(),
          },
        })
      : sendSuccess(res, {
          message: "Wallet connected successfully",
          data: {
            isNewUser,
            accessToken,
            refreshToken,
            user: user.toPublicProfile(),
          },
        });
  } catch (err) {
    logger.error("connectWallet error", { error: (err as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Setup Profile
export const setupProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName, avatarUrl, bio } =
      req.body as CreateUserInput;

    if (!username || !displayName || !avatarUrl || !bio) {
      return sendBadRequest(
        res,
        "username, displayName, avatarUrl and bio are required",
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { username, displayName, avatarUrl, bio },
      { new: true, runValidators: true },
    );

    if (!user) return sendNotFound(res, "User not found");

    logger.info(`Profile setup complete: ${user.walletAddress}`);

    return sendSuccess(res, {
      message: "Profile updated successfully",
      data: { user: user.toPublicProfile() },
    });
  } catch (err) {
    logger.error("setupProfile error", { error: (err as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Refresh Token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) return sendBadRequest(res, "Refresh token is required");

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");

    const decoded = jwt.verify(refreshToken, secret) as RefreshTokenPayload;

    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      return sendUnauthorized(res, "Invalid refresh token");
    }

    const newAccessToken = generateAccessToken(
      user._id.toString(),
      user.walletAddress,
    );
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return sendSuccess(res, {
      message: "Token refreshed successfully",
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return sendUnauthorized(
        res,
        "Refresh token expired, please reconnect wallet",
      );
    }
    return sendUnauthorized(res, "Invalid refresh token");
  }
};

// Logout
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user?.id, { refreshToken: null });
    logger.info(`User logged out: ${req.user?.walletAddress}`);
    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (err) {
    logger.error("logout error", { error: (err as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Get Current User
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return sendNotFound(res, "User not found");
    return sendSuccess(res, { data: { user: user.toPublicProfile() } });
  } catch (err) {
    logger.error("getMe error", { error: (err as Error).message });
    return sendError(res, { message: "Server error" });
  }
};
