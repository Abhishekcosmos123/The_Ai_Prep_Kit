import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { clientOrigins, env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function main() {
  await connectDatabase();
  const app = createApp();
  // Bind 0.0.0.0 so Railway / cloud proxies can reach the process (localhost-only → 502).
  const host = process.env.HOST || "0.0.0.0";
  app.listen(env.PORT, host, () => {
    logger.info(`The AI Prep Kit API listening on http://${host}:${env.PORT}`, {
      node_env: env.NODE_ENV,
      client_origins: clientOrigins(),
    });
  });
}

main().catch((error) => {
  logger.error("Failed to start server", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
