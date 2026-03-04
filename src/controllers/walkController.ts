import mongoose from "mongoose";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import Walk from "../models/Walk.js";
import User from "../models/User.js";
import { validateWalk } from "../services/antiCheatService.js";
import {
  calculateTokenReward,
  mintWalkTokens,
  checkSeekerStatus,
} from "../services/tokenRewardService.js";
import { ACTIVITY_CONFIG } from "../config/activityConfig.js";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendError,
} from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

// Submit a completed walk
export const submitWalk = async (req: AuthRequest, res: Response) => {
  try {
    const {
      activityType = "walk",
      startTime,
      endTime,
      duration,
      distance,
      steps = 0,
      calories,
      coordinates,
      elevationGain = 0,
    } = req.body;

    const userId = req.user?.id;
    const walletAddress = req.user?.walletAddress;

    if (!userId || !walletAddress) {
      return sendError(res, { message: "Unauthorized", statusCode: 401 });
    }

    const walkUserId = new mongoose.Types.ObjectId(userId);

    // Validate required fields
    if (!startTime || !endTime || !duration || !distance || !coordinates) {
      return sendBadRequest(
        res,
        "startTime, endTime, duration, distance and coordinates are required",
      );
    }

    if (!ACTIVITY_CONFIG[activityType as keyof typeof ACTIVITY_CONFIG]) {
      return sendBadRequest(res, "Invalid activity type");
    }

    // Anti-cheat validation
    const validation = validateWalk(
      activityType,
      coordinates,
      duration,
      distance,
      steps,
    );

    // Update user spoofing flags if suspicious
    if (validation.spoofingScore > 40) {
      await User.findByIdAndUpdate(walkUserId, {
        $inc: { spoofingFlags: 1 },
      });
      logger.warn(
        `Spoofing detected for ${walletAddress} — score: ${validation.spoofingScore}`,
      );
    }

    if (!validation.valid) {
      // Save rejected walk for records
      await Walk.create({
        userId: walkUserId,
        walletAddress,
        activityType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        distance,
        steps,
        calories: calories ?? 0,
        coordinates,
        elevationGain,
        tokensEarned: 0,
        status: "rejected",
        rejectionReason: validation.reason ?? "Walk validation failed",
      });

      return sendBadRequest(res, validation.reason ?? "Walk validation failed");
    }

    // Check Seeker status
    const isSeeker = await checkSeekerStatus(walletAddress!);

    // Calculate token reward
    const reward = calculateTokenReward(
      activityType,
      distance,
      duration,
      isSeeker,
    );

    // Calculate calories if not provided
    const config =
      ACTIVITY_CONFIG[activityType as keyof typeof ACTIVITY_CONFIG];
    const calculatedCalories =
      calories ?? Math.round((distance / 1000) * config.caloriesPerKm);

    // Calculate pace
    const pace = distance > 0 ? duration / 60 / (distance / 1000) : 0; // min/km
    const averageSpeed = duration > 0 ? distance / 1000 / (duration / 3600) : 0; // km/h

    // Save walk
    const walk = await Walk.create({
      userId: walkUserId,
      walletAddress,
      activityType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      distance,
      steps,
      calories: calculatedCalories,
      pace,
      averageSpeed,
      elevationGain,
      coordinates,
      tokensEarned: reward.tokens,
      isSeeker,
      seekerMultiplier: reward.seekerMultiplier,
      status: reward.tokens > 0 ? "verified" : "verified",
    });

    // Mint tokens if earned
    let mintSignature: string | null = null;
    if (reward.tokens > 0) {
      await Walk.findByIdAndUpdate(walk._id, { status: "minting" });

      mintSignature = await mintWalkTokens(walletAddress!, reward.tokens);

      await Walk.findByIdAndUpdate(walk._id, {
        status: mintSignature ? "minted" : "verified",
        mintTxSignature: mintSignature ?? undefined,
      });
    }

    // Update user stats
    await User.findByIdAndUpdate(walkUserId, {
      $inc: {
        tokenBalance: reward.tokens,
        lifetimeTokensEarned: reward.tokens,
        "stats.totalWalks": 1,
        "stats.totalSteps": steps,
        "stats.totalDistanceMeters": distance,
        "stats.totalCalories": calculatedCalories,
        "stats.totalDurationSeconds": duration,
      },
      $set: {
        "stats.lastWalkDate": new Date(),
      },
    });

    logger.info(
      `Walk submitted: ${walletAddress} — ${(distance / 1000).toFixed(2)}km — ${reward.tokens} tokens`,
    );

    return sendCreated(res, {
      message: "Walk submitted successfully",
      data: {
        walkId: walk._id,
        activityType,
        distance: Math.round(distance),
        duration,
        steps,
        calories: calculatedCalories,
        tokensEarned: reward.tokens,
        isSeeker,
        seekerMultiplier: reward.seekerMultiplier,
        tokenBreakdown: reward.breakdown,
        mintTxSignature: mintSignature,
        status: walk.status,
      },
    });
  } catch (error) {
    logger.error("submitWalk error", { error: (error as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Get user's walk history
export const getWalkHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, { message: "Unauthorized", statusCode: 401 });
    }
    const walkUserId = new mongoose.Types.ObjectId(userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const walks = await Walk.find({
      userId: walkUserId,
      status: { $ne: "rejected" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-coordinates"); // don't return full GPS data in list

    const total = await Walk.countDocuments({ userId: walkUserId });

    return sendSuccess(res, {
      message: "Walk history retrieved",
      data: { walks },
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("getWalkHistory error", { error: (error as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Get single walk details
export const getWalkById = async (req: AuthRequest, res: Response) => {
  try {
    const walkId = req.params.walkId as string;
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, { message: "Unauthorized", statusCode: 401 });
    }
    const walkUserId = new mongoose.Types.ObjectId(userId);

    const walk = await Walk.findOne({
      _id: new mongoose.Types.ObjectId(walkId),
      userId: walkUserId,
    });
    if (!walk) {
      return sendError(res, { message: "Walk not found", statusCode: 404 });
    }

    return sendSuccess(res, { message: "Walk retrieved", data: { walk } });
  } catch (error) {
    logger.error("getWalkById error", { error: (error as Error).message });
    return sendError(res, { message: "Server error" });
  }
};

// Get user walk stats
export const getWalkStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, { message: "Unauthorized", statusCode: 401 });
    }
    const walkUserId = new mongoose.Types.ObjectId(userId);

    const stats = await Walk.aggregate([
      {
        $match: { userId: walkUserId, status: { $in: ["verified", "minted"] } },
      },
      {
        $group: {
          _id: null,
          totalWalks: { $sum: 1 },
          totalDistance: { $sum: "$distance" },
          totalDuration: { $sum: "$duration" },
          totalSteps: { $sum: "$steps" },
          totalCalories: { $sum: "$calories" },
          totalTokensEarned: { $sum: "$tokensEarned" },
          avgDistance: { $avg: "$distance" },
          avgDuration: { $avg: "$duration" },
          avgPace: { $avg: "$pace" },
        },
      },
    ]);

    return sendSuccess(res, {
      message: "Walk stats retrieved",
      data: { stats: stats[0] ?? {} },
    });
  } catch (error) {
    logger.error("getWalkStats error", { error: (error as Error).message });
    return sendError(res, { message: "Server error" });
  }
};
