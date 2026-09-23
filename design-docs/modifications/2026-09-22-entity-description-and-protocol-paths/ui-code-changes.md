# UI 代码变更文档

> **对照接口**：`entities.md`（新增可选 `description`）、`providers.md`（`protocol_paths` 语义升级为「上游 API 基路径」）
> **对照原型**：`prototype-design/pages/entity.html`（配套 `assets/js/entity-upsert.js`）、`prototype-design/pages/providers.html`（配套 `assets/js/provider-upsert.js`）
> **状态**：**原型已完成** · **UI 代码已完成**

本文记录 2026-09-22 两项变更：

1. **Entity 新增可选「描述」字段**：接口 `entities.md` 新增非必填 `description`（0–255 字符、禁控制字符），原型在列表列、创建/编辑表单、查看详情三处同步；
2. **`protocol_paths` 语义升级**：由「上游路径前缀」升级为「上游 API 基路径」，对应 `providers.md` 改写规则说明，原型文案同步。

第 1 项涉及数据库 DDL 变更（`entities` 新增列），**须重置数据库**后方可联调。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 实体 · 列表 | 新增「描述」列（`searchable` + `sortable`），列位置 名称 → 描述 → 类型 | ✅ 原型 · ✅ UI |
| 实体 · 创建 / 编辑 | 基本信息 Card 新增「描述」输入框（**非必填，无必填星号**，placeholder 不体现「选填」） | ✅ 原型 · ✅ UI |
| 实体 · 查看详情 | 基本信息新增「描述」行，顺序 名称 → 描述 → 类型 | ✅ 原型 · ✅ UI |
| 服务商 · 创建 / 编辑 / 详情 | 「协议路径映射」文案由「上游路径前缀」升级为「上游 API 基路径」 | ✅ 原型 · ✅ UI（i18n） |
| i18n | 新增 entity 描述相关词条；provider 路径映射提示文案更新 | ✅ UI |
| 后端接口 | `/entities` 新增可选 `description`；`protocol_paths` 语义说明更新 | ✅ 后端 |
| 数据库 DDL | `entities` 表新增 `description TEXT NOT NULL DEFAULT ''` | ⚠️ 需重置 DB |
| 原型 `prototype-design` | `entity-upsert.js` / `entity.html` / `mock-data.js` / `provider-upsert.js` | ✅ 原型 |

---

## 2. 修改 · Entity 新增可选 `description`

**对照接口**：`entities.md`  
**对照原型**：`prototype-design/pages/entity.html` → `assets/js/entity-upsert.js`

### 2.1 接口依据

| 位置 | 条款 |
| ---- | ---- |
| 字段定义（`entities.md:48`） | `description` / string / Entity描述 / 自定义 / **非必填；若传入，长度 0-255 字符；不能包含控制字符** |
| POST body（`entities.md:81`、`:95`） | 必填列 = **N**；同样约束 0–255、禁控制字符 |
| 响应体（`entities.md:260`） | `description` 随实体返回 |
| PUT（`entities.md:403`） | 全量语义：**省略 `description` 将清空已有描述（重置为空字符串）** |
| PATCH（`entities.md:456`） | 省略时**保持原值**；显式传入空字符串 `""` 表示清空描述 |
| DDL | `entities` 表新增 `description TEXT NOT NULL DEFAULT ''` |

### 2.2 原型 · 创建 / 编辑表单

**文件**：`design-docs/prototype-design/assets/js/entity-upsert.js`

**位置**：`renderUpsertBody` 基本信息 Card 内，紧随「名称」（L252–264）之后（L265–273）

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 字段 | 无 | 新增「描述」输入框 `#entity-description` |
| 必填星号 | — | **无**（调用 `IvuUI.formTopItem` 时**不传**第三参数 `required`） |
| 校验 | — | `maxlength="255"`；`validateEntityDescription()` 校验 0–255 字符、禁控制字符（`\x00-\x1F`、`\x7F`） |
| 提示文案 | — | 仅 placeholder「请输入Entity描述」（**不体现「选填」**），**不展示 `form-tip` 小字** |

```diff
           IvuUI.formTopItem(
             '名称',
             ...
             '<p class="form-tip">1–64 字符；仅小写字母、数字、_、-、@（支持 用户名@项目名）；不能以 _、- 或 @ 开头/结尾</p>',
             true,
           ) +
+          IvuUI.formTopItem(
+            '描述',
+            '<div class="ivu-input-wrapper ivu-input-type-text">' +
+              '<input type="text" id="entity-description" class="ivu-input" maxlength="255" value="' +
+              IvuUI.escapeHtml(data.description || '') +
+              '" placeholder="请输入Entity描述" />' +
+              '</div>',
+          ) +
           EntityUpsert.rowSpan2(
```

