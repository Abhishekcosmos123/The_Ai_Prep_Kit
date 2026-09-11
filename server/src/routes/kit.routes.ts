import { Router } from "express";
import * as kits from "../controllers/kit.controller.js";
import * as practice from "../controllers/practice.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { generationLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", kits.listKits);
router.post("/", generationLimiter, kits.createKit);
router.post("/batch", generationLimiter, kits.createKitBatch);
router.get("/:id", kits.getKit);
router.patch("/:id", kits.updateKit);
router.delete("/:id", kits.deleteKit);

router.post("/:id/regenerate/company-brief", generationLimiter, kits.regenerateCompanyBrief);
router.post("/:id/regenerate/questions", generationLimiter, kits.regenerateQuestions);
router.post("/:id/regenerate/schedule", kits.regenerateSchedule);

router.get("/:id/practice", practice.getPractice);
router.post("/:id/practice", practice.postPractice);

export default router;
