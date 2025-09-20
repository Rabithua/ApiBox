/**
 * 通用工具函数
 */

import { getEnvConfig } from "../env/manager.ts";

/**
 * CORS 头配置
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
 * 创建JSON响应
 */
export function createJsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: string,
  status = 500,
  details?: Record<string, unknown>
): Response {
  const errorData: Record<string, unknown> = { error };
  if (details) {
    errorData.details = details;
  }

  return createJsonResponse(errorData, status);
}

/**
 * 日志格式化器
 */
export class Logger {
  private static getConfig() {
    return getEnvConfig();
  }

  private static colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
  };

  private static timestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(
    level: string,
    message: string,
    color: string
  ): string {
    const config = this.getConfig();
    const ts = this.timestamp();
    if (config.LOG_COLORIZE) {
      return `${this.colors.gray}[${ts}]${this.colors.reset} ${color}${level}${this.colors.reset} ${message}`;
    }
    return `[${ts}] ${level} ${message}`;
  }

  private static shouldLog(level: string): boolean {
    const config = this.getConfig();
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(config.LOG_LEVEL);
    const messageLevelIndex = levels.indexOf(level.toLowerCase());
    return messageLevelIndex >= currentLevelIndex;
  }

  public static info(message: string): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("INFO", message, this.colors.blue));
    }
  }

  public static warn(message: string): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("WARN", message, this.colors.yellow));
    }
  }

  public static error(message: string): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("ERROR", message, this.colors.red));
    }
  }

  public static success(message: string): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("SUCCESS", message, this.colors.green));
    }
  }

  public static debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("DEBUG", message, this.colors.magenta));
    }
  }
}

/**
 * 解析路径参数
 */
export function parsePathParams(
  pathname: string,
  basePath: string
): { apiName?: string; endpoint?: string; additionalParams: string[] } {
  const pathParts = pathname
    .replace(basePath, "")
    .split("/")
    .filter((part) => part);

  return {
    apiName: pathParts[0],
    endpoint: pathParts[1],
    additionalParams: pathParts.slice(2),
  };
}

/**
 * 健康检查
 */
export function getHealthStatus(): unknown {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: performance.now(),
    memory: Deno.memoryUsage?.() || "unknown",
  };
}
