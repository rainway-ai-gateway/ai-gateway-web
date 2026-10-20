# /epp-assignments

## 1. 概述

EPP 实例组与 cluster 之间的分配由**分配器自动生成**（触发时机与算法见 `design-docs/modifications/2026-09-08-epp-scheduling-integration/design-changes.md` §4.2 与 `design-docs/modifications/2026-10-14-epp-single-instance/design-changes.md`：cluster 进入 EPP 模式时自动选组、`/epp-pool` 变更后自动修复悬空分配），本域仅提供**查询视图**与**手工覆写**（运维干预入口）；分配输入（实例组列表）来自 `/epp-pool`（见 [epp-pool.md](./epp-pool.md)）。

**分配粒度为实例组（group）**：`epp_assignments` 只记录 cluster → group 映射，组内实例（当前阶段每组恰好 1 个）由 `/epp-pool` 派生，本视图不再下发实例详情。

## 2. 接口清单

### 2.1 获取分配全量视图

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 分配全量视图（有效分配 + 未分配/空闲清单） | - |
| 端点 | /epp-assignments | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数（Query）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| cluster | string | 按 cluster 过滤 | N | 只返回该 cluster 的分配条目；不传返回全部 EPP 模式 cluster | 须为已存在且 `balance_mode=EPP` 的 cluster 名；否则返回 404 语义错误（未分配的 EPP cluster 返回空 `clusters` 并列入 `unassigned_clusters`，不报错） |

**执行逻辑**

1. 查询全部（或指定）`balance_mode=EPP` 的 cluster 的分配记录。
2. 校验每条分配的有效性：分配的组存在于实例池中且非空 → 有效；否则该 cluster 计入 `unassigned_clusters`（悬空分配由周期 reconciler 自动修复，见 `2026-10-14-epp-single-instance/design-changes.md` §2.3/§2.4）。
3. 汇总未分配 cluster 清单与空闲实例组清单，返回。

**返回数据（Data内容）**

| 字段 | 类型 | 说明 |
|------|------|------|
| clusters | []object | **有效分配**列表（未分配 cluster 不出现在此列表） |
| clusters[].cluster | string | cluster 名 |
| clusters[].group | string | 分配的实例组名 |
| unassigned_clusters | []string | `balance_mode=EPP` 但无有效分配的 cluster 名列表（含从未分配与分配悬空）。这些 cluster 导出 server_data_conf 时会**降级为 `WRR`**（无 EPP 实例可调度），api 同时输出 error 日志，属需尽快处理的异常态，单独列出便于巡检 |
| idle_groups | []string | 实例池中未承担任何 cluster 分配的组名列表。扩容新组后、完成分配前会出现在此列表 |

> **说明**：视图是 `epp_assignments`（cluster→group）与 `epp_instances`（/epp-pool）的**读时 join**，不引入冗余存储；实例详情（id/host/port）由消费方按 `group` 名与 `/epp-pool` 视图关联获取。
>
> **说明**：多个 cluster 分配到同一组是**合法**的——分配以 cluster 为单位指向组，不做组↔cluster 的一对一约束。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "clusters": [
            { "cluster": "cluster-a", "group": "g1" },
            { "cluster": "cluster-b", "group": "g1" },
            { "cluster": "cluster-c", "group": "g2" }
        ],
        "unassigned_clusters": ["cluster-d", "cluster-e"],
        "idle_groups": ["g3"]
    }
}
```

### 2.2 手工覆写单个 cluster 的分配

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 手工覆写单个 cluster 的分配（运维干预入口，触发 epp_data / server_data_conf version bump） | - |
| 端点 | /epp-assignments/{cluster} | - |
| 版本 | v1 | - |
| method | PUT | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| cluster | string | 集群名 | Y | - | 必填；类型为 [ClusterName](./00-common.md#15-集群名称clustername)；必须引用已存在且 `balance_mode=EPP` 的集群 |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| group_name | string | 目标实例组 | Y | 分配粒度为组 | 必填；非空；必须存在于 `/epp-pool` 当前实例池中且非空 |

**HTTP BODY参数示例**

```json
{
    "group_name": "g1"
}
```

**约束**

- `group_name` 必须存在于 `/epp-pool` 当前实例池中且非空。
- `EPP → WRR` 反向变更（见 [clusters.md](./clusters.md)）后分配记录休眠保留，不删除；再切回 `EPP` 时继续生效（如分配已悬空由 `/epp-pool` 变更时的自动修复处理）。

**执行逻辑**

1. 校验请求参数合法性（cluster 为 EPP 模式、组存在且非空）。
2. 写入/更新 `epp_assignments`（cluster 唯一键 upsert，只存 cluster → group 映射）。
3. bump epp_data / server_data_conf version（EPPAddr 下次导出即带出）。
4. 返回更新后的该 cluster 分配条目。

**返回数据（Data内容）**

| 字段 | 类型 | 说明 |
|------|------|------|
| cluster | string | cluster 名 |
| group | string | 覆写后分配的实例组名 |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "cluster": "cluster-a",
        "group": "g1"
    }
}
```

---
