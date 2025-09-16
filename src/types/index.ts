/**
 * API配置相关类型定义
 */

// 认证配置类型
export interface AuthConfig {
  type: "none" | "apikey" | "bearer" | "basic";
  key?: string;
  value?: string;
  header?: string;
}

// 参数配置类型
export interface ParameterConfig {
  type: "path" | "query" | "header";
  required: boolean;
  description: string;
}

// 端点配置类型
export interface EndpointConfig {
  path: string;
  method: string;
  cacheDuration?: number;
  description: string;
  parameters?: Record<string, ParameterConfig>;
  headers?: Record<string, string>;
}

// API配置类型
export interface ApiConfig {
  name: string;
  description: string;
  baseUrl: string;
  auth?: AuthConfig;
  endpoints: Record<string, EndpointConfig>;
}

// 缓存项类型
export interface CacheItem {
  data: unknown;
  timestamp: number;
}

// HTTP响应类型
export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

// 请求参数类型
export interface RequestParams {
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
}

// 代理请求配置类型
export interface ProxyRequestConfig {
  apiName: string;
  endpoint: string;
  params: RequestParams;
  customHeaders?: Record<string, string>;
}

// 服务器配置类型
export interface ServerConfig {
  port: number;
  host?: string;
  corsEnabled?: boolean;
}

// 日志级别类型
export type LogLevel = "debug" | "info" | "warn" | "error";

// 日志配置类型
export interface LogConfig {
  level: LogLevel;
  timestamp?: boolean;
  colorize?: boolean;
}