新增校验方法（紧随 `validateEntityName` 之后，L57–63）：

```js
validateEntityDescription(value) {
    var val = String(value == null ? '' : value);
    if (val === '') return null;
    if (val.length > 255) return '描述不能超过255个字符';
    if (/[\x00-\x1F\x7F]/.test(val)) return '描述不能包含控制字符';
    return null;
  },
```

**交互绑定**：`initUpsertForm` 中为 `#entity-description` 绑定 `blur` / `input`（L688–704）；`validateEntityForm` 中纳入统一校验（L747–756）。

> ⚠️ 注意：`entity-upsert.js` 内另有一处「描述」（L534–541）属于**实体类型（EntityType）**表单 `#entity-type-desc`，`maxlength="1024"`，与本次 Entity 描述无关，未改动。

### 2.3 原型 · 查看详情

**位置**：`renderViewBody` 基本信息 `infoRow`（L490–492）

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 行顺序 | 名称 → 类型 → 父Entity → … | **名称 → 描述 → 类型** → 父Entity → … |
| 空值展示 | — | 显示 `-` |

```diff
         infoRow('名称', IvuUI.escapeHtml(data.name || '-')) +
+        infoRow('描述', IvuUI.escapeHtml(data.description || '-')) +
         infoRow('类型', IvuUI.escapeHtml(data.type || '-')) +
```

### 2.4 原型 · 列表列

**文件**：`design-docs/prototype-design/pages/entity.html`

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `renderEntityTable` `columns`（L146–153） | ID → 名称 → 类型 → … | **ID → 名称 → 描述 → 类型 → …** |
| `filterEntityRows`（L84–101） | 无 `description` 分支 | 新增 `description` 关键字过滤 |

```diff
                   { title: '名称', key: 'name', minWidth: 120, searchable: true, sortable: true },
+                  {
+                    title: '描述', key: 'description', minWidth: 180, searchable: true, sortable: true,
+                    searchPlaceholder: '请输入描述查询',
+                    render: function (row) { return IvuUI.escapeHtml(row.description || '-'); }
+                  },
                   { title: '类型', key: 'type', minWidth: 100, searchable: true, sortable: true },
```

> `pages/entity.html:201` 的「描述」列属于**实体类型列表**，为既有列，未改动。

### 2.5 原型 · Mock 数据

**文件**：`design-docs/prototype-design/assets/js/mock-data.js`

| id | name | 新增 `description` |
| -- | ---- | ------------------ |
| 1 | `rd-dept` | `研发部门，负责平台与算法研发` |
| 2 | `algo-team` | `算法团队，负责模型调优与推理服务` |
| 3 | `qa-team` | `测试团队，负责质量保障` |
| 4 | `alice@default` | `''`（空值，覆盖列表显示 `-` 场景） |

### 2.6 UI 实现（阶段 2 第 6 步）

| 文件 | 变更点 |
| ---- | ------ |
| `src/modules/Entity/components/EntityList.vue` | `columns` 在「名称」后插入「描述」列（`render` 空值显示 `-`） |
| `src/modules/Entity/components/EntityUpsert.vue` | `formData` 新增 `description: ''`；基本信息 Card 新增「描述」`FormItem`（**无 `required`**，仅 placeholder「请输入Entity描述」、**无 `form-tip` 小字**）；新增 `validateDescription` 并挂入 `ruleValidate.description`；`initFormData` 归一化 `null/undefined → ''`；提交沿用 `cloneDeep(formData)` |
| `src/modules/Entity/components/EntityView.vue` | `basicInfo` 名称后新增「描述」`info-row` |
| `src/i18n/zh.js` / `en.js` | entity 块新增 `entityDescriptionPlaceholder`、`descriptionLengthError`、`descriptionControlCharsError`；**`descriptionPlaceholder` 保持为 EntityType 专用，未改动** |

```diff
       <FormItem :label="$t('entity.name')" prop="name">
         ...
       </FormItem>
+
+      <FormItem :label="$t('entity.description')" prop="description">
+        <Input
+          v-model="formData.description"
+          :maxlength="255"
+          :placeholder="$t('entity.entityDescriptionPlaceholder')"
+        ></Input>
+      </FormItem>
```

