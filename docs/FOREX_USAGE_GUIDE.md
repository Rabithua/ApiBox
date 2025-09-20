# Forex 外汇接口使用指南

## 概述

ApiBox 提供了完整的外汇数据服务，包括实时汇率查询和历史数据分析功能。本指南将详细介绍如何使用这些接口。

## 🚀 快速开始

### 基础 URL

```
http://localhost:8000
```

### 主要功能

- 📈 **实时汇率查询** - 获取最新的外汇报价数据
- 📊 **历史数据查询** - 查询指定时间范围的历史汇率数据
- ⏰ **自动数据收集** - 系统自动定时收集 XAU/USD 数据
- 🔧 **调试和监控** - 提供任务状态监控和手动触发功能

---

## 📈 实时汇率查询

### 接口信息

- **路径**: `/api/forex/quote/{instrument}/{currency}`
- **方法**: GET
- **功能**: 获取指定货币对的实时外汇报价

### 路径参数

| 参数         | 描述                         | 示例          |
| ------------ | ---------------------------- | ------------- |
| `instrument` | 交易品种代码（大小写不敏感） | XAU, EUR, GBP |
| `currency`   | 基准货币代码（大小写不敏感） | USD, EUR, JPY |

### 使用示例

#### 1. 获取黄金对美元汇率 (XAU/USD)

```bash
curl "http://localhost:8000/api/forex/quote/XAU/USD"
```

#### 2. 获取欧元对美元汇率 (EUR/USD)

```bash
curl "http://localhost:8000/api/forex/quote/EUR/USD"
```

#### 3. 使用 JavaScript 获取数据

```javascript
async function getForexQuote(instrument, currency) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/forex/quote/${instrument}/${currency}`
    );
    const data = await response.json();

    if (data.status === "success") {
      console.log("外汇数据:", data.data);
      return data.data;
    } else {
      console.error("获取失败:", data.errors);
    }
  } catch (error) {
    console.error("请求错误:", error);
  }
}

// 使用示例
getForexQuote("XAU", "USD");
```

### 响应示例

#### 成功响应

```json
{
  "status": "success",
  "data": [
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
          "bid": 2685.563,
          "ask": 2685.967
        }
      ],
      "ts": 1726855200077
    }
  ],
  "message": "Forex quote for XAU/USD retrieved successfully"
}
```

#### 错误响应

```json
{
  "status": "error",
  "message": "Invalid forex path",
  "errors": [
    {
      "field": "path",
      "code": "INVALID_PATH_FORMAT",
      "message": "Path must follow format: /api/forex/quote/{instrument}/{currency}"
    }
  ]
}
```

---

## 📊 历史数据查询

### 接口信息

- **路径**: `/api/forex/history/{instrument}/{currency}`
- **方法**: GET
- **功能**: 查询指定货币对的历史汇率数据，支持分页和时间过滤
- **前提条件**: 需要配置 PostgreSQL 数据库

### 路径参数

| 参数         | 描述         | 示例          |
| ------------ | ------------ | ------------- |
| `instrument` | 交易品种代码 | XAU, EUR, GBP |
| `currency`   | 基准货币代码 | USD, EUR, JPY |

### 查询参数

| 参数        | 类型   | 必填 | 默认值 | 描述                    |
| ----------- | ------ | ---- | ------ | ----------------------- |
| `startDate` | string | 否   | -      | 开始时间，ISO 8601 格式 |
| `endDate`   | string | 否   | -      | 结束时间，ISO 8601 格式 |
| `limit`     | number | 否   | 100    | 每页记录数（1-1000）    |
| `page`      | number | 否   | 1      | 页码（从 1 开始）       |

### 使用示例

#### 1. 获取最新的历史记录

```bash
curl "http://localhost:8000/api/forex/history/XAU/USD"
```

#### 2. 查询指定时间范围的数据

```bash
curl "http://localhost:8000/api/forex/history/XAU/USD?startDate=2024-01-01T00:00:00Z&endDate=2024-01-02T00:00:00Z"
```

#### 3. 分页查询数据

```bash
# 每页50条记录，获取第2页
curl "http://localhost:8000/api/forex/history/XAU/USD?limit=50&page=2"
```

#### 4. 复合查询示例

```bash
# 查询2024年1月1日到1月7日的数据，每页20条，第1页
curl "http://localhost:8000/api/forex/history/XAU/USD?startDate=2024-01-01T00:00:00Z&endDate=2024-01-07T23:59:59Z&limit=20&page=1"
```

#### 5. 使用 JavaScript 查询历史数据

```javascript
async function getForexHistory(instrument, currency, options = {}) {
  const params = new URLSearchParams();

  if (options.startDate) params.append("startDate", options.startDate);
  if (options.endDate) params.append("endDate", options.endDate);
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.page) params.append("page", options.page.toString());

  const url = `http://localhost:8000/api/forex/history/${instrument}/${currency}?${params}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      console.log(`获取到 ${data.data.data.length} 条历史记录`);
      console.log("分页信息:", data.data.pagination);
      return data.data;
    } else {
      console.error("查询失败:", data.errors);
    }
  } catch (error) {
    console.error("请求错误:", error);
  }
}

// 使用示例
getForexHistory("XAU", "USD", {
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-01-07T23:59:59Z",
  limit: 50,
  page: 1,
});
```

### 响应示例

#### 成功响应

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": 123,
        "instrument": "XAU",
        "currency": "USD",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "data": {
          "topo": {
            "platform": "SwissquoteLtd",
            "server": "Live5"
          },
          "spreadProfilePrices": [
            {
              "spreadProfile": "premium",
              "bidSpread": 12.7,
              "askSpread": 12.7,
              "bid": 2050.25,
              "ask": 2050.65
            }
          ],
          "ts": 1704110400000
        },
        "created_at": "2024-01-01T12:01:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 250,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "filter": {
      "instrument": "XAU",
      "currency": "USD",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-07T23:59:59.000Z"
    }
  },
  "message": "Retrieved 1 forex history records for XAU/USD"
}
```

---

## ⏰ 自动数据收集

系统会自动运行定时任务来收集外汇数据：

### XAU/USD 定时收集任务

- **任务名称**: XAU/USD Hourly Data Collection
- **运行频率**: 每小时执行一次
- **收集品种**: XAU/USD (黄金对美元)
- **存储位置**: PostgreSQL 数据库 `forex_history` 表
- **容错机制**: 连续失败 3 次后自动停用任务
