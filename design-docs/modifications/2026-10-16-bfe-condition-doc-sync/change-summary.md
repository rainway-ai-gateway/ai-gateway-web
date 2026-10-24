# 变更摘要：BFE 条件原语文档同步至 v1.8.9-dev

日期：2026-10-16

## 背景

`design-docs/bfe-condition-primitive-define/condition/` 此前是本地 bfe `develop`（v1.8.8）文档的拷贝，落后于官方最新分支 `bfenetworks/bfe@v1.8.9-dev`。该分支新增了系统时间原语 `time_weekday_in(weekday_list, zone)`（PR #1425，特性提交 `bb0fd3ab`），并补收了 `request/intent.md`（`req_ai_intent_in`）。

## 本次变更

| 项 | 内容 |
| --- | --- |
| bfe 工作区 | `bfe/` 切换到新分支 `v1.8.9-dev`（跟踪新增 remote `upstream` = `github.com/bfenetworks/bfe`，分支头 `d444b096`，2026-10-15）。原 `develop` 分支保留未动。验证：`CGO_ENABLED=0 go test ./bfe_basic/condition/...` 全部通过（默认 cgo 在本机触发 dyld `missing LC_UUID` 环境错误，与代码无关）。 |
| 文档同步 | `rsync -a --delete` 将 `bfe/docs/zh_cn/condition/`（v1.8.9-dev）整体镜像到 `design-docs/bfe-condition-primitive-define/condition/`，已校验**逐字节一致**。 |

同步进来的文档差异：

- `system/time.md`：新增 `time_weekday_in(weekday_list, zone)` 定义（`0`=周日…`6`=周六；`zone` 可省略、缺省 Z/UTC，国内规则显式写 `"H"`）；
- `condition_primitive_index.md`：新增 `time_weekday_in` 索引条目（系统/time 分组）及此前缺失的 `intent` 分组（`req_ai_intent_in`）；
- `condition_naming_convention.md`：补充 `time_` 前缀说明（对"`bfe_` 前缀"约定的有意偏离，与 `req_host_tag_in` 同构）；
- `request/intent.md`：新增文件。

## 状态与后续

- 文档现为 v1.8.9-dev 的忠实镜像；后续升级用 `git -C bfe pull upstream v1.8.9-dev` 后重新 rsync 即可。
- **启用进展（2026-10-16 续）**：
  1. ✅ **控制面已就绪**：`ai-gateway-api@v0.0.11-dev`（HEAD `5cc52e7`）提交中的 `go.mod` 已 pin `mileszhang2016/bfe@v1.4.1-0.20261014135930-831135f2bfa5`（含 `time_weekday_in`，仅比 v1.8.9-dev 分支头 `89defa14` 少一个 access-log logid 修复）。`go build ./...` 通过；`condition.Build` 实测：`time_weekday_in("0|6", "H")` / 单参数形式均编译通过，`bfe_cluster_in` 正确拒绝。
  2. ✅ **UI 已就绪**：`ExpressionConfig.js` `system` 分组新增 `time_weekday_in` 按钮，面板与运行时 61 条原语集合脚本比对缺失/多余均为 0；仓库内手册 `docs/zh-cn/10-route.md` 与 `sys-design/组件与复用设计文档.md` §3.3 已同步。
  3. ⬜ **数据面部署**：`bfe@v1.8.9-dev` 已验证可完整构建（`make build` 通过，产物 `bfe` 41MB）；需用该版本重建并部署数据面二进制，含 `time_weekday_in` 的规则才能加载生效。
