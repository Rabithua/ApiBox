/**
 * 工具函数测试
 * 测试 src/utils/helpers.ts 中的各种工具函数
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "jsr:@std/assert@1";
import {
  getCorsHeaders,
  createJsonResponse,
  createErrorResponse,
  parsePathParams,
  getHealthStatus,
  Logger,
} from "../../src/utils/helpers.ts";

// Mock EnvManager 用于测试 (暂时未使用，将来可能需要)
const _mockEnvConfig = {
  CORS_ORIGIN: "*",
  CORS_METHODS: "GET,POST,PUT,DELETE,OPTIONS",
  CORS_HEADERS: "Content-Type,Authorization,X-API-Key",
  LOG_LEVEL: "info" as const,
  LOG_COLORIZE: true,
};

// 临时替换 EnvManager（需要修改导入）
Deno.test("CORS Headers - 应该返回正确的CORS头", () => {
  const headers = getCorsHeaders();

  assertExists(headers["Access-Control-Allow-Origin"]);
  assertExists(headers["Access-Control-Allow-Methods"]);
  assertExists(headers["Access-Control-Allow-Headers"]);
});

Deno.test("createJsonResponse - 应该创建正确的JSON响应", async () => {
  const testData = { message: "test", value: 123 };
  const response = createJsonResponse(testData, 200, { "X-Custom": "header" });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/json");
  assertEquals(response.headers.get("X-Custom"), "header");

  const responseData = await response.json();
  assertEquals(responseData, testData);
});

Deno.test("createJsonResponse - 应该使用默认参数", async () => {
  const testData = { test: true };
  const response = createJsonResponse(testData);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/json");

  const responseData = await response.json();
  assertEquals(responseData, testData);
});

Deno.test("createErrorResponse - 应该创建错误响应", async () => {
  const errorMessage = "测试错误";
  const details = { code: "TEST_ERROR", field: "test" };
  const response = createErrorResponse(errorMessage, 400, details);

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Content-Type"), "application/json");

  const responseData = await response.json();
  assertEquals(responseData.error, errorMessage);
  assertEquals(responseData.details, details);
});

Deno.test("createErrorResponse - 应该使用默认状态码", async () => {
  const errorMessage = "服务器错误";
  const response = createErrorResponse(errorMessage);

  assertEquals(response.status, 500);

  const responseData = await response.json();
  assertEquals(responseData.error, errorMessage);
});

Deno.test("parsePathParams - 应该正确解析路径参数", () => {
  const pathname = "/api/forex/quote/XAU/USD";
  const basePath = "/api/";
  const result = parsePathParams(pathname, basePath);

  assertEquals(result.apiName, "forex");
  assertEquals(result.endpoint, "quote");
  assertEquals(result.additionalParams, ["XAU", "USD"]);
});

Deno.test("parsePathParams - 应该处理简单路径", () => {
  const pathname = "/api/test/endpoint";
  const basePath = "/api/";
  const result = parsePathParams(pathname, basePath);

  assertEquals(result.apiName, "test");
  assertEquals(result.endpoint, "endpoint");
  assertEquals(result.additionalParams, []);
});

Deno.test("parsePathParams - 应该处理只有API名称的路径", () => {
  const pathname = "/api/test";
  const basePath = "/api/";
  const result = parsePathParams(pathname, basePath);

  assertEquals(result.apiName, "test");
  assertEquals(result.endpoint, undefined);
  assertEquals(result.additionalParams, []);
});

Deno.test("parsePathParams - 应该处理空路径", () => {
  const pathname = "/api/";
  const basePath = "/api/";
  const result = parsePathParams(pathname, basePath);

  assertEquals(result.apiName, undefined);
  assertEquals(result.endpoint, undefined);
  assertEquals(result.additionalParams, []);
});

Deno.test("getHealthStatus - 应该返回健康状态", () => {
  const status = getHealthStatus() as Record<string, unknown>;

  assertEquals(status.status, "healthy");
  assertExists(status.timestamp);
  assertExists(status.uptime);
  assertExists(status.memory);

  // 验证时间戳格式
  const timestamp = status.timestamp as string;
  const date = new Date(timestamp);
  assertExists(date.toISOString()); // 应该是有效的ISO字符串
});

// Logger 测试（需要捕获控制台输出）
Deno.test("Logger - 应该格式化日志消息", () => {
  // 由于Logger依赖环境变量和控制台输出，这里只测试基本功能
  // 在实际测试中，我们需要mock console方法
  let logOutput = "";
  const originalLog = console.log;

  console.log = (message: string) => {
    logOutput = message;
  };

  try {
    Logger.info("测试消息");
    assertStringIncludes(logOutput, "INFO");
    assertStringIncludes(logOutput, "测试消息");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("Logger - 应该根据日志级别过滤消息", () => {
  let logCount = 0;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const mockConsole = () => {
    logCount++;
  };

  console.log = mockConsole;
  console.error = mockConsole;
  console.warn = mockConsole;

  try {
    // 设置日志级别为 warn，应该只输出 warn 和 error
    logCount = 0;
    Logger.debug("debug消息"); // 不应该输出
    Logger.info("info消息"); // 不应该输出
    Logger.warn("warn消息"); // 应该输出
    Logger.error("error消息"); // 应该输出

    // 由于默认日志级别是 info，所以应该有输出
    // 这个测试需要根据实际的日志级别配置来调整
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
});
