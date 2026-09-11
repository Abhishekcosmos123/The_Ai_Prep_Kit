import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`The AI Prep Kit API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  logger.error("Failed to start server", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
