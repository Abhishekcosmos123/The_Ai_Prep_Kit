import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", authLimiter, auth.register);
router.post("/login", authLimiter, auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);

export default router;
