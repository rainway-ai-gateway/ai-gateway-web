# /auth

## 1. 数据模型

**用户（User）**

```json
{
  "user_name": "user_demo",
  "is_admin": true
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 |
|------|------|------|----------|
| `user_name` | string | 用户名 | - |
| `is_admin` | bool | 是否为系统管理员 | `true`：System 权限；`false` 暂不支持 |

**Token**

```json
{
  "name": "token_demo",
  "token": "Xim4h3tR_Gp7o4h",
  "scope": "System"
}
```

**字段说明**

| 字段 | 类型 | 说明 | 可能取值 |
|------|------|------|----------|
| `name` | string | Token 名称 | 全局唯一 |
| `token` | string | Token 值 | 用于请求头鉴权 |
| `scope` | string | 权限范围 | `System` / `Support` |

**认证方式**

API 请求时需在 Header 的 `Authorization` 中携带凭证：
- Session Key：`Authorization: Session {session_key}`
- Token：`Authorization: Token {token}`

**Scope 划分**

| Scope | 说明 |
|------|------|
| `System` | 全部权限，包括全局配置、产品线资源和导出资源 |
| `Support` | 仅导出类资源，供 BFE 数据面模块导出配置 |

**约束**

- 普通用户和 Token 都会设定可访问资源的 Scope，只能访问 Scope 内资源。

## 2. 接口清单

### 2.1 创建用户

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 创建用户 | - |
| 端点 | /auth/users | - |
| 版本 | v1 | - |
| method | POST | - |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 用户名 | Y | - | 必填；类型为 [UserName](00-common.md#12-用户名username) |
| password | string | 用户密码 | Y | - | 必填；类型为 [Password](00-common.md#13-用户密码password)；不能等于 `user_name` 或其逆序 |
| is_admin | bool | 是否为系统管理员 | N | 固定为 `true`，暂不支持 `false`；若未传则默认填充为 `true` | 必须为 `true` |

**HTTP BODY参数示例**

```json
{
    "user_name": "user_demo",
    "password": "password@baidu.com",
    "is_admin": true
}
```

**执行逻辑**

1. 校验参数合法性。
2. 创建用户记录，`is_admin` 固定为 `true`（System 权限），暂不支持其他 Scope。
3. 返回成功状态（Data 为 null）。

**返回数据（Data内容）**

无

### 2.2 删除用户

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 删除用户 | - |
| 端点 | /auth/users/{user_name} | - |
| 版本 | v1 | - |
| method | DELETE | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 待删除的用户名 | Y | - | 必填；类型为 [UserName](00-common.md#12-用户名username)；对应用户必须存在 |

**执行逻辑**

1. 根据 `user_name` 查找用户。
2. 删除用户记录。
3. 返回成功状态（Data 为 null）。

**返回数据（Data内容）**

无


### 2.3 重置用户密码

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 重置用户密码 | - |
| 端点 | /auth/users/{user_name}/passwd | - |
| 版本 | v1 | - |
| method | PATCH | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 待修改密码的用户名 | Y | - | 必填；类型为 [UserName](00-common.md#12-用户名username)；对应用户必须存在 |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| old_password | string | 旧的用户密码 | N | 当被修改的用户为当前登录用户，需要填入旧密码 | 修改当前登录用户密码时必填，且必须与当前密码一致 |
| password | string | 用户新密码 | Y | - | 必填；类型为 [Password](00-common.md#13-用户密码password)；不能等于 `user_name` 或其逆序 |

**HTTP BODY参数示例**

```json
{
    "old_password": "manager2123@$",
    "password": "manager2123@$"
}
```

**执行逻辑**

1. 校验参数合法性
2. 校验用户存在性
3. 若修改当前登录用户密码，校验 `old_password` 正确性
4. 更新用户密码
5. 返回成功状态（Data 为 null）

**返回数据（Data内容）**

无

### 2.4 获取用户列表

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查看用户列表 | - |
| 端点 | /auth/users | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数（Query）**

无

**返回数据（Data内容）**

Data为数组，每个元素为一个用户。

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| user_name | string | 用户名 | - |
| is_admin | bool | 是否为系统管理员 | 固定返回 `true`，暂不支持 `false` |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": [
        {
            "user_name": "user_demo",
            "is_admin": true
        }
    ]
}
```

### 2.5 设置用户是否具有管理员权限

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 设置用户是否有管理员权限 | - |
| 端点 | /auth/users/{user_name}/is_admin | - |
| 版本 | v1 | - |
| method | PATCH | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 待修改权限的用户的用户名 | Y | - | 必填；长度≥1；对应用户必须存在 |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| is_admin | bool | 是否为系统管理员 | Y | 固定为 `true`，暂不支持设置为 `false` | 必须为 `true` |

**HTTP BODY参数示例**

```json
{
    "is_admin": true
}
```

**执行逻辑**

1. 校验参数合法性
2. 根据 `user_name` 查找用户
3. 更新用户 `is_admin` 字段，固定为 `true`（System 权限），暂不支持其他 Scope
4. 返回成功状态（Data 为 null）

**返回数据（Data内容）**

无