```js
// Validate description (optional; 0-255 chars; no control chars)
const validateDescription = (rule, value, callback) => {
    const val = value === null || value === undefined ? '' : String(value);
    if (val === '') { callback(); return; }
    if (val.length > 255) { callback(new Error(this.$t('entity.descriptionLengthError'))); return; }
    if (/[\x00-\x1F\x7F]/.test(val)) { callback(new Error(this.$t('entity.descriptionControlCharsError'))); return; }
    callback();
};
```

> 提交语义：编辑页使用 **PATCH** `entities/${this.currentId}`（`EntityList.vue` `updateReq`）；PATCH 下省略 `description` 保持原值、显式 `""` 清空。表单始终提交当前输入值，故清空描述时发出 `""` 即达成清空。

---

## 3. 修改 · `protocol_paths` 语义升级为「上游 API 基路径」

**对照接口**：`providers.md`（`protocol_paths` 语义说明，L119–132）  
**对照原型**：`prototype-design/pages/providers.html` → `assets/js/provider-upsert.js`

### 3.1 接口依据

`providers.md:119–132`：

- 配置值 = 该协议官方 SDK `base_url` 的 **path 部分**（openai 含 `/v1` 尾，anthropic 不含）；
- 改写规则：anthropic 请求 `/v1/messages`（及子路径）改写为 `{anthropic}/v1/messages`；openai 命中标准端点时**先剥离可选 `/v1` 前缀**再拼接 base——`/v1/chat/completions` 与 `/chat/completions` 均改写为 `{openai}/chat/completions`；
- 未配置（或该协议无条目）时**请求路径原样转发**；
- `gemini` 不支持路径改写。

PATCH 约定（`providers.md:359`）：`protocol_paths` 提供即全量替换，**省略或传 `null` 保留原值；清空须显式传入 `"protocol_paths": {}`**。

### 3.2 原型

**文件**：`design-docs/prototype-design/assets/js/provider-upsert.js`

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `renderProtocolPaths` helpTip（L521–522） | 「上游路径前缀」语义 | 「按协议配置**上游 API 基路径**；BFE 转发时将命中的标准端点改写到该基路径（openai 兼容带/不带 `/v1` 的客户端入口）…若清空所有映射，保存时将显式提交空对象以禁用路径改写」 |
| 表头（L570） | `上游路径前缀` | `上游 API 基路径` |
| 输入框 placeholder | 旧示例 | `例如 /v1` |
| 空态行 | 旧文案 | `未配置协议路径映射（保存后请求路径原样转发）` |
| `validate()` 错误文案（L932） | 「上游路径前缀格式不正确」 | 「协议 "x" 的**上游 API 基路径**格式不正确，须以 `/` 开头，不以 `/` 结尾，不含 `?`、`$`、`#`、`..`」 |

### 3.3 UI 实现（阶段 2 第 6 步）

`ProviderUpsert.vue`（表头 L142、Tooltip L132）与 `ProviderView.vue`（表头 L87）的文案均由 i18n 词条驱动，故**仅改 i18n 即生效，Vue 文件无结构改动**。

| 文件 | 变更点 |
| ---- | ------ |
| `src/i18n/zh.js` / `en.js` | provider 块：`protocolPathHelp` / `protocolPathPrefix` / `protocolPathPrefixInvalid` / `protocolPathPrefixTrailingSlash` / `protocolPathPrefixInvalidChars` 文案升级为「上游 API 基路径」 |
| `src/modules/Providers/components/ProviderUpsert.vue` | 无需改动；`buildPayload` 已**始终**提交 `protocol_paths`（为空时提交 `{}`），满足「清空须显式 `{}`」语义 |

---

## 4. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `design-docs/prototype-design/assets/js/entity-upsert.js` | 修改 | 新增 `validateEntityDescription`；表单新增「描述」输入（非必填、无星号、无提示小字）；详情新增「描述」行；校验绑定 |
| `design-docs/prototype-design/pages/entity.html` | 修改 | Entity 列表新增「描述」列 + `filterEntityRows` 过滤分支 |
| `design-docs/prototype-design/assets/js/mock-data.js` | 修改 | 4 条 entity mock 新增 `description` |
| `design-docs/prototype-design/assets/js/provider-upsert.js` | 修改 | `protocol_paths` 文案语义升级为「上游 API 基路径」 |
| `src/modules/Entity/components/EntityList.vue` | 修改 | 新增「描述」列 |
| `src/modules/Entity/components/EntityUpsert.vue` | 修改 | `formData` / 表单 / 校验新增 `description` |
| `src/modules/Entity/components/EntityView.vue` | 修改 | 详情新增「描述」行 |
| `src/modules/Providers/components/ProviderUpsert.vue` | 无改动 | 文案由 i18n 驱动；`buildPayload` 已满足清空提交 `{}` |
| `src/modules/Providers/components/ProviderView.vue` | 无改动 | 文案由 i18n 驱动 |
| `src/i18n/zh.js`、`src/i18n/en.js` | 修改 | entity 描述词条 + provider 路径映射文案 |
| `api-define/OpenAPI接口定义/entities.md`、`providers.md` | 已同步 | 自 api 仓库 rsync 同步 |

