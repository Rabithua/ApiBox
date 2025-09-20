/**
 * Forex API route handler
 * Provides real-time forex quotes through proxy requests
 */

import {
  createJsonResponse,
  createErrorResponse,
  Logger,
} from "../utils/helpers.ts";

// Forex API configuration
const FOREX_BASE_URL =
  "https://forex-data-feed.swissquote.com/public-quotes/bboquotes";

// Build forex API request URL
function buildForexUrl(instrument: string, currency: string): string {
  return `${FOREX_BASE_URL}/instrument/${instrument}/${currency}`;
}

/**
 * Fetch forex data from external API
 * Simple proxy implementation without caching
 */
async function fetchForexData(
  instrument: string,
  currency: string
): Promise<unknown> {
  // Build request URL
  const url = buildForexUrl(instrument, currency);
  Logger.debug(`Proxy request: GET ${url}`);

  try {
    // Send request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ApiBox/2.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    Logger.error(`Forex request failed: ${error}`);
    throw error;
  }
}

/**
 * Handle forex quote requests
 * Route: /api/forex/quote/{instrument}/{currency}
 */
export async function handleForexQuote(url: URL): Promise<Response> {
  // Parse path: /api/forex/quote/{instrument}/{currency}
  const pathParts = url.pathname.split("/").filter(Boolean);
  const instrument = pathParts[3]?.toUpperCase();
  const currency = pathParts[4]?.toUpperCase();

  if (!instrument || !currency) {
    return createErrorResponse(
      "Invalid forex path",
      400,
      [
        {
          field: "path",
          code: "INVALID_PATH_FORMAT",
          message:
            "Path must follow format: /api/forex/quote/{instrument}/{currency}",
        },
      ],
      {
        format: "/api/forex/quote/{instrument}/{currency}",
        example: "/api/forex/quote/XAU/USD",
      }
    );
  }

  try {
    const data = await fetchForexData(instrument, currency);
    return createJsonResponse(
      data,
      200,
      {},
      `Forex quote for ${instrument}/${currency} retrieved successfully`
    );
  } catch (error) {
    Logger.error(`Forex request failed [${instrument}/${currency}]: ${error}`);
    return createErrorResponse(
      "Forex request failed",
      500,
      [
        {
          code: "FOREX_REQUEST_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      {
        instrument,
        currency,
      }
    );
  }
}
