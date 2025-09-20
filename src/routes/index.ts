/**
 * Main request router
 * Handles routing and dispatching for all API endpoints
 */

import {
  getCorsHeaders,
  createJsonResponse,
  createErrorResponse,
  Logger,
} from "../utils/helpers.ts";
import { createEmojiFaviconResponse } from "./favicon.ts";
import {
  handleForexQuote,
  handleForexHistory,
  handleForexDebugTrigger as _handleForexDebugTrigger, // temporarily disabled
  getForexTasksStatus,
} from "./forex.ts";
import { databaseHealthCheck } from "../utils/database.ts";

/**
 * Main request handler
 * Routes incoming requests to appropriate handlers
 */
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = getCorsHeaders();

  // Log incoming request
  Logger.info(`${req.method} ${url.pathname}${url.search}`);

  // Handle OPTIONS requests (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    // Forex API route: /api/forex/quote/{instrument}/{currency}
    if (url.pathname.startsWith("/api/forex/quote/")) {
      Logger.debug(`Routing to forex quote handler: ${url.pathname}`);
      return await handleForexQuote(url);
    }

    // Forex history API route: /api/forex/history/{instrument}/{currency}
    if (url.pathname.startsWith("/api/forex/history/")) {
      Logger.debug(`Routing to forex history handler: ${url.pathname}`);
      return await handleForexHistory(url);
    }

    // Forex debug trigger route (temporarily disabled)
    if (url.pathname === "/api/forex/debug/trigger") {
      Logger.warn("Debug trigger is temporarily disabled");
      return createErrorResponse(
        "Debug trigger temporarily disabled",
        503,
        [
          {
            code: "SERVICE_TEMPORARILY_DISABLED",
            message: "This debug endpoint has been temporarily disabled",
          },
        ],
        {
          endpoint: "/api/forex/debug/trigger",
          status: "disabled",
        }
      );
    }

    // Forex tasks status route
    if (url.pathname === "/api/forex/tasks") {
      Logger.debug("Checking forex tasks status");
      const tasksStatus = getForexTasksStatus();
      return createJsonResponse(
        tasksStatus,
        200,
        {},
        "Forex tasks status retrieved successfully"
      );
    }

    // Database health check route
    if (url.pathname === "/health/database") {
      Logger.debug("Checking database health");
      const healthStatus = await databaseHealthCheck();
      const statusCode = healthStatus.status === "healthy" ? 200 : 503;

      return createJsonResponse(
        healthStatus,
        statusCode,
        {},
        `Database health check ${healthStatus.status}`
      );
    }

    // Root path returns service info
    if (url.pathname === "/") {
      Logger.debug("Serving service info");
      return createJsonResponse(
        {
          name: "ApiBox",
          version: "0.0.1",
          description: "Universal API proxy service",
          endpoints: {
            forex_quote: "/api/forex/quote/{instrument}/{currency}",
            forex_history: "/api/forex/history/{instrument}/{currency}",
            // forex_debug_trigger: "/api/forex/debug/trigger", // temporarily disabled
            forex_tasks: "/api/forex/tasks",
            database_health: "/health/database",
            info: "/",
            favicon: "/favicon.ico",
          },
        },
        200,
        {},
        "Service information retrieved successfully"
      );
    }

    // favicon route
    if (url.pathname === "/favicon.ico") {
      Logger.debug("Serving favicon");
      return createEmojiFaviconResponse();
    }

    // 404 handling
    Logger.warn(`Resource not found: ${req.method} ${url.pathname}`);
    return createErrorResponse(
      "Resource not found",
      404,
      [
        {
          code: "RESOURCE_NOT_FOUND",
          message: "The requested endpoint does not exist",
        },
      ],
      {
        available_endpoints: {
          info: "/ - Service information and available endpoints",
          forex_quote:
            "/api/forex/quote/{instrument}/{currency} - Real-time forex quotes",
          forex_history:
            "/api/forex/history/{instrument}/{currency} - Historical forex data",
          // forex_debug_trigger: "/api/forex/debug/trigger - Manual trigger for forex data collection", // temporarily disabled
          forex_tasks: "/api/forex/tasks - Forex scheduled tasks status",
          database_health:
            "/health/database - Database connection health check",
          favicon: "/favicon.ico - Service favicon",
        },
        examples: {
          forex_quote: [
            "/api/forex/quote/XAU/USD",
            "/api/forex/quote/EUR/USD",
            "/api/forex/quote/GBP/USD",
          ],
          forex_history: [
            "/api/forex/history/XAU/USD",
            "/api/forex/history/XAU/USD?limit=50&page=1",
            "/api/forex/history/XAU/USD?startDate=2024-01-01T00:00:00Z&endDate=2024-01-02T00:00:00Z",
          ],
          // forex_debug_trigger: ["/api/forex/debug/trigger"], // temporarily disabled
        },
        suggestion: "Visit root path for detailed service information",
      }
    );
  } catch (error) {
    Logger.error(`Request processing error: ${error}`);
    return createErrorResponse("Internal server error", 500, [
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    ]);
  }
}
