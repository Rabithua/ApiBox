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
 * Initialize database tables for forex data
 */
export async function initializeForexTables(): Promise<void> {
  const db = getDatabase();

  try {
    // Create the main table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS forex_history (
        id SERIAL PRIMARY KEY,
        instrument VARCHAR(10) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(instrument, currency, timestamp)
      )
    `;

    await db.query(createTableSQL);
    Logger.info("📊 Forex history table created");

    // Create indexes separately
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_forex_history_instrument_currency 
       ON forex_history (instrument, currency)`,
      `CREATE INDEX IF NOT EXISTS idx_forex_history_timestamp 
       ON forex_history (timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_forex_history_created_at 
       ON forex_history (created_at)`,
    ];

    for (const indexSQL of indexes) {
      await db.query(indexSQL);
    }

    Logger.success(
      "✅ Forex history tables and indexes initialized successfully"
    );
  } catch (error) {
    Logger.error(`❌ Failed to initialize forex tables: ${error}`);
    throw error;
  }
}

/**
 * Save forex quote data to database
 */
export async function saveForexQuote(
  instrument: string,
  currency: string,
  data: any,
  timestamp?: Date
): Promise<void> {
  const db = getDatabase();

  const insertSQL = `
    INSERT INTO forex_history (instrument, currency, timestamp, data)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (instrument, currency, timestamp) DO UPDATE SET
      data = EXCLUDED.data,
      created_at = CURRENT_TIMESTAMP
  `;

  const queryTimestamp = timestamp || new Date();

  try {
    await db.query(insertSQL, [
      instrument.toUpperCase(),
      currency.toUpperCase(),
      queryTimestamp,
      JSON.stringify(data),
    ]);

    Logger.info(
      `📊 Forex data saved: ${instrument}/${currency} at ${queryTimestamp.toISOString()}`
    );
  } catch (error) {
    Logger.error(`❌ Failed to save forex data: ${error}`);
    throw error;
  }
}

/**
 * Get forex history data from database
 */
export async function getForexHistory(
  instrument: string,
  currency: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100,
  offset: number = 0
): Promise<{ data: any[]; total: number }> {
  const db = getDatabase();

  let whereClause = "WHERE instrument = $1 AND currency = $2";
  const params: any[] = [instrument.toUpperCase(), currency.toUpperCase()];
  let paramIndex = 3;

  if (startDate) {
    whereClause += ` AND timestamp >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND timestamp <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // Get total count
  const countSQL = `
    SELECT COUNT(*) as total 
    FROM forex_history 
    ${whereClause}
  `;

  // Get data with pagination
  const dataSQL = `
    SELECT id, instrument, currency, timestamp, data, created_at
    FROM forex_history 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  try {
    const [countResult, dataResult] = await Promise.all([
      db.query<{ total: number }>(countSQL, params.slice(0, paramIndex - 1)),
      db.query(dataSQL, params),
    ]);

    const total = countResult.rows[0]?.total || 0;

    Logger.info(
      `📈 Retrieved ${dataResult.rows.length} forex history records for ${instrument}/${currency}`
    );

    return {
      data: dataResult.rows.map((row) => ({
        ...row,
        data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
      })),
      total: Number(total),
    };
  } catch (error) {
    Logger.error(`❌ Failed to get forex history: ${error}`);
    throw error;
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
