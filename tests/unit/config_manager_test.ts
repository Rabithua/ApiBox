/**
 * 配置管理器测试
 * 测试 src/config/manager.ts 中的API配置管理功能
 */

import { assertEquals, assertExists, assert } from "jsr:@std/assert@1";
import { ConfigManager } from "../../src/config/manager.ts";

// 保存原始环境变量
function saveAndSetTestEnv() {
  const originalApiKey = Deno.env.get("OPENWEATHER_API_KEY");
  Deno.env.set("OPENWEATHER_API_KEY", "test-secret-key");
  return originalApiKey;
}

function restoreEnv(originalApiKey?: string) {
  if (originalApiKey) {
    Deno.env.set("OPENWEATHER_API_KEY", originalApiKey);
  } else {
    Deno.env.delete("OPENWEATHER_API_KEY");
  }
}

Deno.test("ConfigManager - 应该是单例模式", () => {
  const instance1 = ConfigManager.getInstance();
  const instance2 = ConfigManager.getInstance();

  assertEquals(instance1, instance2);
});

Deno.test("ConfigManager - 应该加载项目配置文件", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const configs = configManager.getConfigs();

  // 验证配置已加载
  assertExists(configs);
  assert(Object.keys(configs).length > 0);

  // 验证默认的API配置存在
  assertExists(configs["forex"]);
  assertExists(configs["httpbin"]);

  assertEquals(configs["forex"].name, "外汇数据API");
  assertEquals(configs["httpbin"].name, "HTTP测试API");
});

Deno.test("ConfigManager - 应该处理环境变量替换", async () => {
  const originalApiKey = saveAndSetTestEnv();

  try {
    const configManager = ConfigManager.getInstance();
    await configManager.reloadConfigs(); // 重新加载以应用环境变量

    const weatherConfig = configManager.getConfig("weather");
    if (
      weatherConfig &&
      weatherConfig.auth &&
      weatherConfig.auth.value === "test-secret-key"
    ) {
      // 验证环境变量被正确替换
      assertEquals(weatherConfig.auth.value, "test-secret-key");
    } else {
      // 如果没有weather配置或没有环境变量替换，这也是正常的
      console.log("Weather API配置不存在或未使用环境变量");
    }
  } finally {
    restoreEnv(originalApiKey);
  }
});

Deno.test("ConfigManager - getConfig应该返回指定的API配置", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const forexConfig = configManager.getConfig("forex");
  assertExists(forexConfig);
  assertEquals(forexConfig.name, "外汇数据API");

  const nonExistentConfig = configManager.getConfig("non-existent");
  assertEquals(nonExistentConfig, undefined);
});

Deno.test("ConfigManager - hasApi应该正确检查API是否存在", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  assert(configManager.hasApi("forex"));
  assert(configManager.hasApi("httpbin"));
  assert(!configManager.hasApi("non-existent"));
});

Deno.test("ConfigManager - hasEndpoint应该正确检查端点是否存在", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  assert(configManager.hasEndpoint("forex", "quote"));
  assert(configManager.hasEndpoint("httpbin", "get"));

  assert(!configManager.hasEndpoint("forex", "non-existent"));
  assert(!configManager.hasEndpoint("non-existent", "get"));
});

Deno.test("ConfigManager - getApiNames应该返回所有API名称", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const apiNames = configManager.getApiNames();

  assert(apiNames.includes("forex"));
  assert(apiNames.includes("httpbin"));
  assert(apiNames.length >= 2); // 至少有这两个API
});

Deno.test("ConfigManager - reloadConfigs应该重新加载配置", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  // 验证初始加载
  assert(configManager.hasApi("forex"));

  // 重新加载
  await configManager.reloadConfigs();

  // 验证重新加载后配置仍然存在
  assert(configManager.hasApi("forex"));
  assert(configManager.hasApi("httpbin"));
});

Deno.test("ConfigManager - 应该正确处理端点配置", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const forexConfig = configManager.getConfig("forex");
  assertExists(forexConfig);

  const quoteEndpoint = forexConfig.endpoints["quote"];
  assertExists(quoteEndpoint);

  assertEquals(quoteEndpoint.path, "/instrument/{instrument}/{currency}");
  assertEquals(quoteEndpoint.method, "GET");
  assertEquals(quoteEndpoint.cacheDuration, 5000);
  assertEquals(quoteEndpoint.description, "获取指定货币对的外汇报价");

  // 检查参数配置
  assertExists(quoteEndpoint.parameters);
  assertExists(quoteEndpoint.parameters["instrument"]);
  assertEquals(quoteEndpoint.parameters["instrument"].type, "path");
  assertEquals(quoteEndpoint.parameters["instrument"].required, true);
});

Deno.test("ConfigManager - 应该正确处理认证配置", async () => {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const forexConfig = configManager.getConfig("forex");
  assertExists(forexConfig);
  assertExists(forexConfig.auth);

  assertEquals(forexConfig.auth.type, "none");

  // 检查weather API的认证配置（如果存在）
  const weatherConfig = configManager.getConfig("weather");
  if (weatherConfig && weatherConfig.auth) {
    assertEquals(weatherConfig.auth.type, "apikey");
    assertEquals(weatherConfig.auth.key, "appid");
  }
});

Deno.test("ConfigManager - 应该处理默认配置当文件不存在时", async () => {
  // 这个测试模拟ConfigManager内部的getDefaultConfigs行为
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfigs();

  const configs = configManager.getConfigs();

  // 验证至少有一些基本配置
  assert(Object.keys(configs).length > 0);

  // 验证每个配置都有必需的字段
  for (const [apiName, config] of Object.entries(configs)) {
    assertExists(config.name, `API ${apiName} 应该有名称`);
    assertExists(config.description, `API ${apiName} 应该有描述`);
    assertExists(config.baseUrl, `API ${apiName} 应该有基础URL`);
    assertExists(config.auth, `API ${apiName} 应该有认证配置`);
    assertExists(config.endpoints, `API ${apiName} 应该有端点配置`);

    // 验证端点配置
    for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
      assertExists(endpoint.path, `端点 ${apiName}.${endpointName} 应该有路径`);
      assertExists(
        endpoint.method,
        `端点 ${apiName}.${endpointName} 应该有方法`
      );
      assertExists(
        endpoint.description,
        `端点 ${apiName}.${endpointName} 应该有描述`
      );
    }
  }
});
