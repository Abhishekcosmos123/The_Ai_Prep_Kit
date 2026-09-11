import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "../services/auth/authService.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const user = await authService.register(body);
    const token = authService.signToken(user);
    res.cookie(authService.cookieName(), token, authService.cookieOptions());
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const user = await authService.login(body);
    const token = authService.signToken(user);
    res.cookie(authService.cookieName(), token, authService.cookieOptions());
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(authService.cookieName(), { path: "/" });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
