import type { CacheItem } from "../types/index.ts";
import { EnvManager } from "../env/manager.ts";

/**
 * 缓存管理器类
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem>;
  private maxSize: number;
  private defaultTtl: number;

  private constructor() {
    this.cache = new Map();

    // 从环境变量获取配置
    const envManager = EnvManager.getInstance();
    const envConfig = envManager.getConfig();
    this.maxSize = envConfig.CACHE_MAX_SIZE;
    this.defaultTtl = envConfig.CACHE_DEFAULT_TTL;
  }

  /**
   * 获取缓存管理器单例实例
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 设置缓存
   */
  public set(key: string, data: unknown, ttl?: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const item: CacheItem = {
      data,
      timestamp: Date.now(),
    };

    this.cache.set(key, item);

    // 设置自动过期
    if (ttl && ttl > 0) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  /**
   * 获取缓存
   */
  public get(key: string, ttl?: number): unknown | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    const now = Date.now();
    const cacheTtl = ttl || this.defaultTtl;

    // 检查是否过期
    if (cacheTtl > 0 && now - item.timestamp > cacheTtl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  public has(key: string, ttl?: number): boolean {
    return this.get(key, ttl) !== null;
  }

  /**
   * 删除缓存
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: ((this.cache.size / this.maxSize) * 100).toFixed(2) + "%",
    };
  }

  /**
   * 清理过期缓存
   */
  public cleanup(ttl?: number): number {
    const now = Date.now();
    const cacheTtl = ttl || this.defaultTtl;
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (cacheTtl > 0 && now - item.timestamp > cacheTtl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 生成缓存键
   */
  public static generateKey(
    apiName: string,
    endpoint: string,
    pathParams: Record<string, string> = {},
    queryParams: Record<string, string> = {}
  ): string {
    const pathParamsStr = JSON.stringify(pathParams);
    const queryParamsStr = JSON.stringify(queryParams);
    return `${apiName}:${endpoint}:${pathParamsStr}:${queryParamsStr}`;
  }
}
