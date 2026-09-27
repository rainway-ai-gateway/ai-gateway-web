# UI 代码变更文档

> **对照接口**：`providers.md`（无变更，未新增/修改任何端点）  
> **对照原型**：`prototype-design/pages/providers.html`（配套 `assets/js/provider-upsert.js`）  
> **状态**：**原型已完成** · **UI 代码已完成**

本文记录 2026-09-21 两项 UI 变更：

1. **服务商「模型列表」位置调整**：从独立 Card 并入「模型服务配置」Card，编辑页与详情页一致，原型与文档同步；
2. **`pageTable` 筛选行与数据表横向滚动联动**：通用组件级改动，所有列表页自动生效。

两项均不涉及后端接口变更。

---

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 状态 |
| ----------- | -------- | ---- |
| 服务商 · 创建 / 编辑 | 「模型列表」并入「模型服务配置」Card，顺序固定为 模型协议 → 模型列表接口 → 模型列表 | ✅ UI 代码 |
| 服务商 · 查看详情 | 同上，删除独立的「模型列表」Card，标签改用 `provider.modelList` | ✅ UI 代码 |
| 通用表格组件 `pageTable` | 筛选行与数据表横向滚动条双向联动 | ✅ UI 代码 |
| 原型 `prototype-design` | `renderModelListCard()` → `renderModelListField()`，编辑/详情同步调整 | ✅ 原型 |
| 用户手册 | `docs/zh-cn/03-model-provider.md` 分区与章节重编号 | ✅ 文档 |
| 设计文档 | `sys-design/各模块实现细节设计/模型服务商.md` 分区表与详情说明 | ✅ 文档 |
| 手册截图 | `docs/zh-cn/images/04-provider-*.png` 共 4 张重拍 | ✅ 文档 |
| 后端接口 | 无变更 | — |

---

## 2. 修改 · 模型列表并入「模型服务配置」

**对照接口**：`providers.md`（无变更；「模型列表」仍为 `models` 字段，`PUT/POST providers` 提交，「获取」仍调用 `POST /providers/tools/discover-models`）  
**对照原型**：`prototype-design/pages/providers.html` → `assets/js/provider-upsert.js`

### 2.1 编辑页

**文件**：`src/modules/Providers/components/ProviderUpsert.vue`

**位置**：`prop="models"` 的 `FormItem` 从原 L202–246（独立 Card）移至 L82（「模型服务配置」Card 内）

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 承载容器 | 底部独立 `<Card class="llm-section-card">`（第 4 个 Card） | 「模型服务配置」Card 内（L42 起）第 3 个 `FormItem` |
| 分区顺序 | 模型协议 → 模型列表接口 | **模型协议 → 模型列表接口 → 模型列表** |
| 字段名 / 校验规则 | `models`、`rules.models` | **未改动** |
| 交互（获取 / 批量添加 / 粘贴 / 回车添加） | — | **未改动**，仅位置迁移 |

```diff
         </FormItem>
+
+        <FormItem prop="models">
+          <p slot="label" class="field-label">
+            {{ $t('provider.modelList') }}
+            <Tooltip placement="top" transfer max-width="360">
+              <div slot="content" class="field-tip-content">
+                <p>{{ $t('provider.modelsListTip') }}</p>
+              </div>
+              <Icon type="ios-help-circle-outline" class="field-help-icon" />
+            </Tooltip>
+          </p>
+          <div class="models-row">
+            <el-select
+              v-model="formData.models"
+              style="flex: 1;"
+              size="small"
+              multiple
+              filterable
+              allow-create
+              default-first-option
+              :placeholder="modelsSelectPlaceholder"
+              @paste.native="onModelsPaste"
+            >
+              <el-option v-for="item in modelsList" :key="item" :value="item" :label="item" />
+            </el-select>
+            <span class="discover-btn-wrap">
+              <Button @click="showBatchModelsModal">{{ $t('provider.batchAddModels') }}</Button>
+              <Button
+                type="primary"
+                :loading="discoverLoading"
+                :disabled="!canDiscoverModels"
+                @click="discoverModels"
+                >{{ $t('provider.syncModels') }}</Button
+              >
+            </span>
+          </div>
+        </FormItem>
       </Card>
```

