// PostgreSQL client wrapper using deno-postgres (pure Deno implementation)
// We dynamically import the module at runtime to avoid static type/import issues
// during tests and to keep DB usage optional.

// client is declared at module scope and initialized in initDb()
let client: any = null;

export async function initDb(): Promise<void> {
  if (client) return;
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    console.warn("DATABASE_URL 未设置，跳过数据库初始化");
    return;
  }

  try {
    const mod = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const Client = mod.Client;
    // Client can be constructed with a connection string
    client = new Client(databaseUrl);
    await client.connect();
    console.log("✅ 已连接到数据库");
  } catch (err) {
    console.warn("⚠️ 连接数据库失败:", err);
    client = null;
  }
}

export async function closeDb(): Promise<void> {
  if (!client) return;
  try {
    await client.end();
    client = null;
  } catch (_e) {
    // ignore
  }
}

export async function insertSnapshot(
  instrument: string,
  timestamp: number,
  value: unknown
): Promise<void> {
  // 确保已连接（长连接模式：initDb 会建立并保持连接）
  if (!client) await initDb();
  if (!client) return;
  try {
    // 将毫秒时间戳转换为 JS Date 以便正确插入到 TIMESTAMP WITH TIME ZONE
    const ts = new Date(timestamp);
    // 将 value 序列化为 JSON 并以 JSONB 类型插入
    const json = JSON.stringify(value === undefined ? null : value);
    await client.queryArray(
      "INSERT INTO forex_history (instrument, ts, value) VALUES ($1, $2, $3::jsonb)",
      instrument,
      ts,
      json
    );
  } catch (err) {
    console.warn("⚠️ 插入快照到数据库失败:", err);
  }
}

export async function ensureSchema(): Promise<void> {
  if (!client) await initDb();
  if (!client) return;
  try {
    const create = `
      CREATE TABLE IF NOT EXISTS forex_history (
        id BIGSERIAL PRIMARY KEY,
        instrument VARCHAR(16) NOT NULL,
        ts TIMESTAMP WITH TIME ZONE NOT NULL,
        value JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_forex_history_instrument_ts ON forex_history (instrument, ts);
    `;
    await client.queryArray(create);
    console.log("✅ 已确保数据库表结构");
  } catch (err) {
    console.warn("⚠️ 确保数据库表失败:", err);
  }
}

export { client };

/**
 * 从数据库查询历史数据 (按 instrument, 可选 start/end 毫秒时间戳)
 * 返回数组：{ timestamp: number, value: number }，按时间升序
 */
export async function queryHistory(
  instrument: string,
  start?: number,
  end?: number
): Promise<Array<{ timestamp: number; value: number }>> {
  if (!client) await initDb();
  if (!client) return [];
  try {
    const params: any[] = [instrument];
    let idx = 2; // 参数占位从 $2 开始（$1 已经是 instrument）
    let where = "instrument = $1";
    if (start !== undefined) {
      where += ` AND ts >= $${idx}`;
      params.push(new Date(start));
      idx++;
    }
    if (end !== undefined) {
      where += ` AND ts <= $${idx}`;
      params.push(new Date(end));
      idx++;
    }

    const sql = `SELECT ts, value FROM forex_history WHERE ${where} ORDER BY ts ASC`;
    const res = await client.queryArray(sql, ...params);

    // res.rows may be an array of arrays [ts, value]
    const rows = res.rows || [];
    return rows.map((r: any) => {
      let val: any = r[1];
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch (_e) {
          // keep as string
        }
      }
      return { timestamp: new Date(r[0]).getTime(), value: val };
    });
  } catch (err) {
    console.warn("⚠️ 查询历史失败:", err);
    return [];
  }
}
