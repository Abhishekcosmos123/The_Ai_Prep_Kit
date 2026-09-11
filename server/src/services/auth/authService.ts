import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { User, type UserDocument } from "../../models/User.js";
import { AppError } from "../../utils/errors.js";

const COOKIE_NAME = "tapk_session";
const TOKEN_TTL = "7d";

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export class AuthService {
  async register(input: { email: string; password: string; name: string }) {
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      logger.warn("auth.register.email_taken", { email });
      throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
    }
    if (input.password.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", 400);
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      email,
      passwordHash,
      name: input.name.trim(),
    });
    logger.info("auth.register.ok", { userId: user._id.toString(), email });
    return this.publicUser(user);
  }

  async login(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("auth.login.invalid_credentials", { email, reason: "user_not_found" });
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      logger.warn("auth.login.invalid_credentials", { email, reason: "bad_password" });
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    logger.info("auth.login.ok", { userId: user._id.toString(), email });
    return this.publicUser(user);
  }

  signToken(user: { id: string; email: string }): string {
    const payload: AuthTokenPayload = { sub: user.id, email: user.email };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    } catch {
      logger.warn("auth.session.invalid_or_expired");
      throw new AppError("INVALID_SESSION", "Session is invalid or expired.", 401);
    }
  }

  publicUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  }

  cookieName() {
    return COOKIE_NAME;
  }

  cookieOptions() {
    return {
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    };
  }
}

export const authService = new AuthService();
