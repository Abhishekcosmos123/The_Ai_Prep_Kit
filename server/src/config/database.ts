import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection failed — check MONGODB_URI on Railway", {
      message: error instanceof Error ? error.message : String(error),
      uri_host: (() => {
        try {
          return new URL(env.MONGODB_URI.replace(/^mongodb\+srv/, "https")).host;
        } catch {
          return "unparseable";
        }
      })(),
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
