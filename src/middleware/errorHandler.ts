import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";

// Custom Error Class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Types
interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
  errors?: Record<string, { message: string }>;
}

// 404 Handler
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Not found: ${req.method} ${req.originalUrl}`,
  });
};

// Global Error Handler
export const errorHandler = (
  err: MongoError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let status = (err as AppError).statusCode || 500;
  let message = err.message || "Server error";

  // MongoDB duplicate key
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue ?? {})[0] ?? "Field"} already exists.`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors ?? {})
      .map((e) => e.message)
      .join(". ");
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token expired, please log in again";
  }

  // Log the error
  logger.error(`${status} ${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
  });

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
