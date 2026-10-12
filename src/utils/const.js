/**
* Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http: //www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
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
// quota_plans.quota is DECIMAL(18,8): 10 integer digits + 8 fractional digits.
// total_token is stored as integer, so the max that can persist is 9,999,999,999.
export const TOKEN_QUOTA_MAX = 9999999999;
// RMB cap aligned with Redis Lua IEEE-754 integer precision (see OpenAPI QuotaPlan).
export const RMB_QUOTA_MAX = 90000000;

/**
* 检查集群名称是否符合规范
* @param {string} value - 需要检查的集群名称
* @returns {boolean} - 返回检查结果，true表示符合规范，false表示不符合规范
*/
export function ClustersNameRegCheck(value) {
  // ClusterName: 1-64 chars; letters, digits, _, -, .; cannot start/end with ., -, _; no whitespace
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return false;
  }
  const reg = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/;
  return reg.test(trimmed);
}

/**
* 检查 K8s 池名称是否符合规范
* @param {string} value - 需要检查的 K8s 池名称
* @returns {boolean} - 返回检查结果，true表示符合规范，false表示不符合规范
*/
export function K8sPoolNameRegCheck(value) {
  // K8sPoolName: 1-64 chars; letters, digits, _, -, .; cannot start/end with ., -, _; no whitespace
  if (!value || typeof value !== 'string') {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  if (value.length < 1 || value.length > 64) {
    return false;
  }
  return /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/.test(value);
}

export function ProviderNameRegCheck(value) {
  // ProviderName: 1-64 chars; letters, digits, _, -, .; cannot start/end with ., -, _; no whitespace
  if (!value || typeof value !== 'string') {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  if (value.length < 1 || value.length > 64) {
    return false;
  }
  return /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/.test(value);
}

export function EntityNameRegCheck(value) {
  // EntityName: 1-64 chars; lowercase letters, digits, _, -, @ (user@project);
  // cannot start/end with _, -, or @
  if (!value || typeof value !== 'string') {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  if (value.length < 1 || value.length > 64) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9_@-]{0,62}[a-z0-9])?$/.test(value);
}

export function RateLimitRuleNameRegCheck(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 1 || trimmed.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

export function BaseClustersNameRegCheck(value) {
  const reg = /^.+$/;
  return reg.test(value);
}
/**
 * 检查变量名是否符合JavaScript命名规范
 * @param {string} value - 需要检查的变量名
 * @returns {boolean} - 如果变量名符合规范返回true，否则返回false
 */
export function VarNameRegCheck(value) {
  // Define regex for variable name validation
  // ^[_A-Za-z] - must start with underscore or letter
  // [_A-Za-z0-9]* - followed by any number of underscores, letters or digits
  const reg = /^[_A-Za-z][_A-Za-z0-9]*$/;
  // Test input with regex and return result
  return reg.test(value);
}
/**
 * 检查重命名规则的正则表达式验证函数
 * @param {string} value - 需要验证的字符串值
 * @returns {boolean} 返回验证结果，true表示符合规则，false表示不符合规则
 */
export function RedirectNameRegCheck(value) {
  // Define regex: start with letter/digit, contain letters/digits/underscores/hyphens, length 2-50
  const reg = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}$/;
  // Test input with regex and return result
  return reg.test(value);
}

export function AreaNameRegCheck(value) {
  const reg = /^[a-zA-Z0-9\_-]*$/g;
  return reg.test(value);
}

export function DominNameRegCheck(value) {
  const reg = /^[a-zA-Z0-9\._-]*$/g;
  return reg.test(value);
}

export function HealthRegCheck(value) {
  const reg =
    /^(?=^.{3,255}$)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/;
  return reg.test(value);
}

export function ClustersNameTwoRegCheck(value) {
  const reg = /^[A-Za-z0-9][A-Za-z0-9-._]{1,255}$/;
  return reg.test(value);
}

export function PatternIPRegCheck(value) {
  const reg = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)($|(?!\.$)\.)){4}$/;
  return reg.test(value);
}

export function ClusterNameRegCheck(value) {
  const reg = /^[0-9a-zA-Z_-]{1,}$/;
  return reg.test(value);
}