同时删除原底部独立 Card（原 L244–294）：

```diff
-      <Card class="llm-section-card">
-        <FormItem prop="models">
-          ...（与上方完全相同的 FormItem 内容）...
-        </FormItem>
-      </Card>
-
     </Form>
```

> 组件内仅此一处 DOM 迁移，`showBatchModelsModal` / `discoverModels` / `onModelsPaste` / `canDiscoverModels` / `modelsSelectPlaceholder` 等方法与计算属性均未改动。

### 2.2 查看详情

**文件**：`src/modules/Providers/components/ProviderView.vue`

**位置**：新增 `info-row` 于 L73（「模型服务配置」Card L61 内，紧随「模型列表接口」L69 之后）；删除原独立 Card（原 L111–120）

| 项 | 变更前 | 变更后 |
| -- | ------ | ------ |
| 承载容器 | 独立 `<Card :title="$t('provider.modelList')" class="info-card">` | 「模型服务配置」Card 内第 3 个 `info-row` |
| Card 顺序 | 基本信息 → 实例池 → 模型服务配置 → 协议路径映射 → 服务鉴权 Keys → **模型列表** → 分段计价配置 | 基本信息 → 实例池 → 模型服务配置（含模型列表） → 协议路径映射（L82） → 服务鉴权 Keys（L100） → 分段计价配置（L118） |
| 标签词条 | `provider.models` | `provider.modelList` |

```diff
       <div class="info-row">
         <span class="info-label">{{ $t('gatewayConfig.modelListEndpoint') }}</span>
         <span class="info-value">{{ endpointUrl }}</span>
       </div>
+      <div class="info-row">
+        <span class="info-label">{{ $t('provider.modelList') }}</span>
+        <span class="info-value">
+          <Tag v-for="item in currentData.models || []" :key="item">{{ item }}</Tag>
+          <span v-if="!(currentData.models || []).length">-</span>
+        </span>
+      </div>
     </Card>
```

```diff
-    <Card :title="$t('provider.modelList')" class="info-card">
-      <div class="info-row">
-        <span class="info-label">{{ $t('provider.models') }}</span>
-        <span class="info-value">
-          <Tag v-for="item in currentData.models || []" :key="item">{{ item }}</Tag>
-          <span v-if="!(currentData.models || []).length">-</span>
-        </span>
-      </div>
-    </Card>
-
     <Card :title="$t('provider.pricingTiers')" class="info-card">
```

### 2.3 原型

**文件**：`design-docs/prototype-design/assets/js/provider-upsert.js`

| 函数 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `renderModelListCard()` | 返回手写 `.llm-card`，标题内联红色星号 `<span style="color:#ed4014;...">*</span>` | 重命名为 **`renderModelListField()`**，返回 `IvuUI.formTopItem('模型列表' + helpIcon(MODEL_LIST_TIP), '<div class="proto-model-select-wrap">…</div>', true)`，必填星号改由第三参数 `true` 触发 `.ivu-form-item-required` |
| `renderForm()` | 底部单独调用 `renderModelListCard()` | 在 `renderEndpointUrlGroup(data, isView)` 之后拼接 `renderModelListField()`，删除底部调用 |
| `renderDetail()` | 独立 `IvuUI.card('模型列表', …)`（位于服务鉴权 Keys 与分段计价之间） | 在 `formTopItem('模型列表接口', …)` 之后追加 `formTopItem('模型列表', renderTags(data.models))`，删除独立 card |

```diff
         '模型服务配置',
         IvuUI.formTop(
           IvuUI.formTopItem('模型协议', renderTags(data.model_protocols)) +
-            IvuUI.formTopItem('模型列表接口', IvuUI.escapeHtml(endpointUrl)),
+            IvuUI.formTopItem('模型列表接口', IvuUI.escapeHtml(endpointUrl)) +
+            IvuUI.formTopItem('模型列表', renderTags(data.models)),
         ),
       ) +
```

> `#proto-provider-models`、`#provider-batch-add-models`、`renderDiscoverButton(data)` 的 ID 与事件绑定保持不变，抽屉内交互脚本无需调整。

### 2.4 用户手册

