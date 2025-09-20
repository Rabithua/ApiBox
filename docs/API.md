# ApiBox API 接口文档

## 可用接口列表

| 接口路径                                   | 方法 | 功能描述               | 示例                                            |
| ------------------------------------------ | ---- | ---------------------- | ----------------------------------------------- |
| `/`                                        | GET  | 获取服务信息和接口列表 | `http://localhost:8000/`                        |
| `/api/forex/quote/{instrument}/{currency}` | GET  | 获取实时外汇报价数据   | `http://localhost:8000/api/forex/quote/XAU/USD` |
| `/favicon.ico`                             | GET  | 返回服务图标           | `http://localhost:8000/favicon.ico`             |