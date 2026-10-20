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

function applyFavicon(href) {
    if (window.__BRANDING_FAVICON_URL__ === href) {
        return;
    }
    let link = document.getElementById('branding-favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'branding-favicon';
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = href;
    window.__BRANDING_FAVICON_URL__ = href;
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