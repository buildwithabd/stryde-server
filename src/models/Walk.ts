import mongoose, { Document, Model } from "mongoose";

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

const coordinateSchema = new mongoose.Schema<ICoordinate>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    altitude: { type: Number },
    accuracy: { type: Number },
  },
  { _id: false },
);

const walkSchema = new mongoose.Schema<IWalkDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ["walk", "run", "hike", "ride"],
      default: "walk",
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true, min: 0 },
    distance: { type: Number, required: true, min: 0 },
    steps: { type: Number, default: 0, min: 0 },
    calories: { type: Number, default: 0, min: 0 },
    pace: { type: Number, default: 0 },
    averageSpeed: { type: Number, default: 0 },
    elevationGain: { type: Number, default: 0 },
    coordinates: {
      type: [coordinateSchema],
      required: true,
      validate: {
        validator: (coords: ICoordinate[]) => coords.length >= 2,
        message: "Walk must have at least 2 coordinates",
      },
    },
    tokensEarned: { type: Number, default: 0, min: 0 },
    isSeeker: { type: Boolean, default: false },
    seekerMultiplier: { type: Number, default: 1.0 },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "minting", "minted"],
      default: "pending",
    },
    rejectionReason: { type: String },
    mintTxSignature: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes for leaderboard queries
walkSchema.index({ userId: 1, createdAt: -1 });
walkSchema.index({ walletAddress: 1, createdAt: -1 });
walkSchema.index({ status: 1 });
walkSchema.index({ tokensEarned: -1 });
walkSchema.index({ distance: -1 });

const Walk: Model<IWalkDocument> = mongoose.model<IWalkDocument>(
  "Walk",
  walkSchema,
);

export default Walk;
