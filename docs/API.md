# ApiBox API 接口文档

## 可用接口列表

| 接口路径                                     | 方法 | 功能描述               | 示例                                                              |
| -------------------------------------------- | ---- | ---------------------- | ----------------------------------------------------------------- |
| `/`                                          | GET  | 获取服务信息和接口列表 | `http://localhost:8000/`                                          |
| `/api/forex/quote/{instrument}/{currency}`   | GET  | 获取实时外汇报价数据   | `http://localhost:8000/api/forex/quote/XAU/USD`                   |
| `/api/forex/history/{instrument}/{currency}` | GET  | 获取历史外汇数据       | `http://localhost:8000/api/forex/history/XAU/USD?limit=50&page=1` |
| `/api/forex/debug/trigger`                   | GET  | 手动触发外汇数据收集   | `http://localhost:8000/api/forex/debug/trigger`                   |
| `/api/forex/tasks`                           | GET  | 获取外汇定时任务状态   | `http://localhost:8000/api/forex/tasks`                           |
| `/health/database`                           | GET  | 检查数据库连接健康状态 | `http://localhost:8000/health/database`                           |
| `/favicon.ico`                               | GET  | 返回服务图标           | `http://localhost:8000/favicon.ico`                               |

## 详细接口说明

### 1. 外汇历史数据接口

**接口路径**: `/api/forex/history/{instrument}/{currency}`  
**请求方法**: GET  
**功能描述**: 获取指定货币对的历史外汇数据，支持分页和时间范围过滤

**路径参数**:

- `instrument`: 交易品种（如 XAU, EUR, GBP 等）
- `currency`: 基准货币（如 USD, EUR 等）

**查询参数**:

- `startDate` (可选): 开始时间，ISO 8601 格式 (例: 2024-01-01T00:00:00Z)
- `endDate` (可选): 结束时间，ISO 8601 格式 (例: 2024-01-02T00:00:00Z)
- `limit` (可选): 每页记录数，默认 100，最大 1000
- `page` (可选): 页码，从 1 开始，默认 1

**使用示例**:

```bash
# 获取XAU/USD的最新100条历史记录
curl "http://localhost:8000/api/forex/history/XAU/USD"

# 获取指定时间范围的数据
curl "http://localhost:8000/api/forex/history/XAU/USD?startDate=2024-01-01T00:00:00Z&endDate=2024-01-02T00:00:00Z"

# 分页获取数据
curl "http://localhost:8000/api/forex/history/XAU/USD?limit=50&page=2"
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "instrument": "XAU",
        "currency": "USD",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "data": {
          "spread": 0.5,
          "ask": 2050.25,
          "bid": 2049.75
        },
        "created_at": "2024-01-01T12:01:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 150,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    },
    "filter": {
      "instrument": "XAU",
      "currency": "USD",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-02T00:00:00.000Z"
    }
  },
  "message": "Retrieved 1 forex history records for XAU/USD"
}
```

### 2. 外汇数据收集调试接口

**接口路径**: `/api/forex/debug/trigger`  
**请求方法**: GET  
**功能描述**: 手动触发一次外汇数据收集，用于调试和测试

**使用示例**:

```bash
curl "http://localhost:8000/api/forex/debug/trigger"
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "trigger": {
      "timestamp": "2025-09-20T18:30:00.123Z",
      "status": "completed",
      "dataSize": 1847,
      "platformCount": 3
    },
    "database": {
      "status": "success",
      "message": "Data saved to database successfully"
    },
    "scheduler": {
      "id": "forex-xau-usd-hourly",
      "name": "XAU/USD Hourly Data Collection",
      "enabled": true,
      "lastRun": "2025-09-20T17:00:00.000Z",
      "nextRun": "2025-09-20T18:00:00.000Z",
      "errorCount": 0,
      "maxErrors": 3
    },
    "rawData": [
      {
        "topo": {
          "platform": "SwissquoteLtd",
          "server": "Live5"
        },
        "spreadProfilePrices": [
          {
            "spreadProfile": "premium",
            "bidSpread": 12.7,
            "askSpread": 12.7,
            "bid": 3685.563,
            "ask": 3685.967
          }
        ],
        "ts": 1758315600077
      }
    ]
  },
  "message": "Debug trigger completed successfully"
}
```

### 3. 外汇定时任务状态接口

**接口路径**: `/api/forex/tasks`  
**请求方法**: GET  
**功能描述**: 获取外汇数据收集定时任务的运行状态

**使用示例**:

```bash
curl "http://localhost:8000/api/forex/tasks"
```

**响应示例**:

```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "id": "forex-xau-usd-hourly",
        "name": "XAU/USD Hourly Data Collection",
        "enabled": true,
        "lastRun": "2024-01-01T12:00:00.000Z",
        "nextRun": "2024-01-01T13:00:00.000Z",
        "errorCount": 0,
        "maxErrors": 3
      }
    ],
    "stats": {
      "totalTasks": 1,
      "activeTasks": 1,
      "disabledTasks": 0,
      "errorTasks": 0
    }
  },
  "message": "Forex tasks status retrieved successfully"
}
```

## 定时任务说明

系统自动运行以下定时任务：

### XAU/USD 数据收集任务

- **任务名称**: XAU/USD Hourly Data Collection
- **运行频率**: 每小时执行一次
- **功能**: 自动获取 XAU/USD 外汇数据并保存到数据库
- **错误处理**: 连续失败 3 次后自动停用任务
- **数据存储**: 数据保存在 `forex_history` 表中，包含时间戳和完整的外汇数据

### 数据库要求

使用历史数据功能需要配置 PostgreSQL 数据库：

1. 设置环境变量 `DATABASE_URL`
2. 系统启动时会自动创建必要的数据表
3. 定时任务会自动开始收集数据
