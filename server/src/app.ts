import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import kitRoutes from "./routes/kit.routes.js";
import generationRoutes from "./routes/generation.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "the-ai-prep-kit", version: "1.0" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/kits", kitRoutes);
  app.use("/api/generation", generationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
