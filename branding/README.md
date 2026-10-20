# 品牌资源目录

该目录用于存放可定制的品牌资源，构建时会原样复制到产物根目录的 `branding/` 下，**部署后可直接修改，无需重新构建前端**。

部署后目录结构（以 AI Gateway API 的 `static/` 为例）：

```
static/
├── index.html
├── static/            // 前端 JS/CSS
└── branding/
    ├── branding.json
    └── favicon.ico
```

## branding.json

```json
{
  "title": "壬远 AI网关",
  "titleEn": "Rainway AI Gateway",
  "favicon": "favicon.ico"
}
```

| 字段 | 说明 |
| --- | --- |
| `title` | 中文界面下侧边栏、登录页显示的标题，同时作为其他语言未配置时的兜底 |
| `titleEn` | 英文界面下显示的标题；留空时使用 `title` |
| `favicon` | 浏览器标签页图标。相对路径基于本目录解析，也可填写 `/xxx.ico` 或完整的 `http(s)` 地址；留空时使用 `favicon.ico`。**目标文件不存在时不显示标签页图标**（不会回退到内置 ico） |

所有字段均可缺省；缺省时使用前端内置的默认品牌信息。浏览器标签页标题与图标由 `index.html` 在页面加载时读取本配置并应用。

## 部署后修改

1. 编辑 `branding/branding.json`（或直接替换 `branding/favicon.ico`）。
2. 刷新页面即可生效（配置以 `no-store` 方式请求）。若浏览器仍显示旧图标，请强制刷新或清理缓存。
3. 删除 `branding/favicon.ico`（或让 `favicon` 指向不存在的文件）后刷新，页面**不再显示标签页图标**，也不会回退到内置 ico。

> 注意：请保持 JSON 格式合法，否则前端会使用默认品牌信息。