# ApiBox 快速参考

## 启动服务

```bash
deno task start
# 服务地址: http://localhost:8000
```

## API 速查表

### 🏦 外汇数据

```bash
GET /api/forex/quote/{品种}/{货币}
# 示例: /api/forex/quote/XAU/USD (黄金/美元)
```

### 🌤️ 天气数据

```bash
GET /api/weather/current?q={城市}&units=metric
GET /api/weather/forecast?q={城市}&units=metric
# 示例: /api/weather/current?q=Beijing&units=metric
```

### 🧪 HTTP 测试

```bash
GET /api/httpbin/get          # 测试请求
GET /api/httpbin/ip           # 获取IP
GET /api/httpbin/user-agent   # 获取UA
```

### ⚙️ 系统端点

```bash
GET /health    # 健康检查
GET /api       # API文档
GET /stats     # 缓存统计
```

## 环境配置

### 必需配置 (天气 API)

```bash
# .env 文件
OPENWEATHER_API_KEY=your_key_here
```

### 可选配置

```bash
PORT=8000                    # 服务端口
HOST=localhost               # 服务地址
LOG_LEVEL=debug             # 日志级别
CACHE_MAX_SIZE=1000         # 缓存大小
CACHE_DEFAULT_TTL=300000    # 缓存TTL(ms)
```

## 常用命令

```bash
deno task start    # 启动服务
deno task dev      # 开发模式
deno task test     # 运行测试
deno task fmt      # 格式化代码
deno task lint     # 代码检查
```
