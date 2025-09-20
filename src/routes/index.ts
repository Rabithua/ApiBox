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
import { handleForexQuote } from "./forex.ts";

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
      Logger.debug(`Routing to forex handler: ${url.pathname}`);
      return await handleForexQuote(url);
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
            forex: "/api/forex/quote/{instrument}/{currency}",
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
          forex:
            "/api/forex/quote/{instrument}/{currency} - Real-time forex quotes",
          favicon: "/favicon.ico - Service favicon",
        },
        examples: {
          forex: [
            "/api/forex/quote/XAU/USD",
            "/api/forex/quote/EUR/USD",
            "/api/forex/quote/GBP/USD",
          ],
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
