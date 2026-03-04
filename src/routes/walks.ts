import { Router } from "express";
import {
  submitWalk,
  getWalkHistory,
  getWalkById,
  getWalkStats,
} from "../controllers/walkController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.post("/submit", submitWalk);
router.get("/history", getWalkHistory);
router.get("/stats", getWalkStats);
router.get("/:walkId", getWalkById);

export default router;
