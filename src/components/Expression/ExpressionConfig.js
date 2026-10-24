/**
 * Copyright (c) 2021 The BFE Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { i18n } from '@/utils/i18n';
export const controller = (conditionVars) => [
  {
    id: 'logical',
    name: i18n.t('route.logicalConnector'),
    buttons: [
      {
        name: '(',
        expression: '(',
      },
      {
        name: ')',
        expression: ')',
      },
      {
        name: '&&',
        expression: '&&',
      },
      {
        name: '||',
        expression: '||',
      },
      {
        name: '!',
        expression: '!',
      },
    ],
  },
  {
    id: 'host',
    name: i18n.t('route.exprGroup.host'),
    buttons: [
      {
        name: 'in',
        description: 'req_host_in(host_list)',
        expression: 'req_host_in("")',
        example: '<p>req_host_in("www.baidu.com|www.tx.com")</p>',
      },
      {
        name: 'suffix_in',
        description: 'req_host_suffix_in(suffix_list)',
        expression: 'req_host_suffix_in("")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_host_suffix_in(".bfe-networks.com|.example.org")</p>`,
      },
      {
        name: 'regmatch',
        description: 'req_host_regmatch(reg_exp)',
        expression: 'req_host_regmatch("")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_host_regmatch(\`.*\\.bfe-networks\\.com\`)</p>`,
      },
      {
        name: 'tag_in',
        description: 'req_host_tag_in(tag_list)',
        expression: 'req_host_tag_in("")',
        example: '<p>req_host_tag_in("tag1|tag2")</p>',
      },
    ],
  },
  {
    id: 'port',
    name: i18n.t('route.exprGroup.port'),
    buttons: [
      {
        name: 'in',
        description: 'req_port_in(port_list)',
        expression: 'req_port_in("")',
        example: '<p>req_port_in("80|8080")</p>',
      },
    ],
  },
  {
    id: 'method',
    name: i18n.t('route.exprGroup.method'),
    buttons: [
      {
        name: 'in',
        description: 'req_method_in(method_list)',
        expression: 'req_method_in("")',
        example: '<p>req_method_in("GET")</p>',
      },
    ],
  },
  {
    id: 'path',
    name: i18n.t('route.exprGroup.path'),
    buttons: [
      {
        name: 'in',
        description: 'req_path_in(path_list, case_insensitive)',
        expression: 'req_path_in("", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_in("/post", false)</p>`,
      },
      {
        name: 'contain',
        description: 'req_path_contain(path_list, case_insensitive)',
        expression: 'req_path_contain("", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_contain("search", true)</p>`,
      },
      {
        name: 'prefix_in',
        description: 'req_path_prefix_in(prefix_list, case_insensitive)',
        expression: 'req_path_prefix_in("", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_prefix_in("/report/", true)</p>`,
      },
      {
        name: 'element_prefix_in',
        description:
          'req_path_element_prefix_in(prefix_list, case_insensitive)',
        expression: 'req_path_element_prefix_in("", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_element_prefix_in("/api/report/|/api/analytics/", false)</p>`,
      },
      {
        name: 'suffix_in',
        description: 'req_path_suffix_in(suffix_list, case_insensitive)',
        expression: 'req_path_suffix_in("", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_suffix_in("post", false)</p>`,
      },
      {
        name: 'regmatch',
        description: 'req_path_regmatch(reg_exp)',
        expression: 'req_path_regmatch("")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_path_regmatch(\`/api/.*\`)</p>`,
      },
    ],
  },
  {
    id: 'query',
    name: i18n.t('route.exprGroup.query'),
    buttons: [
      {
        name: 'exist',
        description: 'req_query_exist()',
        expression: 'req_query_exist()',
        example: '<p>req_query_exist()</p>',
      },
      {
        name: 'key_in',
        description: 'req_query_key_in(key_list)',
        expression: 'req_query_key_in("")',
        example: '<p>req_query_key_in("abc")</p>',
      },
      {
        name: 'key_prefix_in',
        description: 'req_query_key_prefix_in(prefix_list)',
        expression: 'req_query_key_prefix_in("")',
        example: '<p>req_query_key_prefix_in("sea")</p>',
      },
      {
        name: 'value_in',
        description: 'req_query_value_in(key, value_list, case_insensitive)',
        expression: 'req_query_value_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_in("search", "flower", false)</p>`,
      },
      {
        name: 'value_prefix_in',
        description:
          'req_query_value_prefix_in(key, prefix_list, case_insensitive)',
        expression: 'req_query_value_prefix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_prefix_in("search", "flow", false)</p>`,
      },
      {
        name: 'value_suffix_in',
        description:
          'req_query_value_suffix_in(key, suffix_list, case_insensitive)',
        expression: 'req_query_value_suffix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_suffix_in("search", "er", false)</p>`,
      },
      {
        name: 'value_contain',
        description:
          'req_query_value_contain(key, value_list, case_insensitive)',
        expression: 'req_query_value_contain("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_contain("uid", "abc|def", true)</p>`,
      },
      {
        name: 'value_regmatch',
        description: 'req_query_value_regmatch(key, reg_exp)',
        expression: 'req_query_value_regmatch("", "")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_regmatch("uid", \`^\\d+$\`)</p>`,
      },
      {
        name: 'value_hash_in',
        description:
          'req_query_value_hash_in(key, hash_value_list, case_insensitive)',
        expression: 'req_query_value_hash_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_query_value_hash_in("search", "0-100|1000-1100|9999", false)</p>`,
      },
    ],
  },
  {
    id: 'cookie',
    name: i18n.t('route.exprGroup.cookie'),
    buttons: [
      {
        name: 'key_in',
        description: 'req_cookie_key_in(key_list)',
        expression: 'req_cookie_key_in("")',
        example: '<p>req_cookie_key_in("RE_SERVER_ID")</p>',
      },
      {
        name: 'value_in',
        description: 'req_cookie_value_in(key, value_list, case_insensitive)',
        expression: 'req_cookie_value_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_cookie_value_in("ssp-web-version", "v0", true)</p>`,
      },
      {
        name: 'value_prefix_in',
        description:
          'req_cookie_value_prefix_in(key, prefix_list, case_insensitive)',
        expression: 'req_cookie_value_prefix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_cookie_value_prefix_in("deviceid", "x", true)</p>`,
      },
      {
        name: 'value_suffix_in',
        description:
          'req_cookie_value_suffix_in(key, suffix_list, case_insensitive)',
        expression: 'req_cookie_value_suffix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_cookie_value_suffix_in("deviceid", "1", true)</p>`,
      },
      {
        name: 'value_contain',
        description:
          'req_cookie_value_contain(key, value_list, case_insensitive)',
        expression: 'req_cookie_value_contain("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_cookie_value_contain("deviceid", "test", true)</p>`,
      },
      {
        name: 'value_hash_in',
        description:
          'req_cookie_value_hash_in(key, hash_value_list, case_insensitive)',
        expression: 'req_cookie_value_hash_in("", "", false)',
        example: `${i18n.t('route.tipExpression')}<br/>\
                <p>req_cookie_value_hash_in("RE_SERVER_ID", "0-100|1000-1100|9999", false)</p>`,
      },
    ],
  },
  {
    id: 'header',
    name: i18n.t('route.exprGroup.header'),
    buttons: [
      {
        name: 'key_in',
        description: 'req_header_key_in(key_list)',
        expression: 'req_header_key_in("")',
        example: '<p>req_header_key_in("Header-Preonline")</p>',
      },
      {
        name: 'value_in',
        description:
          'req_header_value_in(header_name, value_list, case_insensitive)',
        expression: 'req_header_value_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_header_value_in("game-bfe-dev", "1", true)</p>`,
      },
      {
        name: 'value_prefix_in',
        description:
          'req_header_value_prefix_in(header_name, prefix_list, case_insensitive)',
        expression: 'req_header_value_prefix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_header_value_prefix_in("Referer", "https://example.org", true)</p>`,
      },
      {
        name: 'value_suffix_in',
        description:
          'req_header_value_suffix_in(header_name, suffix_list, case_insensitive)',
        expression: 'req_header_value_suffix_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_header_value_suffix_in("User-Agent", "2.0.4", true)</p>`,
      },
      {
        name: 'value_contain',
        description:
          'req_header_value_contain(header_name, value_list, case_insensitive)',
        expression: 'req_header_value_contain("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_header_value_contain("User-Agent", "Firefox|Chrome", true)</p>`,
      },
      {
        name: 'value_regmatch',
        description: 'req_header_value_regmatch(header_name, reg_exp)',
        expression: 'req_header_value_regmatch("", "")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_header_value_regmatch("User-Agent", \`Chrome/\\d+\`)</p>`,
      },
      {
        name: 'value_hash_in',
        description:
          'req_header_value_hash_in(header_name, hash_value_list, case_insensitive)',
        expression: 'req_header_value_hash_in("", "", false)',
        example: `${i18n.t('route.tipExpression')}<br/>\
                <p>req_header_value_hash_in("RE_SERVER_ID", "0-100|1000-1100|9999", false)</p>`,
      },
      {
        name: 'ua_regmatch',
        description: 'req_ua_regmatch(reg_exp)',
        expression: 'req_ua_regmatch("")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_ua_regmatch(\`.*Bot.*\`)</p>`,
      },
    ],
  },
  {
    id: 'cip',
    name: i18n.t('route.exprGroup.cip'),
    buttons: [
      {
        name: 'range',
        description: 'req_cip_range(start_ip, end_ip)',
        expression: 'req_cip_range("", "")',
        example: '<p>req_cip_range("1.1.1.1", "2.2.2.2")</p>',
      },
      {
        name: 'trusted',
        description: 'req_cip_trusted()',
        expression: 'req_cip_trusted()',
        example: '<p>req_cip_trusted()</p>',
      },
      {
        name: 'hash_in',
        description: 'req_cip_hash_in(value_list)',
        expression: 'req_cip_hash_in("")',
        example: '<p>req_cip_hash_in("0-100|1000-1100|9999")</p>',
      },
    ],
  },
  {
    id: 'vip',
    name: i18n.t('route.exprGroup.vip'),
    buttons: [
      {
        name: 'in',
        description: 'req_vip_in(vip_list)',
        expression: 'req_vip_in("")',
        example: '<p>req_vip_in("10.0.0.1|10.0.0.2")</p>',
      },
      {
        name: 'range',
        description: 'req_vip_range(start_ip, end_ip)',
        expression: 'req_vip_range("", "")',
        example: '<p>req_vip_range("10.0.0.1", "10.0.0.10")</p>',
      },
    ],
  },
  {
    id: 'proto',
    name: i18n.t('route.exprGroup.proto'),
    buttons: [
      {
        name: 'match',
        description: 'req_proto_match(proto)',
        expression: 'req_proto_match("")',
        example: '<p>req_proto_match("https|h2")</p>',
      },
      {
        name: 'secure',
        description: 'req_proto_secure()',
        expression: 'req_proto_secure()',
        example: '<p>req_proto_secure()</p>',
      },
    ],
  },
  {
    id: 'context',
    name: i18n.t('route.exprGroup.context'),
    buttons: [
      {
        name: 'value_in',
        description: 'req_context_value_in(key, value_list, case_insensitive)',
        expression: 'req_context_value_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_context_value_in("cmd", "add|del|list", true)</p>`,
      },
    ],
  },
  {
    id: 'tag',
    name: i18n.t('route.exprGroup.tag'),
    buttons: [
      {
        name: 'match',
        description: 'req_tag_match(tagName, tagValue)',
        expression: 'req_tag_match("", "")',
        example: '<p>req_tag_match("clientIP", "blocklist")</p>',
      },
    ],
  },
  {
    id: 'url',
    name: i18n.t('route.exprGroup.url'),
    buttons: [
      {
        name: 'regmatch',
        description: 'req_url_regmatch(reg_exp)',
        expression: 'req_url_regmatch("")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_url_regmatch(\`/s\\?word=123\`)</p>`,
      },
    ],
  },
  {
    id: 'intent',
    name: i18n.t('route.exprGroup.intent'),
    buttons: [
      {
        name: 'in',
        description:
          'req_ai_intent_in(question_name, value_list, min_confidence)',
        expression: 'req_ai_intent_in("", "")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>req_ai_intent_in("task_type", "test_writing|doc_writing", 0.9)</p>`,
      },
    ],
  },
  {
    id: 'body',
    name: i18n.t('route.exprGroup.body'),
    buttons: [
      {
        name: 'req_body_json_in',
        description: 'req_body_json_in(json_path, value_list, case_insensitive)',
        expression: 'req_body_json_in("","",false)',
        example:
          '<p>req_body_json_in("level1.level2.level3", "pat1|pat2|pat3", false)</p>',
      },
      {
        name: 'req_body_json_prefix_in',
        description:
          'req_body_json_prefix_in(json_path, value_prefix_list, case_insensitive)',
        expression: 'req_body_json_prefix_in("","",false)',
        example:
          '<p>req_body_json_prefix_in("model", "openrouter/", false)</p>',
      },
      {
        name: 'req_body_larger_than',
        description: 'req_body_larger_than(size)',
        expression: 'req_body_larger_than(8192)',
        example:
          '<p>req_body_larger_than(8192)</p><p>基于 Content-Length，单位字节；无 Content-Length 时不匹配</p>',
      },
      {
        name: 'req_body_less_than',
        description: 'req_body_less_than(size)',
        expression: 'req_body_less_than(2048)',
        example:
          '<p>req_body_less_than(2048)</p><p>基于 Content-Length，单位字节；无 Content-Length 时不匹配</p>',
      },
    ],
  },
  {
    id: 'response',
    name: i18n.t('route.exprGroup.response'),
    buttons: [
      {
        name: 'code',
        description: 'res_code_in(codes)',
        expression: 'res_code_in("")',
        example: '<p>res_code_in("200|500")</p>',
      },
      {
        name: 'header_key_in',
        description: 'res_header_key_in(key_list)',
        expression: 'res_header_key_in("")',
        example: '<p>res_header_key_in("X-Bfe-Debug")</p>',
      },
      {
        name: 'header_value_in',
        description: 'res_header_value_in(key, value_list, case_insensitive)',
        expression: 'res_header_value_in("", "", false)',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>res_header_value_in("X-Bfe-Debug", "1", true)</p>`,
      },
    ],
  },
  {
    id: 'session',
    name: i18n.t('route.exprGroup.session'),
    buttons: [
      {
        name: 'sip_range',
        description: 'ses_sip_range(start_ip, end_ip)',
        expression: 'ses_sip_range("", "")',
        example: '<p>ses_sip_range("10.0.0.1", "10.0.0.10")</p>',
      },
      {
        name: 'vip_range',
        description: 'ses_vip_range(start_ip, end_ip)',
        expression: 'ses_vip_range("", "")',
        example: '<p>ses_vip_range("10.0.0.1", "10.0.0.10")</p>',
      },
      {
        name: 'tls_sni_in',
        description: 'ses_tls_sni_in(host_list)',
        expression: 'ses_tls_sni_in("")',
        example: '<p>ses_tls_sni_in("example.com|example.org")</p>',
      },
      {
        name: 'tls_client_auth',
        description: 'ses_tls_client_auth()',
        expression: 'ses_tls_client_auth()',
        example: '<p>ses_tls_client_auth()</p>',
      },
      {
        name: 'tls_client_ca_in',
        description: 'ses_tls_client_ca_in(ca_list)',
        expression: 'ses_tls_client_ca_in("")',
        example: '<p>ses_tls_client_ca_in("ca1|ca2")</p>',
      },
    ],
  },
  {
    id: 'system',
    name: i18n.t('route.exprGroup.system'),
    buttons: [
      {
        name: 'bfe_time_range',
        description: 'bfe_time_range(start_time, end_time)',
        expression: 'bfe_time_range("", "")',
        example: '<p>bfe_time_range("20190204203000H", "20190204204500H")</p>',
      },
      {
        name: 'bfe_periodic_time_range',
        description: 'bfe_periodic_time_range(start_time, end_time, period)',
        expression: 'bfe_periodic_time_range("", "", "")',
        example: '<p>bfe_periodic_time_range("203000H", "204500H", "")</p>',
      },
      {
        name: 'time_weekday_in',
        description: 'time_weekday_in(weekday_list, zone)',
        expression: 'time_weekday_in("", "H")',
        example: `${i18n.t(
          'route.tipExpression',
        )}<br/><br/><p>time_weekday_in("0|6", "H")</p><p>time_weekday_in("1|2|3|4|5", "H")</p>`,
      },
    ],
  },
  {
    id: 'vars',
    name: i18n.t('route.exprGroup.conditionVars'),
    buttons: conditionVars,
  },
];
export const connController = [
  {
    name: 'default_t',
    buttons: [
      {
        name: 'default_t',
        description: 'default_t()',
        expression: 'default_t()',
        example: '<p>default_t()</p>',
      },
    ],
  },
  {
    name: i18n.t('route.logicalConnector'),
    buttons: [
      {
        name: '(',
        expression: '(',
      },
      {
        name: ')',
        expression: ')',
      },
      {
        name: '&&',
        expression: '&&',
      },
      {
        name: '||',
        expression: '||',
      },
      {
        name: '!',
        expression: '!',
      },
    ],
  },
];