**文件**：`docs/zh-cn/03-model-provider.md`

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| 「首次接入最小配置」表 | `模型服务配置`、`模型列表` 分列两行 | 合并为一行，`模型列表` 标注为**必填、至少 1 个模型** |
| §4.2 分区列表 | `3. 模型服务配置（模型协议、模型列表接口）`、…、`6. 模型列表` | `3. 模型服务配置（模型协议、模型列表接口、模型列表）`，删除独立第 6 项 |
| §4.5 | 表格无「模型列表」行 | 新增「模型列表」行 + `### 模型列表` 子节（必填说明、校验规则、操作表、常见坑） |
| §4.8 | `## 4.8 模型列表` 独立章节 | **整节删除**（内容并入 §4.5） |
| §4.8 查看详情 | 未提及模型列表归属 | 正文改为「…模型服务配置（模型协议、模型列表接口、模型列表）、协议路径映射…」 |
| 章节编号 | 4.8 查看详情 / 4.9 分段计价 / 4.10 注意事项（原为 4.9 / 4.10 / 4.11） | 依次上移一位 |

> 重编号后 `06-model-prices.md:154` 的锚点 `03-model-provider.md#49-分段计价配置` 由失效变为有效。

### 2.5 设计文档

**文件**：`design-docs/sys-design/各模块实现细节设计/模型服务商.md`

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| §3.2 分区表 | 「模型服务配置」仅含 `model_protocols`、`model_endpoint`；「模型列表」为独立分区行 | 「模型服务配置」追加 `models`，并注明 **Card 内顺序固定为 模型协议 → 模型列表接口 → 模型列表**；分区行改名为「模型服务配置 · 模型列表」 |
| §3.3 详情 | 仅描述只读展示各分区 | 追加「模型列表与编辑页一致，并入「模型服务配置」Card，**无独立 Card**」 |

### 2.6 手册截图

**目录**：`docs/zh-cn/images/`

| 文件 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| `04-provider-upsert.png` | 模型列表为底部独立 Card | 模型列表并入「模型服务配置」，含「批量添加」+「获取」 |
| `04-provider-view.png` | 存在独立「模型列表」Card | 合并后的详情抽屉 |
| `04-provider-list.png` | 旧布局 | 重拍 |
| `04-provider-pricing-tiers.png` | 旧布局 | 重拍 |

> 通过 `ai-gateway-web-test/scripts/capture-docs-screenshots.js --only=provider` 对真实 dev server 截图，再由 `docs/scripts/build-manual.js` 同步至 `docs/zh-cn/site/images/`。

---

## 3. 修改 · `pageTable` 筛选行与数据表横向滚动联动

**文件**：`src/components/table/pageTable.vue`  
**对照接口**：无（纯前端交互）

### 3.1 问题与根因

`pageTable` 用**两个独立的 iView Table** 分别渲染筛选行（`.searchTable`）与数据表（`.show-iView-Table`），二者各自带一条横向滚动条。当列较多时，拖动上方筛选行的滚动条，下方数据表不同步，需手动再拖一次。

**注意**：`scroll` 事件**不冒泡**，无法在父节点用普通 `@scroll` 代理。

### 3.2 实现

**位置**：根节点 L32、方法 L571–601

| 位置 | 变更前 | 变更后 |
| ---- | ------ | ------ |
| 根节点（L32） | `<div class="page-table">` | `<div class="page-table" @scroll.capture="onTableScroll">`（捕获阶段事件代理） |
| 方法 | 无 | 新增 `onTableScroll(event)`、`findHorizontalScroller(root)` |

```diff
-  <div class="page-table">
+  <div class="page-table" @scroll.capture="onTableScroll">
```

