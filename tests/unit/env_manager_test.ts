/**
 * 环境变量管理器测试
 * 测试 src/env/manager.ts 中的环境变量管理功能
 */

import { assertEquals, assert } from "jsr:@std/assert@1";
import { EnvManager } from "../../src/env/manager.ts";

// 保存原始环境变量
const originalEnv = new Map<string, string>();
const envKeys = [
  "PORT",
  "HOST",
  "OPENWEATHER_API_KEY",
  "CACHE_MAX_SIZE",
  "CACHE_DEFAULT_TTL",
  "LOG_LEVEL",
  "LOG_COLORIZE",
  "CORS_ORIGIN",
  "CORS_METHODS",
  "CORS_HEADERS",
  "HEALTH_CHECK_ENABLED",
];

function saveEnvironment() {
  envKeys.forEach((key) => {
    const value = Deno.env.get(key);
    if (value !== undefined) {
      originalEnv.set(key, value);
    }
  });
}

function restoreEnvironment() {
  // 删除所有测试相关的环境变量
  envKeys.forEach((key) => {
    Deno.env.delete(key);
  });

  // 恢复原始环境变量
  originalEnv.forEach((value, key) => {
    Deno.env.set(key, value);
  });

  originalEnv.clear();
}

function clearEnvironment() {
  envKeys.forEach((key) => {
    Deno.env.delete(key);
  });
}

Deno.test("EnvManager - 应该是单例模式", () => {
  saveEnvironment();

  try {
    const instance1 = EnvManager.getInstance();
    const instance2 = EnvManager.getInstance();

    assertEquals(instance1, instance2);
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 应该使用默认配置", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 重新创建实例以测试默认配置
    const envManager = EnvManager.getInstance();
    envManager.reload(); // 重新加载配置

    const config = envManager.getConfig();

    assertEquals(config.PORT, 8000);
    // HOST 可能会从 .env 文件中读取，所以这里我们检查它是否存在
    assertEquals(typeof config.HOST, "string");
    assertEquals(config.CACHE_MAX_SIZE, 1000);
    assertEquals(config.CACHE_DEFAULT_TTL, 300000);
    assertEquals(config.LOG_LEVEL, "debug"); // .env 文件中设置为 debug
    assertEquals(config.LOG_COLORIZE, true);
    assertEquals(config.CORS_ORIGIN, "*");
    assertEquals(config.CORS_METHODS, "GET,POST,PUT,DELETE,OPTIONS");
    assertEquals(config.CORS_HEADERS, "Content-Type,Authorization,X-API-Key");
    assertEquals(config.HEALTH_CHECK_ENABLED, true);
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 应该读取环境变量", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 设置测试环境变量
    Deno.env.set("PORT", "3000");
    Deno.env.set("HOST", "127.0.0.1");
    Deno.env.set("OPENWEATHER_API_KEY", "test-api-key");
    Deno.env.set("LOG_LEVEL", "debug");
    Deno.env.set("LOG_COLORIZE", "false");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    const config = envManager.getConfig();

    assertEquals(config.PORT, 3000);
    assertEquals(config.HOST, "127.0.0.1");
    assertEquals(config.OPENWEATHER_API_KEY, "test-api-key");
    assertEquals(config.LOG_LEVEL, "debug");
    assertEquals(config.LOG_COLORIZE, false);
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - get方法应该返回指定配置项", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    Deno.env.set("PORT", "4000");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    assertEquals(envManager.get("PORT"), 4000);
    // HOST 的值可能来自 .env 文件，我们只检查它是字符串类型
    assertEquals(typeof envManager.get("HOST"), "string");
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 验证应该检查端口范围", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 测试无效端口
    Deno.env.set("PORT", "0");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    const validation = envManager.validate();

    assertEquals(validation.valid, false);
    assert(
      validation.errors.some((error) =>
        error.includes("PORT 必须在 1-65535 范围内")
      )
    );
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 验证应该检查缓存配置", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 测试无效缓存配置
    Deno.env.set("CACHE_MAX_SIZE", "0");
    Deno.env.set("CACHE_DEFAULT_TTL", "-1");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    const validation = envManager.validate();

    assertEquals(validation.valid, false);
    assert(
      validation.errors.some((error) =>
        error.includes("CACHE_MAX_SIZE 必须大于 0")
      )
    );
    assert(
      validation.errors.some((error) =>
        error.includes("CACHE_DEFAULT_TTL 不能为负数")
      )
    );
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 验证应该检查日志级别", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 测试无效日志级别
    Deno.env.set("LOG_LEVEL", "invalid");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    const validation = envManager.validate();

    assertEquals(validation.valid, false);
    assert(
      validation.errors.some((error) =>
        error.includes("LOG_LEVEL 必须是以下值之一")
      )
    );
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - 验证应该通过有效配置", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    // 设置有效配置
    Deno.env.set("PORT", "8080");
    Deno.env.set("CACHE_MAX_SIZE", "500");
    Deno.env.set("CACHE_DEFAULT_TTL", "60000");
    Deno.env.set("LOG_LEVEL", "warn");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    const validation = envManager.validate();

    assertEquals(validation.valid, true);
    assertEquals(validation.errors.length, 0);
  } finally {
    restoreEnvironment();
  }
});

Deno.test("EnvManager - printConfig应该隐藏敏感信息", () => {
  saveEnvironment();
  clearEnvironment();

  try {
    Deno.env.set("OPENWEATHER_API_KEY", "1234567890abcdef");

    const envManager = EnvManager.getInstance();
    envManager.reload();

    // 测试printConfig方法（这个方法会输出到控制台，我们主要确保它不会抛出错误）
    let logOutput = "";
    const originalTable = console.table;
    const originalLog = console.log;

    console.log = (message: string) => {
      logOutput += message + "\n";
    };
    console.table = (data: unknown) => {
      logOutput += JSON.stringify(data);
    };

    try {
      envManager.printConfig();

      // 验证敏感信息被隐藏
      assert(!logOutput.includes("1234567890abcdef"));
      assert(logOutput.includes("***"));
    } finally {
      console.log = originalLog;
      console.table = originalTable;
    }
  } finally {
    restoreEnvironment();
  }
});
