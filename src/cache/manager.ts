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
  // 历史数据最大保存条数（默认 168 小时 = 7 天）
  private historyMaxEntries = 24 * 7;

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
   * 将单个小时的快照追加到指定历史队列（按整点采样）
   * key 例如: `forex:history:XAU`
   * snapshot: { timestamp: number, value: any }
   */
  public appendHourlySnapshot(
    key: string,
    snapshot: { timestamp: number; value: unknown }
  ): void {
    // 获取已有历史
    const existing = this.cache.get(key) as CacheItem | undefined;
    let history: Array<{ timestamp: number; value: unknown }> = [];

    if (existing && Array.isArray(existing.data)) {
      history = existing.data as Array<{ timestamp: number; value: unknown }>;
    }

    // 如果最后一条和当前小时相同（同一整点），则覆盖最后一条
    const last = history[history.length - 1];
    const lastHour = last ? Math.floor(last.timestamp / 3600000) : null;
    const curHour = Math.floor(snapshot.timestamp / 3600000);

    if (last && lastHour === curHour) {
      history[history.length - 1] = snapshot;
    } else {
      history.push(snapshot);
    }

    // 裁剪到最大条数
    if (history.length > this.historyMaxEntries) {
      history = history.slice(history.length - this.historyMaxEntries);
    }

    // 存回缓存（不使用 TTL，因为我们通过条数来控制历史长度）
    const item: CacheItem = { data: history, timestamp: Date.now() };
    this.cache.set(key, item);
  }

  /**
   * 获取历史数据。返回按时间升序的数组
   * start 和 end 是可选的 ISO 字符串或时间戳（毫秒）
   */
  public getHistory(
    key: string,
    start?: number,
    end?: number
  ): Array<{ timestamp: number; value: unknown }> {
    const existing = this.cache.get(key) as CacheItem | undefined;
    if (!existing || !Array.isArray(existing.data)) return [];

    let history = existing.data as Array<{ timestamp: number; value: unknown }>;

    // 过滤时间范围
    if (start !== undefined) {
      history = history.filter((h) => h.timestamp >= start);
    }
    if (end !== undefined) {
      history = history.filter((h) => h.timestamp <= end);
    }

    // 保证按时间升序
    history.sort((a, b) => a.timestamp - b.timestamp);
    return history;
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
