/*
 * 离线手册站点自检脚本（零依赖）
 * 用法：node docs/scripts/verify-manual-site.js
 *
 * 校验内容：
 *  1) 页面内所有内部 href（`#id` 与 `xxx.html#id`）目标文件存在、目标 id 存在
 *  2) 页面内 id 唯一
 *  3) HTML 里引用的图片（img src）在 site/images 下存在
 *  4) 每页 DOM 概要：<title> 与正文 H1 是否一致、标题层级、表格 / 图片 / 代码块数量
 *  兼容 Node 12 / 18 / 20
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..', 'zh-cn', 'site');

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function countMatches(str, re) {
  let n = 0;
  let m;
  const r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
  while ((m = r.exec(str))) n++;
  return n;
}

function collect(html, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
  while ((m = r.exec(html))) out.push(m[1]);
  return out;
}

function main() {
  if (!fs.existsSync(SITE)) {
    console.error('站点目录不存在: ' + SITE + '（请先运行 build-manual-site.js）');
    process.exit(1);
  }

  const files = fs
    .readdirSync(SITE)
    .filter(function (f) {
      return /\.html$/i.test(f);
    })
    .sort();

  const problems = [];
  const pages = Object.create(null);
  const idMap = Object.create(null);

  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const html = fs.readFileSync(path.join(SITE, name), 'utf-8');
    pages[name] = html;

    const ids = collect(html, /\sid="([^"]+)"/g);
    const seen = Object.create(null);
    for (let k = 0; k < ids.length; k++) {
      if (seen[ids[k]]) problems.push(name + ': id 重复 -> #' + ids[k]);
      seen[ids[k]] = true;
    }
    idMap[name] = seen;
  }

  let linkCount = 0;
  let imgCount = 0;

  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const html = pages[name];

    // ---- 内部链接
    const hrefs = collect(html, /<a\s[^>]*href="([^"]*)"/g);
    for (let k = 0; k < hrefs.length; k++) {
      const raw = decodeEntities(hrefs[k]);
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue; // 外链 / mailto
      linkCount++;
      const hashAt = raw.indexOf('#');
      const target = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
      const anchor = hashAt >= 0 ? raw.slice(hashAt + 1) : '';
      const targetFile = target ? target.replace(/^\.\//, '') : name;
      if (targetFile.indexOf('/') >= 0) {
        problems.push(name + ': 链接指向子目录 -> ' + raw);
        continue;
      }
      if (targetFile && files.indexOf(targetFile) < 0) {
        problems.push(name + ': 链接目标文件不存在 -> ' + raw);
        continue;
      }
      if (anchor && !idMap[targetFile][anchor]) {
        problems.push(name + ': 锚点不存在 -> ' + raw + '（' + targetFile + ' 内无 id=' + anchor + '）');
      }
    }

    // ---- 图片
    const srcs = collect(html, /<img\s[^>]*src="([^"]*)"/g);
    imgCount += srcs.length;
    for (let k = 0; k < srcs.length; k++) {
      const src = decodeEntities(srcs[k]);
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(src)) continue;
      if (!fs.existsSync(path.join(SITE, src.replace(/^\.\//, '')))) {
        problems.push(name + ': 图片不存在 -> ' + src);
      }
    }
  }

  // ---- DOM 概要
  console.log('目录: ' + SITE);
  console.log('页面数: ' + files.length);
  console.log('');
  console.log(
    '页面'.padEnd(30) +
      '大小B'.padStart(8) +
      'H1'.padStart(4) +
      'H2'.padStart(4) +
      'H3'.padStart(4) +
      'H4+'.padStart(5) +
      '表格'.padStart(6) +
      '图片'.padStart(6) +
      '代码块'.padStart(7) +
      '  标题一致',
  );
  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const html = pages[name];
    const mainMatch = /<main class="content">([\s\S]*)<\/main>/.exec(html);
    const main = mainMatch ? mainMatch[1] : html;
    const sidebarHtml = /<nav class="sidebar">([\s\S]*?)<\/nav>/.exec(html);
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(html);
    const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';
    const h1s = collect(main, /<h1[^>]*>([\s\S]*?)<\/h1>/g);
    const mainH1 = h1s.length
      ? decodeEntities(h1s[h1s.length - 1].replace(/<[^>]+>/g, '')).trim()
      : '';
    const same = title === mainH1;
    if (!same) problems.push(name + ': <title> 与正文 H1 不一致 -> «' + title + '» vs «' + mainH1 + '»');
    console.log(
      name.padEnd(30) +
        String(Buffer.byteLength(html)).padStart(8) +
        String(h1s.length).padStart(4) +
        String(countMatches(main, /<h2[\s>]/g)).padStart(4) +
        String(countMatches(main, /<h3[\s>]/g)).padStart(4) +
        String(countMatches(main, /<h4[\s>]/g) + countMatches(main, /<h5[\s>]/g) + countMatches(main, /<h6[\s>]/g)).padStart(5) +
        String(countMatches(main, /<table>/g)).padStart(6) +
        String(countMatches(main, /<img\s/g)).padStart(6) +
        String(countMatches(main, /<pre>/g)).padStart(7) +
        '  ' + (same ? 'yes' : 'NO'),
    );
    if (h1s.length !== 1) {
      problems.push(name + ': 正文 H1 数量应为 1，实际 ' + h1s.length);
    }
    if (sidebarHtml && countMatches(sidebarHtml[1], /<h1[\s>]/g) !== 1) {
      problems.push(name + ': 侧边导航栏品牌标题缺失');
    }
    // 代码块与行内代码（<pre> / <code>）里的命令、示例常含 .js 文本，先剔除再检查离线零依赖；
    // 真正的 <script> 标签在正文中会被渲染为转义文本（&lt;script&gt;），剔除代码块不会漏检
    const htmlWithoutCodeBlocks = html
      .replace(/<pre[\s\S]*?<\/pre>/gi, '')
      .replace(/<code[\s\S]*?<\/code>/gi, '');
    if (/<script|<link\s|https?:\/\/[^"']*\.(?:js|css)/i.test(htmlWithoutCodeBlocks)) {
      problems.push(name + ': 存在脚本 / 外部样式引用（应保持离线零依赖）');
    }
  }

  console.log('');
  console.log('内部链接数: ' + linkCount);
  console.log('图片引用数: ' + imgCount);
  if (problems.length) {
    console.log('问题 ' + problems.length + ':');
    for (let i = 0; i < problems.length; i++) console.log('  ! ' + problems[i]);
    process.exitCode = 1;
  } else {
    console.log('问题 0');
  }
}

main();