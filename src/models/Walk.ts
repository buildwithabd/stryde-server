import type { Document } from "mongoose";
import type mongoose from "mongoose";

export interface ICoordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
  accuracy?: number;
}

export interface IWalk {
  userId: mongoose.Types.ObjectId;
  walletAddress: string;
  activityType: "walk" | "run" | "hike" | "ride";
  startTime: Date;
  endTime: Date;
  duration: number;
  distance: number;
  steps: number;
  calories: number;
  pace: number;
  averageSpeed: number;
  elevationGain: number;
  coordinates: ICoordinate[];
  tokensEarned: number;
  isSeeker: boolean;
  seekerMultiplier: number;
  status: "pending" | "verified" | "rejected" | "minting" | "minted";
  rejectionReason?: string;
  mintTxSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalkDocument extends IWalk, Document {}
