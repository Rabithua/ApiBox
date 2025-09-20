/**
 * 简化的环境变量配置
 */

export interface EnvConfig {
  PORT: number;
  HOST: string;
  OPENWEATHER_API_KEY?: string;
  DATABASE_URL?: string;
  ENABLE_DB_PERSISTENCE: boolean;
  CACHE_MAX_SIZE: number;
  CACHE_DEFAULT_TTL: number;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  LOG_COLORIZE: boolean;
  CORS_ORIGIN: string;
  CORS_METHODS: string;
  CORS_HEADERS: string;
  HEALTH_CHECK_ENABLED: boolean;
}

/**
 * 直接读取环境变量，简单直接
 */
export function getEnvConfig(): EnvConfig {
  return {
    PORT: parseInt(Deno.env.get("PORT") || "8000"),
    HOST: Deno.env.get("HOST") || "0.0.0.0",
    OPENWEATHER_API_KEY: Deno.env.get("OPENWEATHER_API_KEY"),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
    ENABLE_DB_PERSISTENCE: Deno.env.get("ENABLE_DB_PERSISTENCE") === "true",
    CACHE_MAX_SIZE: parseInt(Deno.env.get("CACHE_MAX_SIZE") || "1000"),
    CACHE_DEFAULT_TTL: parseInt(Deno.env.get("CACHE_DEFAULT_TTL") || "300000"),
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
  };
}
