# 请求body相关条件原语

## req_body_json_in(json_path, value_list, case_insensitive)

* 含义： 在json格式的请求body中，查找json_path指定的字段，判断其值是否精确匹配value_list之一
* 参数  

| 参数     | 描述                   |
| -------- | ---------------------- |
| json_path | String<br>请求body中的json字段的路径 |
| value_list | String<br>value列表，多个之间使用‘&#124;’连接 |  
| case_insensitive | Boolean<br>是否忽略大小写 |

* 示例

```go
req_body_json_in("model", "deepseek-r1|qwen-plus", true)
```

## req_body_json_prefix_in(json_path, value_prefix_list, case_insensitive)

* 含义： 在json格式的请求body中，查找json_path指定的字段，判断其字符串值是否以value_prefix_list中某一项为前缀
* 参数

| 参数     | 描述                   |
| -------- | ---------------------- |
| json_path | String<br>请求body中的json字段的路径 |
| value_prefix_list | String<br>前缀列表，多个之间使用‘&#124;’连接 |
| case_insensitive | Boolean<br>是否忽略大小写 |

* 示例

```go
// 命中所有 OpenRouter 模型
req_body_json_prefix_in("model", "openrouter/", false)

// 命中 OpenRouter 下 anthropic 子命名空间的所有模型
req_body_json_prefix_in("model", "openrouter/anthropic/", false)

// 命中所有 gpt- 或 claude- 开头的模型（大小写不敏感）
req_body_json_prefix_in("model", "gpt-|claude-", true)
```

## req_body_larger_than(size)

* 含义： 判断请求头 `Content-Length` 的值是否严格大于 `size`（单位：字节）
* 参数

| 参数     | 描述                   |
| -------- | ---------------------- |
| size | Integer<br>字节数阈值 |

* 说明
  * 数据来源于 HTTP 请求头 `Content-Length`，反映的是整个 HTTP body 的字节数，不是纯 prompt 文本长度；
  * 若请求没有 `Content-Length` 头（如 chunked 请求），该原语返回 `false`；
  * 配置阈值时建议通过实际请求采样校准，预留 JSON 结构本身的固定开销。

* 示例

```go
// 请求体大于 8KB 时命中
req_body_larger_than(8192)
```

## req_body_less_than(size)

* 含义： 判断请求头 `Content-Length` 的值是否严格小于 `size`（单位：字节）
* 参数

| 参数     | 描述                   |
| -------- | ---------------------- |
| size | Integer<br>字节数阈值 |

* 说明
  * 数据来源于 HTTP 请求头 `Content-Length`，反映的是整个 HTTP body 的字节数，不是纯 prompt 文本长度；
  * 若请求没有 `Content-Length` 头（如 chunked 请求），该原语返回 `false`；
  * 配置阈值时建议通过实际请求采样校准，预留 JSON 结构本身的固定开销。

* 示例

```go
// 请求体小于 2KB 时命中
req_body_less_than(2048)
```
