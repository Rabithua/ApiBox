import type {
  RequestParams,
  EndpointConfig,
  ParameterConfig,
} from "../types/index.ts";
import { ConfigManager } from "../config/manager.ts";
import { ProxyEngine } from "../proxy/engine.ts";
import { CacheManager } from "../cache/manager.ts";
import {
  createJsonResponse,
  createErrorResponse,
  getCorsHeaders,
  parsePathParams,
  getHealthStatus,
  Logger,
} from "../utils/helpers.ts";

/**
 * 路由处理器类
 */
export class RouteHandler {
  private configManager: ConfigManager;
  private proxyEngine: ProxyEngine;
  private cacheManager: CacheManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.proxyEngine = ProxyEngine.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * 返回一个包含 emoji 的 SVG，用作 favicon
   */
  private handleFavicon(): Response {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:56px;line-height:64px;display:flex;align-items:center;justify-content:center">😈</div>
  </foreignObject>
</svg>`;

    const headers = new Headers({
      "Content-Type": "image/svg+xml; charset=utf-8",
      // 缓存一小时
      "Cache-Control": "public, max-age=3600",
      // 防止 CORS 问题（如果在浏览器中直接请求）
      "Access-Control-Allow-Origin": "*",
    });

    return new Response(svg, { status: 200, headers });
  }

  /**
   * 主要请求处理器
   */
  public async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const headers = getCorsHeaders();

    // 处理 OPTIONS 请求（CORS 预检）
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      // 健康检查
      if (url.pathname === "/health") {
        return createJsonResponse(getHealthStatus());
      }

      // API代理路由: /api/{apiName}/{endpoint}/{...params}
      if (url.pathname.startsWith("/api/")) {
        return await this.handleApiProxy(req, url);
      }

      // 根路径和文档路由
      if (url.pathname === "/" || url.pathname === "/api") {
        return this.handleDocumentation();
      }

      // favicon 路由 - 返回包含 emoji 的 SVG 以作为图标
      if (url.pathname === "/favicon.ico") {
        return this.handleFavicon();
      }

      // 缓存统计路由
      if (url.pathname === "/stats") {
        return this.handleStats();
      }

      // 404 处理
      return this.handle404();
    } catch (error) {
      Logger.error(`请求处理错误: ${error}`);
      return createErrorResponse("内部服务器错误", 500, {
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  /**
   * 处理API代理请求
   */
  private async handleApiProxy(req: Request, url: URL): Promise<Response> {
    const { apiName, endpoint, additionalParams } = parsePathParams(
      url.pathname,
      "/api/"
    );

    if (!apiName || !endpoint) {
      return createErrorResponse("无效的API路径", 400, {
        format: "/api/{apiName}/{endpoint}/{...params}",
        available_apis: this.configManager.getApiNames(),
      });
    }

    // 检查API是否存在
    if (!this.configManager.hasApi(apiName)) {
      return createErrorResponse("API不存在", 404, {
        api: apiName,
        available_apis: this.configManager.getApiNames(),
      });
    }

    // 检查端点是否存在
    if (!this.configManager.hasEndpoint(apiName, endpoint)) {
      const config = this.configManager.getConfig(apiName)!;
      return createErrorResponse("端点不存在", 404, {
        endpoint,
        api: apiName,
        available_endpoints: Object.keys(config.endpoints),
      });
    }

    const config = this.configManager.getConfig(apiName)!;
    const endpointConfig = config.endpoints[endpoint];

    // 检查HTTP方法
    if (req.method !== endpointConfig.method) {
      return createErrorResponse("HTTP方法不支持", 405, {
        expected: endpointConfig.method,
        received: req.method,
      });
    }

    try {
      // 解析参数
      const params = this.parseRequestParams(
        url,
        additionalParams,
        config,
        endpoint
      );

      // 验证参数
      const validation = this.proxyEngine.validateParams(
        apiName,
        endpoint,
        params
      );
      if (!validation.valid) {
        return createErrorResponse("参数验证失败", 400, {
          errors: validation.errors,
        });
      }

      // 执行代理请求
      const data = await this.proxyEngine.proxyRequest(
        apiName,
        endpoint,
        params
      );
      return createJsonResponse(data);
    } catch (error) {
      Logger.error(`代理请求失败 [${apiName}:${endpoint}]: ${error}`);
      return createErrorResponse("代理请求失败", 500, {
        api: apiName,
        endpoint,
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  /**
   * 解析请求参数
   */
  private parseRequestParams(
    url: URL,
    additionalParams: string[],
    config: any,
    endpoint: string
  ): RequestParams {
    const pathParams: Record<string, string> = {};
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};

    const endpointConfig = config.endpoints[endpoint];

    // 从URL路径中提取参数
    let paramIndex = 0;
    if (endpointConfig.parameters) {
      for (const [paramName, paramConfig] of Object.entries(
        endpointConfig.parameters
      )) {
        if ((paramConfig as any).type === "path") {
          if (paramIndex < additionalParams.length) {
            pathParams[paramName] = additionalParams[paramIndex];
            paramIndex++;
          }
        }
      }
    }

    // 从查询参数中提取参数
    for (const [key, value] of url.searchParams.entries()) {
      queryParams[key] = value;
    }

    return { pathParams, queryParams, headers };
  }

  /**
   * 处理文档请求
   */
  private handleDocumentation(): Response {
    const configs = this.configManager.getConfigs();
    const apiList = Object.entries(configs).map(([key, config]) => ({
      name: key,
      title: config.name,
      description: config.description,
      baseUrl: config.baseUrl,
      auth: config.auth?.type || "none",
      endpoints: Object.entries(config.endpoints).map(([epKey, epConfig]) => ({
        name: epKey,
        path: `/api/${key}/${epKey}${epConfig.path}`,
        method: epConfig.method,
        description: epConfig.description,
        cacheDuration: epConfig.cacheDuration || 0,
        parameters: epConfig.parameters || {},
      })),
    }));

    const documentation = {
      service: "ApiBox - 通用API代理服务",
      version: "2.0.0",
      description: "支持多种API的统一代理服务",
      apis: apiList,
      usage: {
        format: "/api/{apiName}/{endpoint}/{...params}",
        examples: [
          "/api/forex/quote/XAU/USD",
          "/api/httpbin/get",
          "/api/weather/current?q=Beijing&units=metric",
        ],
      },
      endpoints: {
        documentation: "GET /api - 查看此文档",
        health: "GET /health - 健康检查",
        stats: "GET /stats - 缓存统计",
      },
      features: [
        "统一的API接口",
        "智能缓存机制",
        "CORS支持",
        "参数验证",
        "多种认证方式",
        "详细错误处理",
        "实时日志",
      ],
    };

    return createJsonResponse(documentation);
  }

  /**
   * 处理统计信息请求
   */
  private handleStats(): Response {
    const cacheStats = this.cacheManager.getStats();
    const configs = this.configManager.getConfigs();

    const stats = {
      timestamp: new Date().toISOString(),
      apis: {
        total: Object.keys(configs).length,
        list: Object.keys(configs),
      },
      cache: cacheStats,
      health: getHealthStatus(),
    };

    return createJsonResponse(stats);
  }

  /**
   * 处理404错误
   */
  private handle404(): Response {
    return createErrorResponse("未找到请求的资源", 404, {
      available_endpoints: [
        "/api - API文档",
        "/health - 健康检查",
        "/stats - 统计信息",
        "/api/{apiName}/{endpoint} - API代理",
      ],
      suggestion: "访问 /api 查看完整的API文档",
    });
  }
}
