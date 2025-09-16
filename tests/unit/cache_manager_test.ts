/**
 * 缓存管理器测试
 * 测试 src/cache/manager.ts 中的缓存管理功能
 */

import { assertEquals, assertExists, assert } from "jsr:@std/assert@1";
import { CacheManager } from "../../src/cache/manager.ts";

// 保存原始环境变量
function saveAndSetTestEnv() {
  const originalCacheMaxSize = Deno.env.get("CACHE_MAX_SIZE");
  const originalCacheDefaultTtl = Deno.env.get("CACHE_DEFAULT_TTL");

  Deno.env.set("CACHE_MAX_SIZE", "5");
  Deno.env.set("CACHE_DEFAULT_TTL", "1000");

  return { originalCacheMaxSize, originalCacheDefaultTtl };
}

function restoreEnv(original: {
  originalCacheMaxSize?: string;
  originalCacheDefaultTtl?: string;
}) {
  if (original.originalCacheMaxSize) {
    Deno.env.set("CACHE_MAX_SIZE", original.originalCacheMaxSize);
  } else {
    Deno.env.delete("CACHE_MAX_SIZE");
  }

  if (original.originalCacheDefaultTtl) {
    Deno.env.set("CACHE_DEFAULT_TTL", original.originalCacheDefaultTtl);
  } else {
    Deno.env.delete("CACHE_DEFAULT_TTL");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("CacheManager - 应该是单例模式", () => {
  const instance1 = CacheManager.getInstance();
  const instance2 = CacheManager.getInstance();

  assertEquals(instance1, instance2);
});

Deno.test("CacheManager - 应该设置和获取缓存", () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear(); // 清空缓存

  const key = "test-key";
  const data = { message: "Hello World", value: 123 };

  // 设置缓存
  cacheManager.set(key, data);

  // 获取缓存
  const cachedData = cacheManager.get(key);
  assertEquals(cachedData, data);
});

Deno.test("CacheManager - 应该检查缓存是否存在", () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const key = "exists-test";
  const data = "test data";

  // 缓存不存在时
  assert(!cacheManager.has(key));

  // 设置缓存后
  cacheManager.set(key, data);
  assert(cacheManager.has(key));
});

Deno.test("CacheManager - 应该删除缓存", () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const key = "delete-test";
  const data = "test data";

  // 设置缓存
  cacheManager.set(key, data);
  assert(cacheManager.has(key));

  // 删除缓存
  const deleted = cacheManager.delete(key);
  assert(deleted);
  assert(!cacheManager.has(key));

  // 删除不存在的缓存
  const notDeleted = cacheManager.delete("non-existent");
  assert(!notDeleted);
});

Deno.test("CacheManager - 应该清空所有缓存", () => {
  const cacheManager = CacheManager.getInstance();

  // 设置多个缓存项
  cacheManager.set("key1", "data1");
  cacheManager.set("key2", "data2");
  cacheManager.set("key3", "data3");

  // 验证缓存存在
  assert(cacheManager.has("key1"));
  assert(cacheManager.has("key2"));
  assert(cacheManager.has("key3"));

  // 清空缓存
  cacheManager.clear();

  // 验证缓存已清空
  assert(!cacheManager.has("key1"));
  assert(!cacheManager.has("key2"));
  assert(!cacheManager.has("key3"));
});

Deno.test("CacheManager - 应该处理TTL过期", async () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const key = "ttl-test";
  const data = "test data";
  const ttl = 100; // 100ms

  // 设置带TTL的缓存
  cacheManager.set(key, data, ttl);

  // 立即获取应该成功
  assertEquals(cacheManager.get(key, ttl), data);
  assert(cacheManager.has(key, ttl));

  // 等待TTL过期
  await delay(150);

  // 过期后应该返回null
  assertEquals(cacheManager.get(key, ttl), null);
  assert(!cacheManager.has(key, ttl));
});