export function ClusterNameTwoRegCheck(value) {
  const reg = /^[0-9a-zA-Z#+_-]{1,}$/;
  return reg.test(value);
}

export function ClusterNameThreeRegCheck(value) {
  const reg = /^[0-9]{1,}$/;
  return reg.test(value);
}

export function ClusterNameFourRegCheck(value) {
  const reg = /^[2-5]{1,}$/;
  return reg.test(value);
}

export function MailRegCheck(value) {
  const reg =
    /^((([a-zA-Z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6}\;))*(([a-zA-Z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})))$/;
  return reg.test(value);
}

export function ProductNameRegCheck(value) {
  const reg = /^[0-9a-zA-Z_]{1,}$/;
  return reg.test(value);
}

export function PhoneRegCheck(value) {
  const reg = /[a-zA-Z0-9\_\-\.\#][a-zA-Z0-9\_\-\.\#\;]*/;
  return reg.test(value);
}

export function currentLimitNameRegCheck(value) {
  const reg = /[_a-zA-Z0-9]+/;
  return reg.test(value);
}

export function VIpRegCheck(value) {
  const reg =
    /^((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}$/;
  return reg.test(value);
}

export function UserNameRegCheck(value) {
  // UserName: 1-64 chars; letters, digits, _, -, .; cannot start/end with ., -, _; no whitespace; reserved names not allowed
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return false;
  }
  const reserved = ['admin', 'root', 'system'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return false;
  }
  const reg = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/;
  return reg.test(trimmed);
}

export function TokenNameRegCheck(value) {
  // TokenName: 1-64 chars; letters, digits, _, -, .; cannot start/end with ., -, _; no whitespace; reserved names not allowed
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return false;
  }
  const reserved = ['admin', 'system', 'default'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return false;
  }
  const reg = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/;
  return reg.test(trimmed);
}

export function PasswordRegCheck(value, userName) {
  // Password: 8-72 bytes (UTF-8, bcrypt upper bound); no whitespace; cannot equal userName or its reverse
  if (!value || typeof value !== 'string') {
    return false;
  }
  const byteLength = new TextEncoder().encode(value).length;
  if (byteLength < 8 || byteLength > 72) {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  if (userName) {
    const lowerValue = value.toLowerCase();
    const lowerName = String(userName).toLowerCase();
    if (lowerValue === lowerName || lowerValue === lowerName.split('').reverse().join('')) {
      return false;
    }
  }
  return true;
}

export function isHostname(value) {
  // Hostname: RFC 1123 label or valid IPv4/IPv6; total length 2-255; each label 1-63; labels cannot start/end with '-'
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 255) {
    return false;
  }
  // Allow valid IPv4/IPv6 addresses as hostnames
  if (isIpv4Address(trimmed) || expandIpv6(trimmed) !== null) {
    return true;
  }
  const labels = trimmed.split('.');
  const labelReg = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return labels.every(label => labelReg.test(label));
}

export function NumRegCheck(value) {
  const reg = /^(\d*)$/;
  return reg.test(value);
}
/**
 * 检查输入值是否只包含数字
 * @param {any} value - 需要检查的输入值
 * @returns {boolean} 如果输入值只包含数字则返回true，否则返回false
 */
export function NumTwoRegCheck(value) {
  // Define regex to match one or more digits
  const reg = /^\d+$/;
  // Test input with regex and return result
  return reg.test(value);
}

export function NumThreeRegCheck(value) {
  const reg = /^[0-9]*$/;
  return reg.test(value);
}
/**
 * 检查证书名称是否不符合 API 命名规范
 * @param {string} value - 需要检查的证书名称
 * @returns {boolean} - 不合法返回 true，合法返回 false
 */
export function CertNameRegCheck(value) {
  if (!value || value.length < 2 || value.length > 64) {
    return true;
  }
  if (/\s/.test(value)) {
    return true;
  }
  return !/^[A-Za-z0-9]([A-Za-z0-9_.-]*[A-Za-z0-9])?$/.test(value);
}

/**
 * 检查证书描述是否不符合 API 规范
 * @param {string} value - 需要检查的描述
 * @returns {boolean} - 不合法返回 true，合法返回 false
 */
export function CertDescriptionRegCheck(value) {
  if (!value || value.length < 2 || value.length > 256) {
    return true;
  }
  return /[\x00-\x1f\x7f]/.test(value);
}
/**
 * 检查输入值是否符合描述的正则表达式要求
 * @param {string} value - 需要检查的输入值
 * @returns {boolean} - 如果输入值匹配正则表达式则返回true，否则返回false
 */
export function DescriptionRegCheck(value) {
  // Requires at least 2 characters (including Chinese, letters, digits, punctuation, etc.)
  const reg = /^.{2,}$/;
  return reg.test(value);
}

export function URLCheck(value) {
  const reg =
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
  return reg.test(value);
}
// Start with letter/digit, contain letters/digits/underscores/hyphens, length > 1
export function CommonNameCheck(value) {
  const reg = /^[A-Za-z0-9][A-Za-z0-9-_]{1,}$/;
  return reg.test(value);
}
/**
 * 检查输入值是否为有效的IPv4 CIDR格式
 * @param {string} value - 需要检查的字符串值
 * @returns {boolean} 如果值是有效的IPv4 CIDR格式则返回true，否则返回false
 */
/**
 * 验证输入值是否符合IPv4 CIDR格式
 * @param {string} value - 需要验证的字符串值
 * @returns {boolean} 如果值符合IPv4 CIDR格式则返回true，否则返回false
 */
export function isIpv4Cidr(value) {
  const reg =
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
  return reg.test(value);
}

export function ipToInt(ip) {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

export function intToIp(int) {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join('.');
}

export function cidrToNetwork(cidr) {
  const [ip, prefix] = cidr.split('/');
  const mask = (0xffffffff << (32 - parseInt(prefix, 10))) >>> 0;
  return intToIp((ipToInt(ip) & mask) >>> 0);
}

export function cidrToMask(cidr) {
  const prefix = parseInt(cidr.split('/')[1], 10);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

export function isIpv4Address(value) {
  const reg =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return reg.test(value);
}

function parseIpv6Part(part) {
  if (part === '') {
    return null;
  }
  if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
    return null;
  }
  return part.toLowerCase().padStart(4, '0');
}

export function expandIpv6(ip) {
  if (!ip || typeof ip !== 'string') {
    return null;
  }

  let normalizedIp = ip;
  const ipv4TailMatch = normalizedIp.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4TailMatch) {
    const ipv4 = ipv4TailMatch[2];
    if (!isIpv4Address(ipv4)) {
      return null;
    }
    const octets = ipv4.split('.').map((octet) => parseInt(octet, 10));
    const hexTail =
      octets[0].toString(16).padStart(2, '0') +
      octets[1].toString(16).padStart(2, '0') +
      ':' +
      octets[2].toString(16).padStart(2, '0') +
      octets[3].toString(16).padStart(2, '0');
    normalizedIp = `${ipv4TailMatch[1]}${hexTail}`;
  }

  let parts;
  if (normalizedIp.includes('::')) {
    if (normalizedIp.indexOf('::') !== normalizedIp.lastIndexOf('::')) {
      return null;
    }
    const [head, tail] = normalizedIp.split('::');
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail ? tail.split(':').filter(Boolean) : [];
    if (headParts.length + tailParts.length >= 8) {
      return null;
    }
    parts = headParts.concat(Array(8 - headParts.length - tailParts.length).fill('0'), tailParts);
  } else {
    parts = normalizedIp.split(':');
    if (parts.length !== 8) {
      return null;
    }
  }

  const expanded = parts.map(parseIpv6Part);
  if (expanded.some((part) => part === null)) {
    return null;
  }
  return expanded;
}

function ipv6ToBigInt(ip) {
  const parts = expandIpv6(ip);
  if (!parts) {
    return null;
  }
  return parts.reduce((acc, part) => (acc << 16n) + BigInt(parseInt(part, 16)), 0n);
}

function cidrToNetworkIpv6(cidr) {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const ipInt = ipv6ToBigInt(ip);
  if (ipInt === null) {
    return null;
  }
  if (prefix === 0) {
    return 0n;
  }
  const mask = ((1n << 128n) - 1n) << BigInt(128 - prefix);
  return ipInt & mask;
}

export function getCidrIpVersion(cidr) {
  if (isIpv4Cidr(cidr)) {
    return 'ipv4';
  }
  if (isIpv6Cidr(cidr)) {
    return 'ipv6';
  }
  return null;
}

export function isCidr(value) {
  return getCidrIpVersion(value) !== null;
}

export function isCidrEqual(cidr1, cidr2) {
  const version1 = getCidrIpVersion(cidr1);
  const version2 = getCidrIpVersion(cidr2);
  if (!version1 || version1 !== version2) {
    return false;
  }

  if (version1 === 'ipv4') {
    return (
      cidrToNetwork(cidr1) === cidrToNetwork(cidr2) &&
      cidr1.split('/')[1] === cidr2.split('/')[1]
    );
  }

  return (
    cidrToNetworkIpv6(cidr1) === cidrToNetworkIpv6(cidr2) &&
    cidr1.split('/')[1] === cidr2.split('/')[1]
  );
}

export function isCidrContained(cidr1, cidr2) {
  const version1 = getCidrIpVersion(cidr1);
  const version2 = getCidrIpVersion(cidr2);
  if (!version1 || version1 !== version2) {
    return false;
  }

  const prefix1 = parseInt(cidr1.split('/')[1], 10);
  const prefix2 = parseInt(cidr2.split('/')[1], 10);
  if (prefix1 < prefix2) {
    return false;
  }

  if (version1 === 'ipv4') {
    const network1 = ipToInt(cidrToNetwork(cidr1));
    const network2 = ipToInt(cidrToNetwork(cidr2));
    const mask2 = (0xffffffff << (32 - prefix2)) >>> 0;
    return ((network1 & mask2) >>> 0) === network2;
  }

  const network1 = cidrToNetworkIpv6(cidr1);
  const network2 = cidrToNetworkIpv6(cidr2);
  const mask2 = prefix2 === 0 ? 0n : ((1n << 128n) - 1n) << BigInt(128 - prefix2);
  return (network1 & mask2) === network2;
}

export function isIpv6Cidr(value) {
  if (typeof value !== 'string' || !value.includes('/')) {
    return false;
  }
  const slashIndex = value.lastIndexOf('/');
  const ip = value.slice(0, slashIndex);
  const prefixStr = value.slice(slashIndex + 1);
  if (!/^\d+$/.test(prefixStr)) {
    return false;
  }
  const prefix = parseInt(prefixStr, 10);
  if (prefix < 0 || prefix > 128) {
    return false;
  }
  return expandIpv6(ip) !== null;
}

export function maskSecretKey(keyValue) {
  const key = String(keyValue || '').trim();
  if (!key) {
    return '';
  }
  if (key.length <= 12) {
    return '****';
  }
  return `${key.substring(0, 8)}****${key.substring(key.length - 4)}`;
}
