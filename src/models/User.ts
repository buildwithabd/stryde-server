import mongoose, { Document, Model } from "mongoose";
import type { IUser, PublicProfile } from "../types/user.js";

export interface IUserDocument extends IUser, Document {
  toPublicProfile(): PublicProfile;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain letters, numbers and underscores",
      ],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [30, "Display name cannot exceed 30 characters"],
      default: null,
    },
    avatarUrl: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: [160, "Bio cannot exceed 160 characters"],
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: { type: String, trim: true },
    fullName: {
      type: String,
      trim: true,
      maxlength: [60, "Full name cannot exceed 60 characters"],
    },
    heightCm: { type: Number, min: 50, max: 300 },
    weightKg: { type: Number, min: 10, max: 500 },
    gender: {
      type: String,
      enum: ["male", "female", "non-binary", "prefer_not_to_say"],
    },
    fitnessLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
      city: { type: String },
      country: { type: String },
    },

    refreshToken: { type: String, select: false },

    // Wallet & Solana
    walletConnectedAt: { type: Date, default: Date.now },
    skrIdentityAddress: { type: String },
    tokenBalance: { type: Number, default: 0, min: 0 },
    lifetimeTokensEarned: { type: Number, default: 0 },
    lifetimeTokensSpent: { type: Number, default: 0 },

    // Walk stats
    stats: {
      totalWalks: { type: Number, default: 0 },
      totalSteps: { type: Number, default: 0 },
      totalDistanceMeters: { type: Number, default: 0 },
      totalCalories: { type: Number, default: 0 },
      totalDurationSeconds: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastWalkDate: { type: Date },
    },

    // Social
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    // Reputation
    reputationScore: { type: Number, default: 0, min: 0 },
    spoofingFlags: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },

    // Challenges
    challengeStats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      totalStaked: { type: Number, default: 0 },
      totalWon: { type: Number, default: 0 },
    },

    // Achievements
    achievements: [
      {
        achievementId: String,
        name: String,
        unlockedAt: { type: Date, default: Date.now },
      },
    ],

    // Notifications
    pushToken: { type: String },
    notificationPrefs: {
      challenges: { type: Boolean, default: true },
      rewards: { type: Boolean, default: true },
      leaderboard: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
userSchema.index({ location: "2dsphere" });
userSchema.index({ tokenBalance: -1 });
userSchema.index({ reputationScore: -1 });
userSchema.index({ "stats.totalSteps": -1 });

// Virtuals
userSchema.virtual("totalDistanceKm").get(function () {
  return (this.stats.totalDistanceMeters / 1000).toFixed(2);
});

// Methods
userSchema.methods["toPublicProfile"] = function (): PublicProfile {
  return {
    id: this._id.toString(),
    walletAddress: this.walletAddress,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    reputationScore: this.reputationScore,
    tokenBalance: this.tokenBalance,
    stats: this.stats,
    achievements: this.achievements,
    challengeStats: this.challengeStats,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    createdAt: this.createdAt,
  };
};

const User: Model<IUserDocument> = mongoose.model<IUserDocument>(
  "User",
  userSchema,
);

export default User;
