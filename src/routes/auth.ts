import { Router } from "express";
import {
  connectWallet,
  setupProfile,
  refreshToken,
  logout,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/connect", authLimiter, connectWallet);
router.post("/profile/setup", protect, setupProfile);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

export default router;
