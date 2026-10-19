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
│   ├── scripts             // 手册离线站点脚本（零依赖）
│   │   ├── build-manual-site.js   // Markdown 章节 -> site/ 离线站点
│   │   └── verify-manual-site.js  // 站点内部链接 / 锚点 / 图片自检
│   └── zh-cn               // 中文文档（章节顺序与左侧菜单顺序一致）
│       ├── 00-README.md             // 手册首页与阅读指引
│       ├── 01-login-and-user.md     // 登录与用户管理
│       ├── 02-overview.md           // 控制台布局与导航
│       ├── 03-ai-business-cluster.md // 资源管理：AI 业务集群
│       ├── 04-model-prices.md       // 模型定价
│       ├── 05-model-provider.md     // 资源管理：模型服务商
│       ├── 06-epp-schedule.md       // 资源管理：EPP 调度
│       ├── 07-route.md              // 路由管理：路由表与路由规则
│       ├── 08-ai-cache-rules.md     // 功能增强：AI缓存规则
│       ├── 09-traffic-mirror-rules.md // 功能增强：流量镜像规则
│       ├── 10-intent-config.md      // 功能增强：意图配置
│       ├── 11-ai-context.md         // 功能增强：AI上下文压缩
│       ├── 12-api-key.md            // 消费者管理：API Key
│       ├── 13-batch-tasks.md        // 消费者管理：批量任务
│       ├── 14-entity-type.md        // 消费者管理：Entity 类型
│       ├── 15-entity.md             // 消费者管理：Entity 组织
│       ├── 16-key-reencrypt.md      // 系统安全：密钥收敛
│       ├── 17-report.md             // 数据报表
│       ├── 18-operation-logs.md     // 操作日志
│       ├── 19-scenarios.md          // 场景实战
│       ├── 20-appendix.md           // 附录
│       ├── deploy.md                // 部署说明
│       ├── develop.md               // 开发说明（本文）
│       ├── images/                  // 文档截图
│       └── site/                    // 离线站点产物（由 scripts 生成，勿手改）
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
