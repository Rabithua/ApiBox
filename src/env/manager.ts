/**
 * 环境变量管理器
 */

export interface EnvConfig {
  // 服务器配置
  PORT: number;
  HOST: string;

  // API Keys
  OPENWEATHER_API_KEY?: string;

  // 缓存配置
  CACHE_MAX_SIZE: number;
  CACHE_DEFAULT_TTL: number;

  // 日志配置
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  LOG_COLORIZE: boolean;

  // CORS配置
  CORS_ORIGIN: string;
  CORS_METHODS: string;
  CORS_HEADERS: string;

  // 健康检查
  HEALTH_CHECK_ENABLED: boolean;
}

/**
 * 环境变量管理器类
 */
export class EnvManager {
  private static instance: EnvManager;
  private config: EnvConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 获取环境变量管理器单例实例
   */
  public static getInstance(): EnvManager {
    if (!EnvManager.instance) {
      EnvManager.instance = new EnvManager();
    }
    return EnvManager.instance;
  }

  /**
   * 加载环境变量配置
   */
  private loadConfig(): EnvConfig {
    // 先尝试加载 .env 文件
    this.loadEnvFile();

    return {
      // 服务器配置
      PORT: parseInt(Deno.env.get("PORT") || "8000"),
      HOST: Deno.env.get("HOST") || "0.0.0.0",

      // API Keys
      OPENWEATHER_API_KEY: Deno.env.get("OPENWEATHER_API_KEY"),

      // 缓存配置
      CACHE_MAX_SIZE: parseInt(Deno.env.get("CACHE_MAX_SIZE") || "1000"),
      CACHE_DEFAULT_TTL: parseInt(
        Deno.env.get("CACHE_DEFAULT_TTL") || "300000"
      ),

      // 日志配置
      LOG_LEVEL: (Deno.env.get("LOG_LEVEL") || "info") as
        | "debug"
        | "info"
        | "warn"
        | "error",
      LOG_COLORIZE: Deno.env.get("LOG_COLORIZE") !== "false",

      // CORS配置
      CORS_ORIGIN: Deno.env.get("CORS_ORIGIN") || "*",
      CORS_METHODS:
        Deno.env.get("CORS_METHODS") || "GET,POST,PUT,DELETE,OPTIONS",
      CORS_HEADERS:
        Deno.env.get("CORS_HEADERS") || "Content-Type,Authorization,X-API-Key",

      // 健康检查
      HEALTH_CHECK_ENABLED: Deno.env.get("HEALTH_CHECK_ENABLED") !== "false",
    };
  }

  /**
   * 加载 .env 文件
   */
  private loadEnvFile(): void {
    try {
      const envContent = Deno.readTextFileSync(".env");
      const lines = envContent.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 跳过注释和空行
        if (trimmedLine.startsWith("#") || !trimmedLine) {
          continue;
        }

        // 解析 KEY=VALUE 格式
        const equalIndex = trimmedLine.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();

          // 如果环境变量中没有设置，则使用 .env 文件中的值
          if (!Deno.env.get(key)) {
            Deno.env.set(key, value);
          }
        }
      }

      console.log("✅ 已加载 .env 文件");
    } catch (error) {
      // .env 文件不存在或无法读取，使用默认配置
      if (!(error instanceof Deno.errors.NotFound)) {
        console.warn("⚠️ 无法读取 .env 文件:", error);
      }
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): EnvConfig {
    return this.config;
  }

  /**
   * 获取指定配置项
   */
  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  /**
   * 重新加载配置
   */
  public reload(): void {
    this.config = this.loadConfig();
  }

  /**
   * 验证必需的环境变量
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证端口号
    if (this.config.PORT < 1 || this.config.PORT > 65535) {
      errors.push("PORT 必须在 1-65535 范围内");
    }

    // 验证缓存配置
    if (this.config.CACHE_MAX_SIZE < 1) {
      errors.push("CACHE_MAX_SIZE 必须大于 0");
    }

    if (this.config.CACHE_DEFAULT_TTL < 0) {
      errors.push("CACHE_DEFAULT_TTL 不能为负数");
    }

    // 验证日志级别
    const validLogLevels = ["debug", "info", "warn", "error"];
    if (!validLogLevels.includes(this.config.LOG_LEVEL)) {
      errors.push(`LOG_LEVEL 必须是以下值之一: ${validLogLevels.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 打印配置信息（隐藏敏感信息）
   */
  public printConfig(): void {
    const config = { ...this.config };

    // 隐藏敏感信息
    if (config.OPENWEATHER_API_KEY) {
      config.OPENWEATHER_API_KEY = "***" + config.OPENWEATHER_API_KEY.slice(-4);
    }

    console.log("📋 环境配置:");
    console.table(config);
  }
}
