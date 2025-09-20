# 数据库支持文档

ApiBox 现在支持 PostgreSQL 数据库连接。本文档介绍如何配置和使用数据库功能。

## 配置

### 环境变量

在你的环境中设置以下变量：

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### 示例配置

```bash
# 本地开发环境
DATABASE_URL=postgresql://apibox:password@localhost:5432/apibox_dev

# 生产环境（使用连接池参数）
DATABASE_URL=postgresql://apibox:secure_password@prod-db:5432/apibox_prod?sslmode=require
```

## 功能特性

### 连接池管理

- 自动连接池管理，默认最大连接数：10
- 连接超时和空闲超时配置
- 优雅的连接关闭和资源清理

### 健康检查

访问 `/health/database` 或 `/api/health/database` 来检查数据库连接状态：

```json
{
  "status": "healthy",
  "connected": true,
  "poolStats": {
    "totalConnections": 2,
    "idleConnections": 2,
    "busyConnections": 0
  }
}
```

### 错误处理

- 如果 DATABASE_URL 未设置，服务将在无数据库模式下运行
- 数据库连接失败不会阻止服务启动
- 详细的错误日志和状态报告

## 使用示例

### 基本查询

```typescript
import { getDatabase } from "./src/utils/database.ts";

// 获取数据库实例
const db = getDatabase();

// 执行查询
const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);

// 获取单行结果
const user = await db.queryOne("SELECT * FROM users WHERE email = $1", [email]);
```

### 事务处理

```typescript
import { getDatabase } from "./src/utils/database.ts";

const db = getDatabase();

await db.transaction(async (client) => {
  await client.queryObject("INSERT INTO users (name, email) VALUES ($1, $2)", [
    name,
    email,
  ]);
  await client.queryObject(
    "INSERT INTO user_profiles (user_id, bio) VALUES ($1, $2)",
    [userId, bio]
  );
});
```

### 连接池状态

```typescript
import { getDatabase } from "./src/utils/database.ts";

const db = getDatabase();
const stats = db.getPoolStats();

console.log(`总连接数: ${stats.totalConnections}`);
console.log(`空闲连接数: ${stats.idleConnections}`);
console.log(`忙碌连接数: ${stats.busyConnections}`);
```

## 启动和关闭

### 服务启动

数据库连接在服务启动时自动初始化：

```bash
# 开发模式
deno task dev

# 生产模式
deno task start
```

### 优雅关闭

服务接收到 SIGINT 或 SIGTERM 信号时会优雅关闭数据库连接池。

## 日志示例

```
🚀 Starting ApiBox universal API proxy service...
🔄 Initializing database connection pool...
🔍 Database connection test successful
✅ Database connection pool initialized with 10 max connections
🗄️ Database connection established
🚀 ApiBox started on http://localhost:8000
🎯 Server listening on 0.0.0.0:8000
```

## 故障排除

### 常见问题

1. **连接失败**

   - 检查 DATABASE_URL 格式是否正确
   - 确认数据库服务器可访问
   - 验证用户名密码和数据库名称

2. **权限错误**

   - 确保数据库用户有足够的权限
   - 检查防火墙和网络配置

3. **SSL 连接问题**
   - 在生产环境中使用 `?sslmode=require`
   - 验证 SSL 证书配置

### 调试模式

设置日志级别为 debug 来查看详细信息：

```bash
LOG_LEVEL=debug deno task dev
```

## 扩展功能

数据库模块提供了完整的 PostgreSQL 支持，你可以：

- 创建自定义查询函数
- 实现数据模型和 ORM 功能
- 添加数据迁移脚本
- 集成缓存层

更多高级功能可以基于现有的数据库连接池进行扩展。
