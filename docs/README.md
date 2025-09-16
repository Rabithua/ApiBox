# ApiBox 文档目录

欢迎使用 ApiBox - 通用 API 代理服务！

## 📚 文档列表

| 文档                                       | 描述                | 适用对象         |
| ------------------------------------------ | ------------------- | ---------------- |
| [API.md](./API.md)                         | 完整的 API 接口文档 | 开发者、集成人员 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 快速参考手册        | 日常使用者       |

## 🚀 快速开始

1. **启动服务**

   ```bash
   deno task start
   ```

2. **测试接口**

   ```bash
   curl "http://localhost:8000/health"
   ```

3. **查看所有 API**
   ```bash
   curl "http://localhost:8000/api"
   ```

## 🔧 配置说明

### 环境变量 (.env)

- `OPENWEATHER_API_KEY`: 天气 API 密钥 (必需)
- `PORT`: 服务端口 (默认: 8000)
- `LOG_LEVEL`: 日志级别 (默认: info)

### API 配置 (config/apis.json)

- 支持多个第三方 API 集成
- 支持环境变量引用
- 支持缓存配置

## 📖 更多资源

- [项目 README](../README.md) - 项目概述和安装说明
- [测试文档](../tests/TEST_REPORT.md) - 测试覆盖和报告
- [源码](../src/) - 核心代码实现

## 🆘 获取帮助

- 查看日志: 服务启动时会显示详细信息
- 健康检查: `GET /health`
- API 状态: `GET /stats`

---

**更新时间**: ${new Date().toISOString().split('T')[0]}  
**版本**: 2.0
