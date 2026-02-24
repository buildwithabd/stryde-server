import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import type { AuthRequest } from "../middleware/auth.js";
import type { CreateUserInput } from "../types/user.js";
import { isValidSolanaAddress } from "../services/solanaService.js";

// Helpers
const generateAccessToken = (id: string, walletAddress: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return jwt.sign({ id, walletAddress }, secret, { expiresIn: "15m" });
};

const generateRefreshToken = (id: string) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign({ id }, secret, { expiresIn: "7d" });
};

// Connect Wallet
export const connectWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress: string };

    if (!walletAddress) {
      res
        .status(400)
        .json({ success: false, message: "Wallet address is required" });
      return;
    }

    // Validate it's a real Solana address before doing anything
    if (!isValidSolanaAddress(walletAddress)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid Solana wallet address" });
      return;
    }

    let user = await User.findOne({ walletAddress });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        walletAddress,
        username: `user_${walletAddress.slice(0, 8).toLowerCase()}`,
        displayName: "New User",
        avatarUrl: "",
        bio: "",
      });
      isNewUser = true;
    }

    const accessToken = generateAccessToken(
      user._id.toString(),
      user.walletAddress,
    );
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    await user.save();

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      isNewUser,
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Complete Profile
export const setupProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName, avatarUrl, bio } =
      req.body as CreateUserInput;

    if (!username || !displayName || !avatarUrl || !bio) {
      res.status(400).json({
        success: false,
        message: "username, displayName, avatarUrl and bio are required",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { username, displayName, avatarUrl, bio },
      { new: true, runValidators: true },
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Refresh Token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");

    const decoded = jwt.verify(refreshToken, secret) as { id: string };

    // Find user and verify the refresh token matches what we stored
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const newAccessToken = generateAccessToken(
      user._id.toString(),
      user.walletAddress,
    );
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Refresh token expired, please reconnect wallet",
      });
      return;
    }
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

// Logout
// POST /api/auth/logout
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user?.id, { refreshToken: null });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Current User
// GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
