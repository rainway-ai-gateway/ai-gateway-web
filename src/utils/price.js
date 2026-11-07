/**
 * Copyright(c) 2026 The Rainway AI Gateway (壬远AI网关) Authors.
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

/** 小于该绝对值用科学计数法（Excel / 工程软件常用阈值） */
export const PRICE_SCI_MIN = 1e-4;
/** 大于等于该绝对值用科学计数法 */
export const PRICE_SCI_MAX = 1e6;

export function parsePrice(raw) {
    if (raw === null || raw === undefined) return NaN;
    const text = String(raw).trim();
    if (text === '') return NaN;
    return Number(text);
}

export function isPriceOverflow(value) {
    const num = typeof value === 'number' ? value : parsePrice(value);
    if (!Number.isFinite(num)) return false;
    return Math.abs(num * 1e8) >= Math.pow(2, 53);
}

function formatScientific(num) {
    return num
        .toExponential()
        .replace(/(\.\d*?)0+([eE])/g, '$1$2')
        .replace(/\.([eE])/g, '$1');
}

function formatDecimal(num) {
    return num.toLocaleString('en-US', {
        useGrouping: false,
        maximumSignificantDigits: 15
    });
}

function formatPriceNumber(num) {
    if (num === 0) return '0';
    const abs = Math.abs(num);
    if (abs < PRICE_SCI_MIN || abs >= PRICE_SCI_MAX) {
        return formatScientific(num);
    }
    return formatDecimal(num);
}

/** 详情/只读：非法值显示为 '-' */
export function formatPriceDisplay(raw) {
    if (raw === null || raw === undefined || raw === '') return '-';
    const num = typeof raw === 'number' ? raw : parsePrice(raw);
    if (!Number.isFinite(num) || num < 0) return '-';
    return formatPriceNumber(num);
}

/**
 * 输入框失焦：合法则格式化；非法或空串原样保留，交给校验提示。
 */
export function formatPriceForInput(raw) {
    if (raw === null || raw === undefined) return '';
    const text = String(raw).trim();
    if (text === '') return '';
    const num = Number(text);
    if (!Number.isFinite(num) || num < 0) return text;
    return formatPriceNumber(num);
}

/**
 * 判断价格键是否为按 token 计价。按 token 计价的键（含缓存与阈值档位，
 * 如 input_cost_per_token、cache_read_input_token_cost、
 * *_above_200k_tokens）录入与展示按「元/百万 tokens」单位换算；
 * 按次/张/秒/页等计价的键按原值输入。
 */
export function isTokenBasedPriceKey(key) {
    return typeof key === 'string' && key.indexOf('_token') !== -1;
}

/** 存储值（每 token 单价）→ 百万 token 单位的输入/展示值 */
export function tokenPriceToMillion(raw) {
    const num = typeof raw === 'number' ? raw : parsePrice(raw);
    if (!Number.isFinite(num)) return NaN;
    return num * 1e6;
}

/** 百万 token 单位的输入值 → 存储值（每 token 单价） */
export function millionToTokenPrice(raw) {
    const num = typeof raw === 'number' ? raw : parsePrice(raw);
    if (!Number.isFinite(num)) return NaN;
    return num / 1e6;
}

/** 编辑回显：存储值换算为百万 token 单位输入串；非法值原样保留，交给校验提示 */
export function formatPriceForMillionInput(raw) {
    if (raw === null || raw === undefined) return '';
    const million = tokenPriceToMillion(raw);
    if (Number.isNaN(million) || million < 0) return String(raw);
    return formatPriceNumber(million);
}

/** 详情展示：存储值换算为百万 token 单位显示串；非法值显示 '-' */
export function formatPriceDisplayMillion(raw) {
    const million = tokenPriceToMillion(raw);
    if (Number.isNaN(million) || million < 0) return '-';
    return formatPriceNumber(million);
}