### 2.6 使用账号名密码创建session key

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 使用账号密码得到session key（可用来登录） | - |
| 端点 | /auth/session-keys | - |
| 版本 | v1 | - |
| method | POST | - |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 用户名 | Y | - | 必填；长度≥1；对应用户必须存在 |
| password | string | 用户密码 | Y | - | 必填；长度≥1；必须与用户当前密码一致 |

**HTTP BODY参数示例**

```json
{
    "user_name": "manager2",
    "password": "manager2123@$"
}
```

**执行逻辑**

1. 校验用户名与密码正确性
2. 生成 session key
3. 返回 session key、用户名及管理员标识

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| session_key | string | 会话密钥 | 在后续请求中需要在Header中带上该值，格式为 "Authorization: Session iMQW0z5ZwK_6FnPPT7Xj" |
| user_name | string | 用户名 | - |
| is_admin | bool | 是否是系统管理员 | 固定返回 `true`（暂不支持非管理员用户） |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "user_name": "user_demo",
        "session_key": "iMQW0z5ZwK_6FnPPT7Xj",
        "is_admin": true
    }
}
```

### 2.7 删除 session key

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 删除 session key | - |
| 端点 | /auth/session-keys/{session_key} | - |
| 版本 | v1 | - |
| method | DELETE | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| session_key | string | 待删除的session key | Y | - | 必填；长度≥1；对应session key必须存在 |

**执行逻辑**

1. 根据 `session_key` 查找会话
2. 删除 session key 记录
3. 返回成功状态（Data 为 null）

**返回数据（Data内容）**

无

### 2.8 创建Token

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 创建Token | - |
| 端点 | /auth/tokens | - |
| 版本 | v1 | - |
| method | POST | - |

**输入参数（Body）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| name | string | token名字 | Y | name必须全局唯一 | 必填；类型为 [TokenName](00-common.md#14-token-名称tokenname) |
| scope | string | scope | Y | 只能指定一个scope；取值 `System` / `Support` | 必填；枚举值：`System`、`Support` |

**HTTP BODY参数示例**

```json
{
    "name": "token_demo",
    "scope": "System"
}
```

**执行逻辑**

1. 校验参数合法性
2. 校验 `name` 全局唯一性
3. 生成 Token 值
4. 返回 Token 值

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| token | string | Token值 | 在后续请求中需要在Header中带上该值，格式为 "Authorization: Token Px2szn6R1HQo-WRSIJyt" |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "token": "Px2szn6R1HQo-WRSIJyt"
    }
}
```

### 2.9 删除Token

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 删除token | - |
| 端点 | /auth/tokens/{token_name} | - |
| 版本 | v1 | - |
| method | DELETE | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| token_name | string | 待删除的token name | Y | - | 必填；类型为 [TokenName](00-common.md#14-token-名称tokenname)；对应Token必须存在 |

**执行逻辑**

1. 根据 `token_name` 查找 Token
2. 删除 Token 记录
3. 返回成功状态（Data 为 null）

**返回数据（Data内容）**

无

### 2.10 查看Token详情

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查看Token详情 | - |
| 端点 | /auth/tokens/{token_name} | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| token_name | string | token name | Y | - | 必填；类型为 [TokenName](00-common.md#14-token-名称tokenname)；对应Token必须存在 |

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| name | string | token名字 | - |
| token | string | token的值 | - |
| scope | string | scope | - |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "name": "token_demo",
        "token": "Xim4h3tR_Gp7o4h",
        "scope": "System"
    }
}
```

### 2.11 查看Token列表

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查看Token列表 | - |
| 端点 | /auth/tokens | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数（Query）**

无

**返回数据（Data内容）**

Data为数组，每个元素为Token（详见“查看Token详情”）。

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": [
        {
            "name": "token_demo",
            "token": "Xim4h3tR_Gp7o4h",
            "scope": "System"
        }
    ]
}
```

### 2.12 查询单个用户

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 查询单个用户详情 | - |
| 端点 | /auth/users/{user_name} | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数（URI）**

| 参数名 | 类型 | 参数含义 | 必填 | 补充描述 | 合法性条件 |
| - | - | - | - | - | - |
| user_name | string | 用户名 | Y | - | 必填；长度≥1；对应用户必须存在 |

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| user_name | string | 用户名 | - |
| is_admin | bool | 是否为系统管理员 | 固定返回 `true` |

---

### 2.13 获取系统导航配置

**基本信息**

| 项目 | 值 | 说明 |
| - | - | - |
| 含义 | 获取系统导航/图标/Logo配置 | 无需鉴权 |
| 端点 | /meta | - |
| 版本 | v1 | - |
| method | GET | - |

**输入参数**

无。

**返回数据（Data内容）**

| 参数名 | 类型 | 参数含义 | 补充描述 |
| - | - | - | - |
| nav | object | 导航配置 | 按角色组织的导航树，key 为角色名 |
| icon | string | 图标资源路径/URL | 对应配置项 `UIIcon` |
| logo | string | Logo 资源路径/URL | 对应配置项 `UILogo` |

**成功返回示例**

```json
{
    "ErrNum": 200,
    "ErrMsg": "success",
    "Data": {
        "nav": {
            "admin": [
                {"name": "clusters", "label": "集群管理"}
            ]
        },
        "icon": "/static/icon.png",
        "logo": "/static/logo.png"
    }
}
```

---
