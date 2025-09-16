# ApiBox API 接口文档

## 快速开始

```bash
# 启动服务
deno task start

# 服务运行在
http://localhost:8000
```

## API 接口列表

| API 名称      | 端点       | 方法 | 请求路径                                   | 参数                 | 说明               |
| ------------- | ---------- | ---- | ------------------------------------------ | -------------------- | ------------------ |
| **外汇数据**  | quote      | GET  | `/api/forex/quote/{instrument}/{currency}` | instrument, currency | 获取指定货币对报价 |
| **天气数据**  | current    | GET  | `/api/weather/current`                     | q, units             | 获取当前天气信息   |
| **天气数据**  | forecast   | GET  | `/api/weather/forecast`                    | q, units             | 获取 5 天天气预报  |
| **HTTP 测试** | get        | GET  | `/api/httpbin/get`                         | -                    | 测试 GET 请求      |
| **HTTP 测试** | ip         | GET  | `/api/httpbin/ip`                          | -                    | 获取客户端 IP      |
| **HTTP 测试** | user-agent | GET  | `/api/httpbin/user-agent`                  | -                    | 获取 User-Agent    |

## 使用示例

### 外汇数据 API

```bash
# 获取黄金对美元报价
curl "http://localhost:8000/api/forex/quote/XAU/USD"

# 获取欧元对美元报价
curl "http://localhost:8000/api/forex/quote/EUR/USD"
```

### 天气 API

```bash
# 获取北京当前天气（摄氏度）
curl "http://localhost:8000/api/weather/current?q=Beijing&units=metric"

# 获取上海5天天气预报
curl "http://localhost:8000/api/weather/forecast?q=Shanghai&units=metric"
```

### HTTP 测试 API

```bash
# 测试GET请求
curl "http://localhost:8000/api/httpbin/get"

# 获取IP地址
curl "http://localhost:8000/api/httpbin/ip"
```

## 系统端点

| 端点     | 方法 | 路径      | 说明         |
| -------- | ---- | --------- | ------------ |
| 健康检查 | GET  | `/health` | 服务健康状态 |
| API 文档 | GET  | `/api`    | API 使用说明 |
| 统计信息 | GET  | `/stats`  | 缓存统计信息 |

## 参数说明

### 天气 API 参数

- `q`: 城市名称 (必需)
- `units`: 温度单位
  - `metric`: 摄氏度
  - `imperial`: 华氏度
  - 默认: 开尔文

### 外汇 API 参数

- `instrument`: 交易品种 (XAU=黄金, EUR=欧元, GBP=英镑等)
- `currency`: 基准货币 (USD=美元, EUR=欧元等)

## 认证配置

### 天气 API

需要配置 OpenWeatherMap API Key:

1. 在 `.env` 文件中设置:

```bash
OPENWEATHER_API_KEY=your_api_key_here
```

2. 或在 `config/apis.json` 中直接配置

### 其他 API

- 外汇 API: 无需认证
- HTTP 测试 API: 无需认证

## 缓存信息

| API       | 端点       | 缓存时间 |
| --------- | ---------- | -------- |
| 外汇      | quote      | 5 秒     |
| 天气      | current    | 60 秒    |
| 天气      | forecast   | 5 分钟   |
| HTTP 测试 | get        | 无缓存   |
| HTTP 测试 | ip         | 30 秒    |
| HTTP 测试 | user-agent | 无缓存   |

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `404`: API 或端点不存在
- `401`: 认证失败 (API Key 无效)
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "error": "错误描述",
  "details": {
    "api": "API名称",
    "endpoint": "端点名称",
    "message": "详细错误信息"
  }
}
```

## 开发信息

- **框架**: Deno
- **端口**: 8000 (可配置)
- **日志级别**: debug (开发环境)
- **CORS**: 已启用，支持跨域请求
