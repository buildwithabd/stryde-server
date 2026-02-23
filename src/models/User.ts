import mongoose, { Document, Model } from "mongoose";
import type { IUser, PublicProfile } from "../types/user.js";

// Extend with Mongoose Document
export interface IUserDocument extends IUser, Document {
  toPublicProfile(): PublicProfile;
}

const userSchema = new mongoose.Schema<IUserDocument>();
// ... schema stays exactly the same

const User: Model<IUserDocument> = mongoose.model<IUserDocument>(
  "User",
  userSchema,
);

export default User;
