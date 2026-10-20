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
import Vue from 'vue';
import { getLang } from './i18n';

const BRANDING_DIR = '/branding';
const CONFIG_URL = BRANDING_DIR + '/branding.json';
const DEFAULT_FAVICON = BRANDING_DIR + '/favicon.ico';
// 图标不存在时用它占位：显式声明「无图标」，避免浏览器回退请求 /favicon.ico
const EMPTY_FAVICON = 'data:,';
const FAVICON_STATE_KEY = '__BRANDING_FAVICON_STATE__';
const FETCH_TIMEOUT = 3000;
const DEFAULT_TITLES = {
    zh: '壬远 AI网关',
    en: 'Rainway AI Gateway'
};

export const branding = Vue.observable({
    title: '',
    titleEn: '',
    favicon: DEFAULT_FAVICON
});

export function resolveBrandingAsset(path) {
    if (!path) {
        return DEFAULT_FAVICON;
    }
    if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '/') {
        return path;
    }
    return BRANDING_DIR + '/' + path.replace(/^\.?\//, '');
}

export function getBrandingTitle(lang) {
    const isEn = (lang || getLang()) === 'en';
    if (isEn) {
        return branding.titleEn || branding.title || DEFAULT_TITLES.en;
    }
    return branding.title || branding.titleEn || DEFAULT_TITLES.zh;
}

function isExternalUrl(path) {
    return /^(https?:)?\/\//.test(path);
}

function withVersion(href) {
    return href + (href.indexOf('?') === -1 ? '?v=' : '&v=') + Date.now();
}

function ensureFaviconLink() {
    let link = document.getElementById('branding-favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'branding-favicon';
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    return link;
}

function showFavicon(href) {
    ensureFaviconLink().href = withVersion(href);
}

function hideFavicon() {
    ensureFaviconLink().href = EMPTY_FAVICON;
}

function probeAsset(href) {
    if (typeof fetch !== 'function') {
        return Promise.resolve(true);
    }
    return fetch(href, { method: 'HEAD', cache: 'no-store' })
        .then(response => {
            if (response.status === 405 || response.status === 501) {
                return fetch(href, { method: 'GET', cache: 'no-store' });
            }
            return response;
        })
        .then(response => !!(response && response.ok))
        .catch(() => false);
}

// 图标资源存在才挂载；不存在则显式声明「无图标」，不展示任何 ico
function applyFavicon(href) {
    if (!href) {
        hideFavicon();
        return;
    }
    const state = window[FAVICON_STATE_KEY];
    if (state && state.href === href) {
        return;
    }
    window[FAVICON_STATE_KEY] = { href, exists: false };

    if (isExternalUrl(href) || typeof fetch !== 'function') {
        showFavicon(href);
        window[FAVICON_STATE_KEY] = { href, exists: true };
        return;
    }

    probeAsset(withVersion(href)).then(exists => {
        if (exists) {
            showFavicon(href);
            window[FAVICON_STATE_KEY] = { href, exists: true };
        } else {
            hideFavicon();
        }
    });
}

export function applyBranding(config) {
    const data = config && typeof config === 'object' ? config : {};
    branding.title = typeof data.title === 'string' ? data.title.trim() : '';
    branding.titleEn =
        typeof data.titleEn === 'string' ? data.titleEn.trim() : '';
    branding.favicon = resolveBrandingAsset(data.favicon);
    document.title = getBrandingTitle();
    applyFavicon(branding.favicon);
    return branding;
}

function withTimeout(promise, timeout) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(null), timeout))
    ]);
}

function fetchBranding() {
    if (window.__BRANDING_CONFIG_PROMISE__) {
        return window.__BRANDING_CONFIG_PROMISE__;
    }
    if (typeof fetch !== 'function') {
        return Promise.resolve(null);
    }
    return fetch(CONFIG_URL + '?_=' + Date.now(), { cache: 'no-store' })
        .then(response => (response.ok ? response.json() : null))
        .catch(() => null);
}

let loading = null;

export function loadBranding() {
    if (!loading) {
        loading = withTimeout(fetchBranding(), FETCH_TIMEOUT)
            .then(config => applyBranding(config))
            .catch(() => applyBranding(null));
    }
    return loading;
}