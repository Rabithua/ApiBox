# ApiBox - 通用 API 代理服务

一个基于 Deno 的通用 API 代理服务，支持多种第三方 API 的统一代理、缓存和管理。

## 📖 文档

- **[API 接口文档](./docs/API.md)** - 完整的 API 使用说明
- **[快速参考](./docs/QUICK_REFERENCE.md)** - 常用接口和命令速查
- **[文档目录](./docs/README.md)** - 所有文档导航

## 🏗️ 项目结构

```
ApiBox/
├── main.ts                 # 主启动文件
├── deno.json              # Deno 配置文件
├── docs/                  # 📖 文档目录
│   ├── API.md            # API接口文档
│   ├── QUICK_REFERENCE.md # 快速参考
│   └── README.md         # 文档导航
├── config/
│   └── apis.json          # API 配置文件
├── src/
│   ├── types/
│   │   └── index.ts       # 类型定义
│   ├── config/
│   │   └── manager.ts     # 配置管理器
│   ├── cache/
│   │   └── manager.ts     # 缓存管理器
│   ├── proxy/
│   │   └── engine.ts      # 代理引擎
│   ├── routes/
│   │   └── handler.ts     # 路由处理器
│   ├── env/
│   │   └── manager.ts     # 环境变量管理器
│   └── utils/
│       └── helpers.ts     # 工具函数
├── tests/                 # 🧪 测试目录
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   └── fixtures/         # 测试数据
└── README.md              # 项目说明
```

## 🚀 快速开始

### 安装 Deno

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows
iwr https://deno.land/install.ps1 -useb | iex
```

### 配置环境变量

1. 复制环境变量示例文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置您的配置：

```bash
# 服务器配置
PORT=8000
HOST=localhost

# API Keys（请替换为真实的API密钥）
OPENWEATHER_API_KEY=your_api_key_here

# 缓存配置
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=300000

# 日志配置
LOG_LEVEL=info
LOG_COLORIZE=true
```

### 启动服务

```bash
# 开发模式（自动重启）
deno task dev

# 生产模式
deno task start

# 直接运行
deno run --allow-net --allow-read main.ts
```

### 环境变量

支持以下环境变量配置：

#### 服务器配置

- `PORT` - 服务器端口号（默认: 8000）
- `HOST` - 服务器主机地址（默认: 0.0.0.0）

#### API 密钥

- `OPENWEATHER_API_KEY` - OpenWeatherMap API 密钥

#### 缓存配置

- `CACHE_MAX_SIZE` - 缓存最大条目数（默认: 1000）
- `CACHE_DEFAULT_TTL` - 默认缓存过期时间（毫秒，默认: 300000）

#### 日志配置

- `LOG_LEVEL` - 日志级别（debug/info/warn/error，默认: info）
- `LOG_COLORIZE` - 是否启用彩色日志（true/false，默认: true）

#### CORS 配置

- `CORS_ORIGIN` - 允许的源（默认: \*）
- `CORS_METHODS` - 允许的 HTTP 方法
- `CORS_HEADERS` - 允许的头部

#### 示例：通过命令行设置

```bash
export PORT=3000
export HOST=localhost
export OPENWEATHER_API_KEY=your_api_key_here
export LOG_LEVEL=debug
```

## 📚 API 文档

### 服务端点

- `GET /` 或 `GET /api` - API 文档和使用说明
- `GET /health` - 健康检查
- `GET /stats` - 缓存统计信息
- `GET /api/{apiName}/{endpoint}/{...params}` - API 代理

### 示例请求

```bash
# 查看 API 文档
curl http://localhost:8000/api

# 外汇数据
curl http://localhost:8000/api/forex/quote/XAU/USD

# 天气数据
curl "http://localhost:8000/api/weather/current?q=Beijing&units=metric"

# HTTP 测试
curl http://localhost:8000/api/httpbin/get

# 健康检查
curl http://localhost:8000/health

# 统计信息
curl http://localhost:8000/stats
```

## ⚙️ 配置管理

### API 配置文件格式

配置文件位于 `config/apis.json`，格式如下：

```json
{
  "api_name": {
    "name": "API 显示名称",
    "description": "API 描述",
    "baseUrl": "https://api.example.com",
    "auth": {
      "type": "none|apikey|bearer|basic",
      "key": "参数名或头部名",
      "value": "认证值或 ENV:环境变量名",
      "header": "头部名称（用于 apikey 类型）"
    },
    "endpoints": {
      "endpoint_name": {
        "path": "/api/path/{param}",
        "method": "GET|POST|PUT|DELETE",
        "cacheDuration": 5000,
        "description": "端点描述",
        "parameters": {
          "param_name": {
            "type": "path|query|header",
            "required": true,
            "description": "参数描述"
          }
        },
        "headers": {
          "User-Agent": "ApiBox/2.0"
        }
      }
    }
  }
}
```

### 添加新的 API

1. 编辑 `config/apis.json` 文件
2. 按照上述格式添加新的 API 配置
3. 重启服务或访问 `/api` 查看更新

## 🧪 开发和测试

```bash
# 格式化代码
deno task fmt

# 代码检查
deno task lint

# 类型检查
deno task check

# 运行测试
deno task test
```

## 🔧 核心特性

- **统一接口**: 通过统一的 URL 格式访问不同的 API
- **智能缓存**: 支持按端点配置缓存时间，减少外部 API 调用
- **多种认证**: 支持 API Key、Bearer Token、Basic Auth 等认证方式
- **参数验证**: 自动验证必需参数，提供详细错误信息
- **CORS 支持**: 内置跨域资源共享支持
- **实时日志**: 彩色日志输出，便于调试和监控
- **健康检查**: 提供服务健康状态和统计信息
- **模块化架构**: 代码结构清晰，易于维护和扩展

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
