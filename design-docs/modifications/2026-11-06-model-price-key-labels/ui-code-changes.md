# UI 代码变更：模型定价价格项增加中文备注（issue #140）

> **日期**: 2026-11-06 ｜ **上游依据**: [ai-gateway-web issue #140「模型定价：缓存命中、未命中及输出等关键价格项目前显示为英文参数」](https://github.com/rainway-ai-gateway/ai-gateway-web/issues/140)（MercuryLi，2026-11-04）：建议价格项统一中文描述，或至少提供中文备注
> **对照接口**: `prices` / `tier_prices` 的键为 litellm 风格英文参数名（接口契约）——**键值不变、接口零改动**；仅展示层加中文备注
> **对照原型**: 待同步
> **状态**: 原型 ⬜ · UI 代码 ✅（node 断言 + eslint + 构建通过）· 02 文档 ⬜ · 手册 ⬜ ｜ **菜单/路由变更**: 无

## 1. 变更总览

| 页面 / 模块 | 变更要点 | 验证 |
| ----------- | -------- | ---- |
| 定价创建/编辑 · 价格项下拉（`ModelPriceUpsert.vue`，含阶梯价格行） | `el-option` 展示改为「英文键（中文备注）」，如 `cache_read_input_token_cost（缓存命中输入）`；`:value` 仍为英文键 | eslint + 构建 |
| 定价详情 · 价格表 / 阶梯价格表（`ModelPriceView.vue`） | 键名单元格同样显示「英文键（中文备注）」 | eslint + 构建 |
| `src/utils/price.js` | 新增 `PRICE_KEY_LABELS`（30 个价格键 → 中文）与 `priceKeyLabel()`；未收录键回退英文原名；非中文界面回退英文原名 | node 断言 4 例 |

## 2. 接口变更（diff）

无。提交体 `prices` 的键、`tier_prices` 的键、`priceKeyOptions` 候选值均保持英文原名；中文只出现在 option 的 `label` 与详情展示文本。

## 3. 规则细节与取舍

- **保留英文键 + 中文备注**（按 issue「至少提供中文备注」口径）：格式 `英文键（中文备注）`，英文参数名在前便于检索/复制到接口或日志，中文备注放括号内便于识别。
- **`filterable` 搜索不受影响**：element-ui 的 Select 默认按 `label` 过滤，英文键仍包含在 label 内，搜 `input_cost` 或「缓存」都能命中。
- **未收录键回退**：`PRICE_KEY_LABELS` 只覆盖当前 `PRICE_KEY_OPTIONS` 的 30 个键；后端新增键显示英文原名，不会出现空白。
- **非中文界面回退**：`priceKeyLabel()` 通过 `getLang()` 判断，`en` 下返回原英文键，英文用户行为与改动前一致。
- **范围**：只处理 `prices` / `tier_prices` 的价格项；`limits` 键（`context_window` 等）、`capabilities`、`supported_parameters`、`mode` 等其它英文枚举未在卡片点名，保持原样。
- **文案口径**：按 DeepSeek 习惯命名——`input_cost_per_token`=输入、`cache_read_input_token_cost`=缓存命中输入、`cache_creation_input_token_cost`=缓存未命中输入（写入）、`output_cost_per_token`=输出，档位键带「超 200K/256K/272K/512K 上下文」。

## 4. 既有用例影响

价格项下拉的 `:value` 未变，若既有用例按 value 断言不受影响；若按可见文案断言 `total_token`/`input_cost_per_token` 等，需改为「中文（英文键）」形式。

## 5. 验收清单

- [x] 格式化函数 node 断言：中文界面输出「输入（input_cost_per_token）」等；未收录键回退英文；`en` 下回退英文。
- [x] eslint 通过、`npm run build` 通过（仅既有包体积警告）。
- [ ] 浏览器复验：定价编辑页价格项下拉显示中文备注，搜索「缓存」/`cache` 均可命中，选中后提交体键仍为英文。
- [ ] 浏览器复验：详情页价格表、阶梯价格表键名列显示中文备注。
- [ ] 02 文档/手册同步（如适用）。