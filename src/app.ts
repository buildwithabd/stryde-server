import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import logger from "./utils/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authLimiter, globalLimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/auth.js";
import walksRoutes from "./routes/walks.js";

const app = express();

// Security
app.use(helmet());
app.use(compression());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate Limiting
app.use("/api/", globalLimiter);

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// Body Parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (msg: string) => logger.http(msg.trim()) },
      skip: (req: Request) => req.url === "/health",
    }),
  );
}

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "OK",
    service: "Stryde API",
    version: "1.0.0",
    network: process.env.SOLANA_NETWORK || "devnet",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/walks", walksRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