---

## 5. 验收清单

### 实体 · 列表

- [ ] 「描述」列位于 名称 之后、类型 之前
- [ ] 描述为空的行显示 `-`
- [ ] 「描述」列搜索框可按关键字过滤，排序可用

### 实体 · 创建 / 编辑

- [ ] 基本信息 Card 顺序为 名称 → 描述 → 类型 → …
- [ ] 「描述」**无必填星号**（接口为非必填）
- [ ] 「描述」下方**无提示小字**，placeholder 为「请输入Entity描述」（不体现「选填」）
- [ ] 留空提交成功；超过 255 字符报错；含控制字符报错
- [ ] 编辑时回显已有描述；清空后保存，PATCH 显式提交 `""`，描述被清空

### 实体 · 查看详情

- [ ] 详情顺序为 名称 → 描述 → 类型
- [ ] 描述为空显示 `-`

### 服务商 · 协议路径映射

- [ ] 表头/提示/错误文案均使用「上游 API 基路径」语义
- [ ] 清空所有映射后保存，请求体显式提交 `"protocol_paths": {}`
- [ ] 键 ⊆ `model_protocols`、值以 `/` 开头不以 `/` 结尾、不含 `?$#..`

### 原型

- [ ] `prototype-design/pages/entity.html` 列表列、创建/编辑抽屉、详情抽屉与 UI 一致
- [ ] `prototype-design/pages/providers.html` 协议路径映射文案与 UI 一致

### 构建

- [ ] `npm run lint` 无报错
- [ ] 页面无控制台报错

---

## 6. 注意事项

1. **⚠️ 数据库须重置**：`entities` 表新增 `description` 列，旧 DB 缺失该列会导致 `/entities` 相关接口报错。阶段 1 已生成最新 `db_ddl_sqlite.sql`，须删除旧 `data/ai_gateway.db` 后用最新 SQL 重建并重启 `start.sh`。
2. **描述为非必填**：原型与 UI 均**不得**给「描述」加必填星号（`IvuUI.formTopItem` 第三参数 / iView `FormItem` 的 `required` 规则均不设置）。
3. **PUT 与 PATCH 语义差异**：PUT 省略 `description` 会**清空**；PATCH 省略则**保留原值**，显式 `""` 才清空。编辑页当前用 PATCH。
4. **i18n 键名冲突**：`entity.descriptionPlaceholder` 已被 EntityType 使用，新增 Entity 描述词条须另起键名（如 `entity.descPlaceholder`）。
5. **`protocol_paths` 清空须显式 `{}`**：省略或传 `null` 均保留原值，前端「清空映射」必须提交空对象。
6. **`entity-upsert.js` 内两处「描述」**：L265–273 为 Entity（0–255），L534–541 为 EntityType（0–1024），本次仅前者改动。

---

## 7. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `design-docs/api-define/OpenAPI接口定义/entities.md` | Entity 接口定义，新增可选 `description` |
| `design-docs/api-define/OpenAPI接口定义/providers.md` | Provider 接口定义，`protocol_paths` 语义说明 |
| `design-docs/prototype-design/pages/entity.html` | 实体原型页（抽屉渲染依赖 `entity-upsert.js`） |
| `design-docs/prototype-design/assets/js/entity-upsert.js` | 已同步 Entity 描述 |
| `design-docs/prototype-design/assets/js/provider-upsert.js` | 已同步路径映射文案 |
| `design-docs/modifications/2026-09-15-protocol-paths-and-epp-limits/ui-code-changes.md` | `protocol_paths` 功能初次引入的变更记录 |
| `design-docs/modifications/2026-09-05-entity-name-allow-at/ui-code-changes.md` | Entity 名称规则变更记录 |