```js
// 筛选行与数据表是两个独立的 iView Table，各自带横向滚动条，这里让它们同步滚动
onTableScroll(event) {
    const target = event.target;
    if (!target || target.scrollWidth <= target.clientWidth) {
        return;
    }
    const searchRoot = this.$el.querySelector('.searchTable');
    const tableRoot = this.$el.querySelector('.show-iView-Table');
    if (!searchRoot || !tableRoot) {
        return;
    }
    const fromSearch = searchRoot.contains(target);
    if (!fromSearch && !tableRoot.contains(target)) {
        return;
    }
    const peer = this.findHorizontalScroller(fromSearch ? tableRoot : searchRoot);
    if (peer && peer.scrollLeft !== target.scrollLeft) {
        peer.scrollLeft = target.scrollLeft;
    }
},
findHorizontalScroller(root) {
    const list = root.querySelectorAll('.ivu-table-body, .ivu-table-tip');
    for (let i = 0; i < list.length; i++) {
        const el = list[i];
        // 仅取可见且确实存在横向溢出的一层，排除固定列等内部滚动容器
        if (el.offsetParent !== null && el.scrollWidth > el.clientWidth) {
            return el;
        }
    }
    return null;
}
```

**要点**：

- **双向同步**：`fromSearch` 判定事件来源，反向同步到对侧容器；
- **空数据兼容**：同时匹配 `.ivu-table-body` 与 `.ivu-table-tip`（iView 空数据「暂无数据」层也具备横向滚动）；
- **固定列排除**：仅取 `offsetParent !== null` 且 `scrollWidth > clientWidth` 的一层，避开固定列内部的滚动容器；
- **无横向溢出直接返回**：不影响纵向滚动与页面其他滚动容器。

### 3.3 生效范围

`pageTable` 为通用组件，改动对以下 14 个消费页面**自动生效**：

| 模块 | 文件 |
| ---- | ---- |
| 模型定价 | `src/modules/ModelPrices/index.vue` |
| 证书 | `src/modules/Cert/index.vue` |
| 路由 | `src/modules/RouteTable/index.vue`、`src/modules/RouteTable/components/RouteRules.vue` |
| EPP 池 | `src/modules/EppPool/components/Assignments.vue` |
| 报表 | `src/modules/Report/components/Logs.vue` |
| 实体 | `src/modules/Entity/components/EntityList.vue`、`src/modules/Entity/components/EntityTypeList.vue` |
| 服务商 | `src/modules/Providers/index.vue` |
| 用户 | `src/modules/User/components/User.vue`、`src/modules/User/components/Token.vue` |
| 集群 | `src/modules/Clusters/index.vue` |
| 操作日志 | `src/modules/OperationLogs/index.vue` |
| API Key | `src/modules/APIKey/components/ApiKeyList.vue` |

---

## 4. 变更文件清单

| 文件 | 操作 | 摘要 |
| ---- | ---- | ---- |
| `src/modules/Providers/components/ProviderUpsert.vue` | 修改 | `prop="models"` FormItem 由独立 Card（原 L244）迁入「模型服务配置」Card（L82），删除原 Card |
| `src/modules/Providers/components/ProviderView.vue` | 修改 | 「模型服务配置」Card 内新增模型列表 `info-row`（L73），删除独立「模型列表」Card（原 L111–120），词条改用 `provider.modelList` |
| `src/components/table/pageTable.vue` | 修改 | 根节点加 `@scroll.capture`（L32），新增 `onTableScroll` / `findHorizontalScroller`（L569–600） |
| `design-docs/prototype-design/assets/js/provider-upsert.js` | 修改 | `renderModelListCard` → `renderModelListField`；`renderForm` / `renderDetail` 调用点调整 |
| `docs/zh-cn/03-model-provider.md` | 修改 | 「模型列表」并入 §4.5 模型服务配置；删除原 §4.8；章节重编号 |
| `design-docs/sys-design/各模块实现细节设计/模型服务商.md` | 修改 | §3.2 分区表、§3.3 详情说明同步 |
| `docs/zh-cn/images/04-provider-upsert.png` | 修改 | 重拍 |
| `docs/zh-cn/images/04-provider-view.png` | 修改 | 重拍 |
| `docs/zh-cn/images/04-provider-list.png` | 修改 | 重拍 |
| `docs/zh-cn/images/04-provider-pricing-tiers.png` | 修改 | 重拍 |

> `docs/zh-cn/site/images/04-provider-*.png` 为 `docs/scripts/build-manual.js` 的生成产物，不单独列出。

---

## 5. 验收清单

### 服务商 · 创建 / 编辑

