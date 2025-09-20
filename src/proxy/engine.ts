import type {
  ApiConfig,
  EndpointConfig,
  RequestParams,
} from "../types/index.ts";
import { ConfigManager } from "../config/manager.ts";
import { CacheManager } from "../cache/manager.ts";

/**
 * API代理引擎类
 */
export class ProxyEngine {
  private static instance: ProxyEngine;
  private configManager: ConfigManager;
  private cacheManager: CacheManager;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * 获取代理引擎单例实例
   */
  public static getInstance(): ProxyEngine {
    if (!ProxyEngine.instance) {
      ProxyEngine.instance = new ProxyEngine();
    }
    return ProxyEngine.instance;
  }

  /**
   * 执行API代理请求
   */
  public async proxyRequest(
    apiName: string,
    endpoint: string,
    params: RequestParams,
    customHeaders: Record<string, string> = {}
  ): Promise<unknown> {
    const config = this.configManager.getConfig(apiName);
    if (!config) {
      throw new Error(`API配置 ${apiName} 不存在`);
    }

    const endpointConfig = config.endpoints[endpoint];
    if (!endpointConfig) {
      throw new Error(`端点 ${endpoint} 不存在于API ${apiName} 中`);
    }

    // 生成缓存键
    const cacheKey = CacheManager.generateKey(
      apiName,
      endpoint,
      params.pathParams,
      params.queryParams
    );

    // 检查缓存
    const cacheDuration = endpointConfig.cacheDuration || 0;
    if (cacheDuration > 0) {
      const cachedData = this.cacheManager.get(cacheKey, cacheDuration);
      if (cachedData !== null) {
        console.log(`从缓存返回数据: ${cacheKey}`);
        return cachedData;
      }
    }

    try {
      // 构建请求URL和头部
      const url = this.buildUrl(
        config,
        endpointConfig,
        params.pathParams,
        params.queryParams
      );
      const headers = this.buildHeaders(config, endpointConfig, {
        ...params.headers,
        ...customHeaders,
      });

      console.log(`代理请求: ${endpointConfig.method} ${url}`);

      // 发送请求
      const response = await fetch(url, {
        method: endpointConfig.method,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 更新缓存
      if (cacheDuration > 0) {
        this.cacheManager.set(cacheKey, data, cacheDuration);
        console.log(`缓存数据: ${cacheKey}`);
      }

      // 如果是 forex:quote 并且是 XAU，尝试追加每小时快照到历史中
      try {
        if (apiName === "forex" && endpoint === "quote") {
          const instrument =
            params.pathParams.instrument || params.pathParams["instrument"];
          if (instrument && instrument.toUpperCase() === "XAU") {
            // 尝试从响应中提取价格（支持多种结构）
            // 如果返回数组，尝试取第一个对象
            const sample = Array.isArray(data) ? data[0] : data;

            // 即使没有明确的 price 字段，也保存完整响应对象（或数组的第一个对象）作为快照
            if (sample) {
              const histKey = `forex:history:${instrument.toUpperCase()}`;
              const timestamp = Date.now();
              const snapshotValue = sample || data;
              this.cacheManager.appendHourlySnapshot(histKey, {
                timestamp,
                value: snapshotValue,
              });
              try {
                const short = JSON.stringify(snapshotValue);
                console.log(
                  `追加历史快照: ${histKey} @ ${new Date(
                    timestamp
                  ).toISOString()} = ${short}`
                );
              } catch (_e) {
                console.log(
                  `追加历史快照: ${histKey} @ ${new Date(
                    timestamp
                  ).toISOString()}`
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn("追加历史快照失败:", err);
      }

      return data;
    } catch (error) {
      console.error(`API代理请求失败 [${apiName}:${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * 构建请求URL
   */
  private buildUrl(
    config: ApiConfig,
    endpoint: EndpointConfig,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>
  ): string {
    let url = config.baseUrl + endpoint.path;

    // 替换路径参数
    for (const [key, value] of Object.entries(pathParams)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }

    // 添加查询参数
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(queryParams)) {
      urlObj.searchParams.set(key, value);
    }

    // 添加认证参数
    if (
      config.auth?.type === "apikey" &&
      config.auth.key &&
      config.auth.value
    ) {
      urlObj.searchParams.set(config.auth.key, config.auth.value);
    }

    return urlObj.toString();
  }

  /**
   * 构建请求头
   */
  private buildHeaders(
    config: ApiConfig,
    endpoint: EndpointConfig,
    customHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...endpoint.headers,
      ...customHeaders,
    };

    // 添加认证头
    if (config.auth?.type === "bearer" && config.auth.value) {
      headers.Authorization = `Bearer ${config.auth.value}`;
    } else if (
      config.auth?.type === "apikey" &&
      config.auth.header &&
      config.auth.value
    ) {
      headers[config.auth.header] = config.auth.value;
    } else if (config.auth?.type === "basic" && config.auth.value) {
      headers.Authorization = `Basic ${config.auth.value}`;
    }

    return headers;
  }

  /**
   * 验证请求参数
   */
  public validateParams(
    apiName: string,
    endpoint: string,
    params: RequestParams
  ): { valid: boolean; errors: string[] } {
    const config = this.configManager.getConfig(apiName);
    if (!config) {
      return { valid: false, errors: [`API配置 ${apiName} 不存在`] };
    }

    const endpointConfig = config.endpoints[endpoint];
    if (!endpointConfig) {
      return {
        valid: false,
        errors: [`端点 ${endpoint} 不存在于API ${apiName} 中`],
      };
    }

    const errors: string[] = [];

    // 验证必需参数
    if (endpointConfig.parameters) {
      for (const [paramName, paramConfig] of Object.entries(
        endpointConfig.parameters
      )) {
        if (paramConfig.required) {
          let hasParam = false;

          switch (paramConfig.type) {
            case "path":
              hasParam = paramName in params.pathParams;
              break;
            case "query":
              hasParam = paramName in params.queryParams;
              break;
            case "header":
              hasParam = paramName in params.headers;
              break;
          }

          if (!hasParam) {
            errors.push(`缺少必需的${paramConfig.type}参数: ${paramName}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
