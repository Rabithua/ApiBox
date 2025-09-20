/**
 * Simplified environment variable configuration
 */

export interface EnvConfig {
  PORT: number;
  HOST: string;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  LOG_COLORIZE: boolean;
  CORS_ORIGIN: string;
  CORS_METHODS: string;
  CORS_HEADERS: string;
  HEALTH_CHECK_ENABLED: boolean;
  DATABASE_URL?: string;
}

/**
 * Read environment variables directly, simple and straightforward
 */
export function getEnvConfig(): EnvConfig {
  return {
    PORT: parseInt(Deno.env.get("PORT") || "8000"),
    HOST: Deno.env.get("HOST") || "0.0.0.0",
    LOG_LEVEL: (Deno.env.get("LOG_LEVEL") || "info") as
      | "debug"
      | "info"
      | "warn"
      | "error",
    LOG_COLORIZE: Deno.env.get("LOG_COLORIZE") !== "false",
    CORS_ORIGIN: Deno.env.get("CORS_ORIGIN") || "*",
    CORS_METHODS: Deno.env.get("CORS_METHODS") || "GET,POST,PUT,DELETE,OPTIONS",
    CORS_HEADERS:
      Deno.env.get("CORS_HEADERS") || "Content-Type,Authorization,X-API-Key",
    HEALTH_CHECK_ENABLED: Deno.env.get("HEALTH_CHECK_ENABLED") !== "false",
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
  };
}
