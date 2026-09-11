import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "../services/auth/authService.js";

const registerSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Password must include a letter.")
    .regex(/\d/, "Password must include a number."),
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer."),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
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
  res.clearCookie(authService.cookieName(), authService.cookieOptions());
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
