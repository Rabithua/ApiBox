/**
 * Common utility functions
 */

import { getEnvConfig } from "./env.ts";

/**
 * CORS headers configuration
 */
export function getCorsHeaders(): Record<string, string> {
  const envConfig = getEnvConfig();

  return {
    "Access-Control-Allow-Origin": envConfig.CORS_ORIGIN,
    "Access-Control-Allow-Methods": envConfig.CORS_METHODS,
    "Access-Control-Allow-Headers": envConfig.CORS_HEADERS,
  };
}

/**
 * Create JSON response with GitHub-style format
 */
export function createJsonResponse<T = unknown>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  message?: string
): Response {
  const responseBody = {
    status: "success" as const,
    data,
    ...(message && { message }),
  };

  return new Response(JSON.stringify(responseBody, null, 2), {
    status,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Create error response with GitHub-style format
 */
export function createErrorResponse(
  message: string,
  status = 500,
  errors?: Array<{ field?: string; code: string; message: string }>,
  details?: Record<string, unknown>
): Response {
  const responseBody = {
    status: "error" as const,
    message,
    ...(errors && { errors }),
    ...(details && { details }),
  };

  return new Response(JSON.stringify(responseBody, null, 2), {
    status,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Logging utility functions
 */

// Log color configuration
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, message: string, color: string): string {
  const config = getEnvConfig();
  const ts = getTimestamp();
  if (config.LOG_COLORIZE) {
    return `${colors.gray}[${ts}]${colors.reset} ${color}${level}${colors.reset} ${message}`;
  }
  return `[${ts}] ${level} ${message}`;
}

function shouldLog(level: string): boolean {
  const config = getEnvConfig();
  const levels = ["debug", "info", "warn", "error"];
  const currentLevelIndex = levels.indexOf(config.LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level.toLowerCase());
  return messageLevelIndex >= currentLevelIndex;
}

// Logging utility object
export const Logger = {
  info: (message: string): void => {
    if (shouldLog("info")) {
      console.log(formatMessage("INFO", message, colors.blue));
    }
  },
  warn: (message: string): void => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("WARN", message, colors.yellow));
    }
  },
  error: (message: string): void => {
    if (shouldLog("error")) {
      console.error(formatMessage("ERROR", message, colors.red));
    }
  },
  success: (message: string): void => {
    if (shouldLog("info")) {
      console.log(formatMessage("SUCCESS", message, colors.green));
    }
  },
  debug: (message: string): void => {
    if (shouldLog("debug")) {
      console.log(formatMessage("DEBUG", message, colors.magenta));
    }
  },
};
