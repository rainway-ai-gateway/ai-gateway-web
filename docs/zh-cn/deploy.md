# 本文描述如何获取AI Gateway Web产出和部署

## 获取 AI Gateway Web 产出

产出的获取有多种方式

- 方式一：通过源码编译： clone [rainway-ai-gateway/ai-gateway-web](https://github.com/rainway-ai-gateway/ai-gateway-web), 仓库后进入项目根目录，确保node为v20+版本, 执行 `sh build.sh`， output 文件夹就是静态文件
- 方式二：直接进入 [ai-gateway-web/releases](https://github.com/rainway-ai-gateway/ai-gateway-web/releases) 页面下载相应的编译产出

若想进行二次开发或者提交PR，请参考 [项目开发指南](./develop.md)。

## AI Gateway Web 部署

AI Gateway Web 依赖 [AI Gateway API](https://github.com/rainway-ai-gateway/ai-gateway-api)。请先完成AI Gateway API的部署，详见[AI Gateway API 部署](https://github.com/rainway-ai-gateway/ai-gateway-api/blob/develop/docs/zh_cn/deploy.md)。

生产环境具体部署步骤为：将编译产出放入 AI Gateway API的static静态文件夹中。

## 品牌资源定制（部署后可配置）

控制台侧边栏、登录页、浏览器标签页的标题以及 favicon 均由产出根目录下的 `branding/` 目录控制：

```
static/
├── index.html
├── static/
└── branding/
    ├── branding.json   // 标题与 favicon 配置
    └── favicon.ico     // 站点图标
```

编辑 `branding/branding.json` 即可修改标题和图标，无需重新构建前端：

```json
{
  "title": "壬远 AI网关",
  "titleEn": "Rainway AI Gateway",
  "favicon": "favicon.ico"
}
```

- `title`：中文界面标题，同时作为其他语言未配置时的兜底
- `titleEn`：英文界面标题，留空时使用 `title`
- `favicon`：图标路径，相对路径基于 `branding/` 目录，也可填 `/xxx.ico` 或 `http(s)` 地址

修改后刷新页面生效；若浏览器仍显示旧图标，请强制刷新或清理缓存。更多说明见 [branding/README.md](../../branding/README.md)。
