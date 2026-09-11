import { Router } from "express";
import * as kits from "../controllers/kit.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:id/status", requireAuth, kits.generationStatus);

export default router;