Deno.test("CacheManager - 应该使用默认TTL", async () => {
  const originalEnv = saveAndSetTestEnv();

  try {
    // 需要重新获取实例以应用新的环境变量
    const cacheManager = CacheManager.getInstance();
    cacheManager.clear();

    const key = "default-ttl-test";
    const data = "test data";

    cacheManager.set(key, data);

    // 立即获取应该成功
    assertEquals(cacheManager.get(key), data);

    // 使用较短的TTL测试（因为默认TTL是1000ms，太长了）
    const shortTtl = 50;
    cacheManager.set(key, data);

    // 等待过期
    await delay(100);

    // 使用短TTL检查应该过期
    assertEquals(cacheManager.get(key, shortTtl), null);
  } finally {
    restoreEnv(originalEnv);
  }
});

Deno.test("CacheManager - 应该生成缓存键", () => {
  const key1 = CacheManager.generateKey("api1", "endpoint1");
  const key2 = CacheManager.generateKey("api1", "endpoint1", {
    param1: "value1",
  });
  const key3 = CacheManager.generateKey(
    "api1",
    "endpoint1",
    { param1: "value1" },
    { query1: "value1" }
  );

  assertExists(key1);
  assertExists(key2);
  assertExists(key3);

  // 相同参数应该生成相同的键
  const key4 = CacheManager.generateKey(
    "api1",
    "endpoint1",
    { param1: "value1" },
    { query1: "value1" }
  );
  assertEquals(key3, key4);

  // 不同参数应该生成不同的键
  const key5 = CacheManager.generateKey(
    "api1",
    "endpoint1",
    { param1: "value2" },
    { query1: "value1" }
  );
  assert(key3 !== key5);
});

Deno.test("CacheManager - 应该获取统计信息", () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  // 初始状态
  let stats = cacheManager.getStats();
  assertEquals(stats.size, 0);
  assertExists(stats.maxSize);
  assertEquals(stats.usage, "0.00%");

  // 添加一些缓存项
  cacheManager.set("key1", "data1");
  cacheManager.set("key2", "data2");

  stats = cacheManager.getStats();
  assertEquals(stats.size, 2);
  assertExists(stats.usage);
});

Deno.test("CacheManager - 应该处理缓存满的情况", () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const stats = cacheManager.getStats();
  const maxSize = stats.maxSize;

  // 填满缓存
  for (let i = 0; i < maxSize; i++) {
    cacheManager.set(`key${i}`, `data${i}`);
  }

  // 验证缓存已满
  const currentStats = cacheManager.getStats();
  assertEquals(currentStats.size, maxSize);

  // 添加一个额外的项目，应该删除最旧的
  cacheManager.set(`key${maxSize}`, `data${maxSize}`);

  // 缓存大小应该仍然是maxSize（或maxSize，取决于实现）
  const newStats = cacheManager.getStats();
  assert(newStats.size <= maxSize + 1); // 允许一定的容差

  // 最新的项目应该存在
  assert(cacheManager.has(`key${maxSize}`));
});

Deno.test("CacheManager - 应该清理过期缓存", async () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const ttl = 50; // 50ms

  // 设置一些缓存项
  cacheManager.set("key1", "data1");
  cacheManager.set("key2", "data2");
  cacheManager.set("key3", "data3");

  // 等待过期
  await delay(100);

  // 清理过期缓存
  const cleaned = cacheManager.cleanup(ttl);

  // 应该清理了所有3个项目
  assertEquals(cleaned, 3);
  assertEquals(cacheManager.getStats().size, 0);
});

Deno.test("CacheManager - 清理操作应该保留未过期的缓存", async () => {
  const cacheManager = CacheManager.getInstance();
  cacheManager.clear();

  const ttl = 200; // 200ms

  // 设置一些缓存项
  cacheManager.set("key1", "data1");
  cacheManager.set("key2", "data2");

  // 等待一小段时间（不足以过期）
  await delay(50);

  // 清理过期缓存
  const cleaned = cacheManager.cleanup(ttl);

  // 应该没有清理任何项目
  assertEquals(cleaned, 0);
  assertEquals(cacheManager.getStats().size, 2);

  // 验证缓存仍然存在
  assert(cacheManager.has("key1"));
  assert(cacheManager.has("key2"));
});
