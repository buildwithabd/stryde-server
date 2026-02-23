import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User.js";

export interface AuthRequest extends Request {
  user?: { id: string; walletAddress: string };
}

interface TokenPayload extends JwtPayload {
  id: string;
  walletAddress: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1] ?? "";

    if (!token) {
      res.status(401).json({ success: false, message: "Invalid token format" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    const decoded = jwt.verify(token, secret) as TokenPayload;

    const user = await User.findById(decoded.id).select(
      "_id walletAddress isBanned",
    );

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
      return;
    }

    if (user.isBanned) {
      res
        .status(403)
        .json({ success: false, message: "Account has been banned" });
      return;
    }

    req.user = { id: user._id.toString(), walletAddress: user.walletAddress };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: "Token expired" });
      return;
    }
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
