# 本文描述如何快速开发

## 目录结构说明

```
.
├── build.sh                // 打包脚本
├── configs                 // 开发和编译配置
│   ├── build.js
│   ├── config.js           // 本地开发时端口号设置
│   ├── dev-client.js
│   ├── devProxy.js         // 本地开发时API Server端口号设置
├── docs                    // 项目文档
│   └── zh-cn               // 中文文档
│       ├── 00-README.md           // 手册首页与阅读指引
│       ├── 01-login-and-user.md   // 登录与用户管理
│       ├── 02-overview.md         // 控制台布局与导航
│       ├── 03-model-provider.md   // 模型服务商
│       ├── 04-ai-business-cluster.md // AI 业务集群
│       ├── 05-epp-schedule.md     // EPP 调度
│       ├── 06-model-prices.md     // 模型定价
│       ├── 07-entity-type.md      // Entity 类型
│       ├── 08-entity.md           // Entity 组织
│       ├── 09-api-key.md          // API Key 管理
│       ├── 10-route.md            // 路由管理
│       ├── 11-operation-logs.md   // 操作日志
│       ├── 12-report.md          // 数据报表
│       ├── 13-scenarios.md        // 场景实战
│       ├── 14-appendix.md         // 附录
│       ├── deploy.md              // 部署说明
│       ├── develop.md             // 开发说明（本文）
│       └── images/                // 文档截图
├── index.html
└── src
    ├── main.js
    ├── router              // 路由设置
    │   └── router.js
    ├── modules             // 业务模块
    │   ├── APIKey          // API Key管理
    │   // ├── Cert            // 证书管理（暂未提供）
    │   ├── Clusters        // AI业务集群
    │   ├── Entity          // Entity管理
    │   ├── Login           // 登录模块
    │   ├── ModelPrices     // 模型定价
    │   ├── RouteTable      // 路由表（Global / Entity / API-Key）
    │   └── User            // 用户管理
    ├── layout              // 布局逻辑
    │   ├── 404.vue
    │   ├── layout.vue
    │   └── sidebar
    ├── assets              // 静态资源
    │   ├── css
    │   ├── favicon.ico
    │   ├── font
    │   └── img
    ├── i18n                // 语言包
    │   ├── en.js
    │   └── zh.js
    ├── components          // 通用组件
    │   ├── CustomModal
    │   ├── Expression
    │   └── table
    └── utils               // 公共工具
```

## 二次开发步骤

二次开发步骤包括：

- 基础开发环境搭建：nodejs 开发环境搭建本文不展开描述
- 启动项目：修改 configs配置后执行 `npm run start` 即可启动项目
  - API Server 必须先启动
  - API Server 端口号配置在 configs/devProxy.js 的 `proxy.option.target`
  - 开发端口号配置在 configs/config.js 的 `dev.ports`
