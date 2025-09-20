/**
 * ApiBox - Universal API proxy service
 * Main startup file - handles multiple API endpoints
 */

import { handleRequest } from "./src/routes/index.ts";
import { Logger } from "./src/utils/helpers.ts";
import { getEnvConfig } from "./src/utils/env.ts";

/**
 * Start server
 */
async function startServer(): Promise<void> {
  try {
    Logger.info("🚀 Starting ApiBox universal API proxy service...");

    const envConfig = getEnvConfig();

    if (envConfig.LOG_LEVEL === "debug") {
      console.log("📋 Environment config:", envConfig);
    }

    Logger.success(`🚀 ApiBox started on http://localhost:${envConfig.PORT}`);

    // Start HTTP server
    const server = Deno.serve(
      {
        port: envConfig.PORT,
        hostname: envConfig.HOST,
        onListen: ({ port, hostname }) => {
          Logger.success(`🎯 Server listening on ${hostname}:${port}`);
        },
      },
      (req: Request) => handleRequest(req)
    );

    // Graceful shutdown handling
    const shutdown = () => {
      Logger.info("🛑 Shutting down server...");
      try {
        server.shutdown();
      } catch (_e) {
        // ignore
      }
      Logger.success("✅ Server closed");
      Deno.exit(0);
    };

    // Listen for shutdown signals
    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);

    // Wait for server to finish
    await server.finished;
  } catch (error) {
    Logger.error(`❌ Server startup failed: ${error}`);
    Deno.exit(1);
  }
}

// Start server
if (import.meta.main) {
  await startServer();
}