- [ ] 「模型服务配置」Card 内顺序为 模型协议 → 模型列表接口 → 模型列表
- [ ] 页面底部不再有独立的「模型列表」Card
- [ ] 「模型列表」为空提交时仍触发必填校验（`models` 规则未失效）
- [ ] 「获取」可拉取并覆盖回填；「批量添加」可粘贴多名称合并去重；输入后回车可新增
- [ ] `models` 字段提交后详情页可正确回显

### 服务商 · 查看详情

- [ ] 详情抽屉内「模型服务配置」显示 模型协议 → 模型列表接口 → 模型列表
- [ ] 无独立「模型列表」Card；分段计价配置仍在最后一张 Card
- [ ] 模型列表为空时显示 `-`；多模型时以 Tag 展示

### 通用表格滚动联动

- [ ] 列较多时（如 API Key 列表、模型定价）拖动上方筛选行横向滚动条，下方数据表同步
- [ ] 反向拖动数据表横向滚动条，上方筛选行同步
- [ ] 空数据（「暂无数据」）状态下同样可同步
- [ ] 无横向溢出的表格不受影响，纵向滚动正常
- [ ] 页面整体滚动条、分页、行点击等原有交互无回归

### 原型

- [ ] `prototype-design/pages/providers.html` 创建/编辑抽屉与详情抽屉均与 UI 一致
- [ ] 原型「模型列表」显示必填星号，交互（获取 / 批量添加 / 粘贴）可用

### 文档与截图

- [ ] `docs/zh-cn/03-model-provider.md` 无残留独立「模型列表」章节，编号连续
- [ ] 4 张 `04-provider-*.png` 与当前 UI 一致
- [ ] `node docs/scripts/build-manual.js` 通过（图片与链接校验无误）

### 构建

- [ ] `npm run lint` 无报错
- [ ] 页面无控制台报错

---

## 6. 注意事项

1. **无接口变更**：本次仅前端展示位置与滚动交互调整，`providers` 相关端点、`models` 字段、`discover-models` 工具接口均未改动。
2. **i18n 词条未新增/删除**：`provider.modelList`、`provider.modelsListTip`、`provider.batchAddModels`、`provider.syncModels` 均为既有词条；`provider.models` 仍被 `Providers/index.vue:134` 列表页「模型」列使用，**不可删除**。
3. **`src/main.js` 版本串**：`_VERSION_` → `0.0.10@20260920182438` 为构建过程写入的产物，不作为功能变更。
4. **`pageTable` 为公共组件**：改动会影响全部 14 个列表页，回归时建议至少覆盖一个横向溢出场景与一个无溢出场景。
5. **`scroll` 不冒泡**：后续如需扩展联动逻辑，须继续使用捕获阶段（`@scroll.capture`）事件代理。
6. **`ai-gateway-web-test/conf.json` 已改指 8180**：原 8085 端口被不相关的 `cc-ui` 进程占用，截图与 E2E 统一改走 `ai-gateway-web` 自身 dev server（`http://localhost:8180/login`），API 仍为 `http://127.0.0.1:8183`。该配置为本地调试便利，若 CI 环境端口不同请以 CI 为准。
7. **`ai-gateway-web-test/api/resource-api-utils.js` 清理**：删除已失效的 `getBfePoolList` / `getBfePool` / `updateBfePool` 导出（对应接口早已移除，残留导出会导致模块 `require` 直接抛错）。

---

## 7. 关联文档

| 文档 | 说明 |
| ---- | ---- |
| `design-docs/prototype-design/pages/providers.html` | 服务商原型页面（抽屉渲染依赖 `provider-upsert.js`） |
| `design-docs/prototype-design/assets/js/provider-upsert.js` | 已同步「模型列表」位置 |
| `design-docs/sys-design/各模块实现细节设计/模型服务商.md` | §3.2 分区表、§3.3 详情说明已同步 |
| `docs/zh-cn/03-model-provider.md` | 用户手册服务商章节，已同步并重编号 |
| `docs/zh-cn/06-model-prices.md` | §L154 锚点 `#49-分段计价配置` 因重编号恢复有效 |
| `modifications/2026-09-17-providers-models/ui-code-changes.md` | 「模型列表」功能初次引入的变更记录 |
| `ai-gateway-web-test/scripts/capture-docs-screenshots.js` | 手册截图脚本，支持 `TEST_BASE_URL` 覆盖 |
