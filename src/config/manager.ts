import type { ApiConfig } from "../types/index.ts";
import { getEnvConfig } from "../env/manager.ts";

/**
 * ConfigManager is a singleton class responsible for managing API configurations.
 *
 * This class handles loading, processing, and providing access to API configurations
 * from JSON files. It supports environment variable substitution and provides
 * fallback to default configurations when the config file is not available.
 *
 * Key features:
 * - Singleton pattern for global configuration management
 * - Environment variable processing for secure credential handling
 * - Default configuration fallback
 * - Configuration validation and error handling
 * - Dynamic configuration reloading
 *
 * @example
 * ```typescript
 * const configManager = ConfigManager.getInstance('./config/apis.json');
 * await configManager.loadConfigs();
 *
 * const apiConfig = configManager.getConfig('forex');
 * const hasEndpoint = configManager.hasEndpoint('forex', 'quote');
 * ```
 *
 * @since 1.0.0
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private configs: Record<string, ApiConfig> = {};
  private configPath: string;

  private constructor(configPath = "./config/apis.json") {
    this.configPath = configPath;
  }

  /**
   * 获取配置管理器单例实例
   */
  public static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
  }

  /**
   * 加载API配置
   */
  public async loadConfigs(): Promise<void> {
    try {
      const configText = await Deno.readTextFile(this.configPath);
      this.configs = JSON.parse(configText);

      // 处理环境变量
      this.processEnvironmentVariables();

      console.log(`✅ 已加载 ${Object.keys(this.configs).length} 个API配置`);
    } catch (error) {
      console.error("❌ 加载API配置失败:", error);
      // 使用默认配置
      this.configs = this.getDefaultConfigs();
      console.log("📝 使用默认配置");
    }
  }

  /**
   * 处理环境变量
   */
  private processEnvironmentVariables(): void {
    const envConfig = getEnvConfig();

    for (const config of Object.values(this.configs)) {
      if (config.auth?.value?.startsWith("ENV:")) {
        const envKey = config.auth.value.replace("ENV:", "");
        let envValue;

        // 特殊处理已知的环境变量
        switch (envKey) {
          case "OPENWEATHER_API_KEY":
            envValue = envConfig.OPENWEATHER_API_KEY;
            break;
          default:
            envValue = Deno.env.get(envKey);
        }

        if (envValue) {
          config.auth.value = envValue;
        } else {
          console.warn(`⚠️ 环境变量 ${envKey} 未设置`);
        }
      }
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfigs(): Record<string, ApiConfig> {
    return {
      forex: {
        name: "外汇数据API",
        description: "Swissquote外汇报价数据",
        baseUrl:
          "https://forex-data-feed.swissquote.com/public-quotes/bboquotes",
        auth: { type: "none" },
        endpoints: {
          quote: {
            path: "/instrument/{instrument}/{currency}",
            method: "GET",
            cacheDuration: 5000,
            description: "获取指定货币对的外汇报价",
            parameters: {
              instrument: {
                type: "path",
                required: true,
                description: "交易品种 (如: XAU, EUR, GBP)",
              },
              currency: {
                type: "path",
                required: true,
                description: "基准货币 (如: USD, EUR)",
              },
            },
            headers: {
              "User-Agent": "ApiBox/2.0",
            },
          },
        },
      },
      httpbin: {
        name: "HTTP测试API",
        description: "HTTPBin.org测试API",
        baseUrl: "https://httpbin.org",
        auth: { type: "none" },
        endpoints: {
          get: {
            path: "/get",
            method: "GET",
            cacheDuration: 0,
            description: "测试GET请求",
          },
        },
      },
    };
  }

  /**
   * 获取所有API配置
   */
  public getConfigs(): Record<string, ApiConfig> {
    return this.configs;
  }

  /**
   * 获取指定API配置
   */
  public getConfig(apiName: string): ApiConfig | undefined {
    return this.configs[apiName];
  }

  /**
   * 检查API是否存在
   */
  public hasApi(apiName: string): boolean {
    return apiName in this.configs;
  }

  /**
   * 检查端点是否存在
   */
  public hasEndpoint(apiName: string, endpoint: string): boolean {
    const config = this.getConfig(apiName);
    return config ? endpoint in config.endpoints : false;
  }

  /**
   * 获取API列表
   */
  public getApiNames(): string[] {
    return Object.keys(this.configs);
  }

  /**
   * 重新加载配置
   */
  public async reloadConfigs(): Promise<void> {
    await this.loadConfigs();
  }
}
