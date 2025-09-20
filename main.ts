/**
 * ApiBox - 通用API代理服务
 * 主启动文件
 */

import { ConfigManager } from "./src/config/manager.ts";
import { RouteHandler } from "./src/routes/handler.ts";
import { Logger } from "./src/utils/helpers.ts";
import { EnvManager } from "./src/env/manager.ts";
import { startHourlyCollector } from "./src/scheduler/collector.ts";

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    Logger.info("🚀 正在启动 ApiBox 通用API代理服务...");

    // 初始化环境变量管理器
    const envManager = EnvManager.getInstance();
    const envConfig = envManager.getConfig();

    // 验证环境变量
    const validation = envManager.validate();
    if (!validation.valid) {
      Logger.error("❌ 环境变量验证失败:");
      validation.errors.forEach((error) => Logger.error(`   - ${error}`));
      Deno.exit(1);
    }

    // 打印配置信息（在debug模式下）
    if (envConfig.LOG_LEVEL === "debug") {
      envManager.printConfig();
    }

    // 初始化配置管理器
    const configManager = ConfigManager.getInstance();
    await configManager.loadConfigs();

    // 初始化路由处理器
    const routeHandler = new RouteHandler();

    // 显示启动信息
    const configs = configManager.getConfigs();
    Logger.success(`🚀 ApiBox 通用API代理服务启动在端口 ${envConfig.PORT}`);
    Logger.info(`📡 已配置 ${Object.keys(configs).length} 个API:`);

    for (const [key, config] of Object.entries(configs)) {
      const endpointCount = Object.keys(config.endpoints).length;
      Logger.info(`   - ${key}: ${config.name} (${endpointCount} 个端点)`);
    }

    Logger.info(`🌐 访问地址: http://localhost:${envConfig.PORT}`);
    Logger.info(`📖 API 使用说明: http://localhost:${envConfig.PORT}/api`);
    Logger.info(`📊 统计信息: http://localhost:${envConfig.PORT}/stats`);
    Logger.info(`💊 健康检查: http://localhost:${envConfig.PORT}/health`);
    Logger.info(`💰 示例请求:`);
    Logger.info(
      `   - http://localhost:${envConfig.PORT}/api/forex/quote/XAU/USD`
    );
    Logger.info(`   - http://localhost:${envConfig.PORT}/api/httpbin/get`);
    Logger.info(
      `   - http://localhost:${envConfig.PORT}/api/weather/current?q=Beijing&units=metric`
    );

    // 启动HTTP服务器
    const server = Deno.serve(
      {
        port: envConfig.PORT,
        hostname: envConfig.HOST,
        onListen: ({ port, hostname }) => {
          Logger.success(`🎯 服务器监听在 ${hostname}:${port}`);
        },
      },
      (req: Request) => routeHandler.handleRequest(req)
    );

    // 优雅关闭处理
    const shutdown = () => {
      Logger.info("🛑 正在关闭服务器...");
      try {
        // 关闭 HTTP 服务器
        server.shutdown();
      } catch (_e) {
        // ignore
      }
      // 关闭数据库连接（如果存在）
      try {
        // 动态导入并调用 closeDb
        import("./src/db/client.ts")
          .then((mod) => {
            if (typeof mod.closeDb === "function") {
              mod.closeDb().catch(() => {});
            }
          })
          .catch(() => {});
      } catch (_e) {
        // ignore
      }

      Logger.success("✅ 服务器已关闭");
      Deno.exit(0);
    };

    // 监听关闭信号
    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);

    // 等待服务器完成
    await server.finished;
    // 启动每小时采集（在服务器启动后）
    try {
      startHourlyCollector();
      Logger.info("定时采集已启动（按整点每小时）");
    } catch (err) {
      Logger.warn(`启动定时采集失败: ${err}`);
    }
  } catch (error) {
    Logger.error(`❌ 服务器启动失败: ${error}`);
    Deno.exit(1);
  }
}

// 启动服务器
if (import.meta.main) {
  await startServer();
}
