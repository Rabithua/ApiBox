/**
 * Forex API route handler
 * Provides real-time forex quotes through proxy requests
 */

import {
  createJsonResponse,
  createErrorResponse,
  Logger,
} from "../utils/helpers.ts";
import {
  saveForexQuote,
  getForexHistory,
  getDatabase,
} from "../utils/database.ts";
import { getScheduler } from "../utils/scheduler.ts";
import { ForexHistoryQuery as _ForexHistoryQuery } from "../types/index.ts";

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

    // Quote API is for real-time data only, no database saving
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

/**
 * Handle forex history requests
 * Route: /api/forex/history/{instrument}/{currency}
 */
export async function handleForexHistory(url: URL): Promise<Response> {
  // Parse path: /api/forex/history/{instrument}/{currency}
  const pathParts = url.pathname.split("/").filter(Boolean);
  const instrument = pathParts[3]?.toUpperCase();
  const currency = pathParts[4]?.toUpperCase();

  if (!instrument || !currency) {
    return createErrorResponse(
      "Invalid forex history path",
      400,
      [
        {
          field: "path",
          code: "INVALID_PATH_FORMAT",
          message:
            "Path must follow format: /api/forex/history/{instrument}/{currency}",
        },
      ],
      {
        format: "/api/forex/history/{instrument}/{currency}",
        example: "/api/forex/history/XAU/USD",
      }
    );
  }

  // Check if database is available
  try {
    const db = getDatabase();
    if (!db.isConnected) {
      return createErrorResponse("Database not available", 503, [
        {
          code: "DATABASE_UNAVAILABLE",
          message: "Historical data requires database connection",
        },
      ]);
    }
  } catch (_error) {
    return createErrorResponse("Database not available", 503, [
      {
        code: "DATABASE_NOT_INITIALIZED",
        message: "Database not initialized",
      },
    ]);
  }

  // Parse query parameters
  const searchParams = url.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "100");
  const page = parseInt(searchParams.get("page") || "1");

  // Validate parameters
  if (limit < 1 || limit > 1000) {
    return createErrorResponse("Invalid limit parameter", 400, [
      {
        field: "limit",
        code: "INVALID_LIMIT",
        message: "Limit must be between 1 and 1000",
      },
    ]);
  }

  if (page < 1) {
    return createErrorResponse("Invalid page parameter", 400, [
      {
        field: "page",
        code: "INVALID_PAGE",
        message: "Page must be greater than 0",
      },
    ]);
  }

  try {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    const offset = (page - 1) * limit;

    // Validate dates
    if (startDate && isNaN(startDateObj!.getTime())) {
      return createErrorResponse(
        "Invalid startDate parameter",
        400,
        [
          {
            field: "startDate",
            code: "INVALID_DATE_FORMAT",
            message: "startDate must be a valid ISO date string",
          },
        ],
        { example: "2024-01-01T00:00:00Z" }
      );
    }

    if (endDate && isNaN(endDateObj!.getTime())) {
      return createErrorResponse(
        "Invalid endDate parameter",
        400,
        [
          {
            field: "endDate",
            code: "INVALID_DATE_FORMAT",
            message: "endDate must be a valid ISO date string",
          },
        ],
        { example: "2024-01-01T00:00:00Z" }
      );
    }

    const result = await getForexHistory(
      instrument,
      currency,
      startDateObj,
      endDateObj,
      limit,
      offset
    );

    const totalPages = Math.ceil(result.total / limit);

    return createJsonResponse(
      {
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filter: {
          instrument,
          currency,
          startDate: startDateObj?.toISOString(),
          endDate: endDateObj?.toISOString(),
        },
      },
      200,
      {},
      `Retrieved ${result.data.length} forex history records for ${instrument}/${currency}`
    );
  } catch (error) {
    Logger.error(
      `Forex history request failed [${instrument}/${currency}]: ${error}`
    );
    return createErrorResponse(
      "Failed to retrieve forex history",
      500,
      [
        {
          code: "FOREX_HISTORY_ERROR",
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

/**
 * Initialize forex scheduled tasks
 */
export function initializeForexTasks(): void {
  const scheduler = getScheduler();

  // Add XAU/USD hourly data collection task
  scheduler.addTask(
    "forex-xau-usd-hourly",
    "XAU/USD Hourly Data Collection",
    60 * 60 * 1000, // 1 hour in milliseconds
    async () => {
      try {
        Logger.info(
          "🔄 Running scheduled forex data collection for XAU/USD..."
        );

        // Fetch current XAU/USD data
        const data = await fetchForexData("XAU", "USD");

        // Save to database with hour-aligned timestamp
        await saveForexQuote("XAU", "USD", data, undefined, true);

        Logger.success(
          "✅ Scheduled forex data collection completed for XAU/USD"
        );
      } catch (error) {
        Logger.error(`❌ Scheduled forex data collection failed: ${error}`);
        throw error; // Re-throw to let scheduler handle error counting
      }
    },
    {
      enabled: true,
      maxErrors: 3,
      runImmediately: false, // Don't run immediately on startup
      alignToHour: true, // Align task execution to hour boundaries
    }
  );

  Logger.info("📅 Forex scheduled tasks initialized");
}

/**
 * Handle manual trigger of forex data collection
 * Route: /api/forex/debug/trigger
 */
export async function handleForexDebugTrigger(_url: URL): Promise<Response> {
  try {
    Logger.info("🐛 Manual debug trigger: Starting forex data collection...");

    // Get current XAU/USD data
    const data = await fetchForexData("XAU", "USD");

    // Try to save to database
    let dbResult = null;
    try {
      const db = getDatabase();
      if (db.isConnected) {
        // Use hour-aligned timestamp for debug trigger as well
        await saveForexQuote("XAU", "USD", data, undefined, true);
        dbResult = {
          status: "success",
          message:
            "Data saved to database successfully with hour-aligned timestamp",
        };
        Logger.success(
          "✅ Debug trigger: Data saved to database with hour-aligned timestamp"
        );
      } else {
        dbResult = {
          status: "warning",
          message: "Database not connected, data not saved",
        };
        Logger.warn("⚠️ Debug trigger: Database not connected");
      }
    } catch (dbError) {
      dbResult = {
        status: "error",
        message: `Database save failed: ${dbError}`,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      };
      Logger.error(`❌ Debug trigger: Database save failed: ${dbError}`);
    }

    // Get scheduler status
    const scheduler = getScheduler();
    const forexTask = scheduler.getTaskStatus("forex-xau-usd-hourly");

    return createJsonResponse(
      {
        trigger: {
          timestamp: new Date().toISOString(),
          status: "completed",
          dataSize: JSON.stringify(data).length,
          platformCount: Array.isArray(data) ? data.length : 1,
        },
        database: dbResult,
        scheduler: forexTask
          ? {
              id: forexTask.id,
              name: forexTask.name,
              enabled: forexTask.enabled,
              lastRun: forexTask.lastRun?.toISOString(),
              nextRun: forexTask.nextRun?.toISOString(),
              errorCount: forexTask.errorCount,
              maxErrors: forexTask.maxErrors,
            }
          : null,
        rawData: data,
      },
      200,
      {},
      "Debug trigger completed successfully"
    );
  } catch (error) {
    Logger.error(`❌ Debug trigger failed: ${error}`);
    return createErrorResponse(
      "Debug trigger failed",
      500,
      [
        {
          code: "DEBUG_TRIGGER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Get forex scheduler status
 */
export function getForexTasksStatus(): any {
  const scheduler = getScheduler();
  const tasks = scheduler
    .getAllTasksStatus()
    .filter((task) => task.id.startsWith("forex-"));

  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      lastRun: task.lastRun?.toISOString(),
      nextRun: task.nextRun?.toISOString(),
      errorCount: task.errorCount,
      maxErrors: task.maxErrors,
    })),
    stats: scheduler.getStats(),
  };
}
