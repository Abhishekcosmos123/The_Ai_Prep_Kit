import type { RequestHandler } from "express";
import { authService } from "../services/auth/authService.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/errors.js";

export interface AuthedRequestUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedRequestUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[authService.cookieName()];
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    }
    const payload = authService.verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    }
    req.user = authService.publicUser(user);
    next();
  } catch (error) {
    next(error);
  }
};
