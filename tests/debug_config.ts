/**
 * 调试配置加载
 */

import { ConfigManager } from "../src/config/manager.ts";

console.log("=== 测试配置加载 ===");

// 测试默认配置
console.log("\n1. 测试默认配置:");
const defaultManager = ConfigManager.getInstance();
await defaultManager.loadConfigs();
console.log("Default configs:", Object.keys(defaultManager.getConfigs()));

console.log("\n2. 测试自定义配置路径:");
const testManager = ConfigManager.getInstance(
  "./tests/fixtures/test_apis.json"
);
await testManager.loadConfigs();
console.log("Test configs:", Object.keys(testManager.getConfigs()));

console.log("\n3. 配置详情:");
console.log(JSON.stringify(testManager.getConfigs(), null, 2));
