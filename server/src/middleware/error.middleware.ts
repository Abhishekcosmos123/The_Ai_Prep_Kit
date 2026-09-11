import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isAppError } from "../utils/errors.js";
import { UrlValidationError } from "../utils/urlValidator.js";
import { logger, preview } from "../config/logger.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  logger.warn("http.not_found", { method: req.method, path: req.originalUrl });
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const base = { method: req.method, path: req.originalUrl, userId: req.user?.id };

  if (err instanceof ZodError) {
    logger.warn("http.validation_error", {
      ...base,
      issues: err.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof UrlValidationError) {
    logger.warn("http.url_validation_error", { ...base, message: err.message });
    res.status(400).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (isAppError(err)) {
    const level = err.status >= 500 ? "error" : "warn";
    logger[level]("http.app_error", {
      ...base,
      code: err.code,
      status: err.status,
      message: err.message,
      details: err.details,
    });
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error("http.unhandled_error", {
    ...base,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? preview(err.stack, 800) : undefined,
  });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};
