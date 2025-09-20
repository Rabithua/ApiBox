/**
 * Database connection and management utilities
 * Provides PostgreSQL connection pool and database operations
 */

import { Pool, PoolClient } from "postgres";
import { Logger } from "./helpers.ts";
import { getEnvConfig } from "./env.ts";

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

/**
 * Database manager class
 * Handles connection pooling and database operations
 */
export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config?: Partial<DatabaseConfig>) {
    const envConfig = getEnvConfig();

    if (!envConfig.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    this.config = {
      url: envConfig.DATABASE_URL,
      maxConnections: config?.maxConnections || 10,
      connectionTimeout: config?.connectionTimeout || 30000,
      idleTimeout: config?.idleTimeout || 60000,
      ...config,
    };
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.warn("Database already initialized, skipping...");
      return;
    }

    try {
      Logger.info("🔄 Initializing database connection pool...");

      this.pool = new Pool(
        this.config.url,
        this.config.maxConnections || 10,
        true
      );

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      Logger.success(
        `✅ Database connection pool initialized with ${this.config.maxConnections} max connections`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.error(`❌ Failed to initialize database: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error("Database pool not initialized");
    }

    const client = await this.pool.connect();
    try {
      const result = await client.queryObject("SELECT 1 as test");
      if (result.rows.length === 0 || (result.rows[0] as any).test !== 1) {
        throw new Error("Database connection test failed");
      }
      Logger.info("🔍 Database connection test successful");
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error(
        "Database pool not initialized. Call initialize() first."
      );
    }

    return await this.pool.connect();
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getClient();
    try {
      const result = await client.queryObject<T>(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query and return the first row
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.queryObject("BEGIN");
      const result = await callback(client);
      await client.queryObject("COMMIT");
      return result;
    } catch (error) {
      await client.queryObject("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.pool) {
        return false;
      }

      await this.testConnection();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.error(`Database health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get connection pool stats
   */
  getPoolStats(): {
    totalConnections: number;
    idleConnections: number;
    busyConnections: number;
  } {
    if (!this.pool) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        busyConnections: 0,
      };
    }

    return {
      totalConnections: this.pool.size,
      idleConnections: this.pool.available,
      busyConnections: this.pool.size - this.pool.available,
    };
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    if (this.pool) {
      Logger.info("🔄 Closing database connection pool...");
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      Logger.success("✅ Database connection pool closed");
    }
  }

  /**
   * Get database connection status
   */
  get isConnected(): boolean {
    return this.isInitialized && this.pool !== null;
  }
}

/**
 * Global database manager instance
 */
let dbManager: DatabaseManager | null = null;

/**
 * Initialize the global database manager
 */
export async function initializeDatabase(
  config?: Partial<DatabaseConfig>
): Promise<DatabaseManager> {
  if (dbManager) {
    Logger.warn("Database manager already initialized");
    return dbManager;
  }

  dbManager = new DatabaseManager(config);
  await dbManager.initialize();
  return dbManager;
}

/**
 * Get the global database manager instance
 */
export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return dbManager;
}

/**
 * Close the global database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbManager) {
    await dbManager.close();
    dbManager = null;
  }
}

/**
 * Database health check for monitoring
 */
export async function databaseHealthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  connected: boolean;
  poolStats?: {
    totalConnections: number;
    idleConnections: number;
    busyConnections: number;
  };
  error?: string;
}> {
  try {
    if (!dbManager) {
      return {
        status: "unhealthy",
        connected: false,
        error: "Database not initialized",
      };
    }

    const isHealthy = await dbManager.healthCheck();
    const poolStats = dbManager.getPoolStats();

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      connected: dbManager.isConnected,
      poolStats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "unhealthy",
      connected: false,
      error: errorMessage,
    };
  }
}
