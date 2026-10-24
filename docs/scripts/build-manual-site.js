/*
 * 壬远AI网关管理控制台用户手册：Markdown -> 离线 HTML 站点构建脚本（零依赖）
 * 用法：node docs/scripts/build-manual-site.js
 *
 * 说明：
 *  - 源文件只读：docs/zh-cn/*.md 与 docs/zh-cn/images/ 不会被修改
 *  - 产物：docs/zh-cn/site/（index.html + 每章 <名>.html + images/）
 *  - 兼容 Node 12 / 18 / 20：不使用可选链、空值合并、String.replaceAll、fs.rmSync
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SITE_NAME = '壬远AI网关管理控制台用户手册';
const SITE_TAGLINE = '控制台使用者手册（离线站点）';

const ROOT = path.resolve(__dirname, '..', 'zh-cn');
const SITE = path.join(ROOT, 'site');
const IMG_SRC = path.join(ROOT, 'images');
const IMG_DST = path.join(SITE, 'images');

const HOME_FILE = '00-README.md'; // 首页（渲染到 index.html）
const HOME_LABEL = '手册首页';
const HOME_OUT = 'index.html';
const EXTRA_DOCS = ['deploy.md', 'develop.md']; // 附加文档，排在导航末尾

// ---------------------------------------------------------------- 工具函数

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function unescapePipes(s) {
  return s.split('\u0000PIPE\u0000').join('|');
}

function leadingSpaces(line) {
  const m = /^[ \t]*/.exec(line);
  return m[0].replace(/\t/g, '    ').length;
}

function rmdirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (let i = 0; i < entries.length; i++) {
    const p = path.join(dir, entries[i]);
    if (fs.statSync(p).isDirectory()) rmdirRecursive(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

// GitHub 风格锚点：小写 -> 去标点（保留字母/数字/组合符/连字符/下划线）-> 每个空格各转一个连字符
// 例：`添加 / 编辑` -> `添加--编辑`（双连字符）；`4.7 步骤 5：复查&检查` -> `47-步骤-5复查检查`
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\p{Pc}\p{Pd}\u200c\u200d\s]/gu, '')
    .replace(/\s/g, '-');
}

function makeSlugger() {
  const used = Object.create(null);
  return function (text) {
    let base = slugify(text);
    if (!base) base = 'section';
    let slug = base;
    let n = 1;
    while (used[slug]) {
      slug = base + '-' + n;
      n++;
    }
    used[slug] = true;
    return slug;
  };
}

// ---------------------------------------------------------------- 行内解析

// Markdown 链接 -> HTML 链接；.md -> .html，锚点原样保留
function resolveHref(href) {
  if (!href) return href;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href; // http(s)、mailto 等
  if (href.charAt(0) === '#') return href; // 页内锚点
  const hashAt = href.indexOf('#');
  let target = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  if (!/\.md$/i.test(target)) return href;
  target = target.replace(/^\.\//, '').replace(/\.md$/i, '.html');
  target = target.replace(/^.*\//, ''); // 文档目录是平铺的，只取文件名
  return target + hash;
}

function renderInline(text, slugger) {
  const codes = [];
  let s = String(text);

  // 1) 保护行内代码，避免其中的 * _ [ ] 等被后续规则误伤
  s = s.replace(/(`+)([\s\S]*?)\1/g, function (m, ticks, code) {
    codes.push(escapeHtml(code.replace(/^ (.*) $/, '$1')));
    return '\u0000C' + (codes.length - 1) + '\u0000';
  });

  // 2) 尖括号自动链接
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, function (m, url) {
    return '[' + url + '](' + url + ')';
  });

  // 2.5) Markdown 反斜杠转义（如 \<关系\> -> <关系>），必须在 HTML 转义之前
  s = s.replace(/\\[!-\/:-@\[-\x60{-~]/g, function (m) {
    return m.charAt(1);
  });

  // 3) HTML 转义（此后不再有原始 < > &）
  s = escapeHtml(s);

  // 4) 图片
  s = s.replace(
    /!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g,
    function (m, alt, src) {
      return (
        '<img src="' +
        escapeAttr(src) +
        '" alt="' +
        escapeAttr(alt) +
        '" loading="lazy" />'
      );
    },
  );

  // 5) 链接
  s = s.replace(
    /\[([^\]]*)\]\(\s*([^\s)]*)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g,
    function (m, label, href) {
      return '<a href="' + escapeAttr(resolveHref(href)) + '">' + label + '</a>';
    },
  );

  // 6) 粗体 / 斜体 / 删除线（斜体要求两侧是空白或标点，避免误伤 CLIENT_ID_* 之类）
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(
    /(^|[\s(（、，,。：:；;])\*([^\s*][^*]*)\*(?=$|[\s)） 、，,。：:；;.!?！？])/g,
    '$1<em>$2</em>',
  );
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 7) 还原行内代码
  s = s.replace(/\u0000C(\d+)\u0000/g, function (m, i) {
    return '<code>' + codes[Number(i)] + '</code>';
  });

  return unescapePipes(s);
}

// ---------------------------------------------------------------- 表格

function splitRow(line) {
  const s = line.replace(/\\\|/g, '\u0000PIPE\u0000');
  let t = s.trim();
  if (t.charAt(0) === '|') t = t.slice(1);
  if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
  return t.split('|').map(function (c) {
    return c.trim();
  });
}

function isTableDelimiter(line) {
  const t = line.trim();
  if (t.indexOf('|') < 0) return false;
  if (t.indexOf('-') < 0) return false;
  return /^[|\s:-]+$/.test(t);
}

function renderTable(header, rows, ctx) {
  let html =
    '<table><thead><tr>' +
    header
      .map(function (c) {
        return '<th>' + renderInline(c, ctx.slugger) + '</th>';
      })
      .join('') +
    '</tr></thead><tbody>';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    html += '<tr>';
    for (let j = 0; j < header.length; j++) {
      html += '<td>' + renderInline(r[j] === undefined ? '' : r[j], ctx.slugger) + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// ---------------------------------------------------------------- 列表

const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;

function matchListItem(line) {
  const m = LIST_ITEM_RE.exec(line);
  if (!m) return null;
  const indent = m[1].replace(/\t/g, '    ').length;
  const marker = m[2];
  return {
    indent: indent,
    ordered: /^\d/.test(marker),
    start: /^\d/.test(marker) ? parseInt(marker, 10) : 1,
    content: m[3],
    contentIndent: indent + marker.length + 1,
  };
}

function renderList(lines, start, ctx) {
  const first = matchListItem(lines[start]);
  const base = first.indent;
  const ordered = first.ordered;
  const items = [];
  let i = start;

  while (i < lines.length) {
    const m = matchListItem(lines[i]);
    if (!m || m.indent !== base || m.ordered !== ordered) break;

    const item = { text: m.content, rest: [] };
    const contentIndent = m.contentIndent;
    i++;

    while (i < lines.length) {
      const line = lines[i];
      const nm = matchListItem(line);
      if (nm && nm.indent <= base) break; // 同级下一项 / 列表结束
      if (!line.trim()) {
        let j = i;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j >= lines.length) {
          i = j;
          break;
        }
        const nn = matchListItem(lines[j]);
        const nextIndent = leadingSpaces(lines[j]);
        const belongs = nn ? nn.indent > base : nextIndent > base;
        if (!belongs) break;
        item.rest.push('');
        i++;
        continue;
      }
      const ind = leadingSpaces(line);
      if (ind > base) {
        item.rest.push(line.slice(Math.min(contentIndent, ind)));
        i++;
        continue;
      }
      item.text += ' ' + line.trim(); // 懒续行
      i++;
    }
    items.push(item);
  }

  let html = '';
  let n = 1;
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const task = /^\[([ xX])\]\s*(.*)$/.exec(it.text);
    let inner;
    let cls = '';
    if (task) {
      cls = ' class="task-item"';
      inner =
        '<input type="checkbox" disabled' +
        (task[1] === ' ' ? '' : ' checked') +
        '/> ' +
        renderInline(task[2], ctx.slugger);
    } else {
      inner = renderInline(it.text, ctx.slugger);
    }
    let liHtml = '<li' + cls + '>' + inner;
    if (it.rest.length) {
      const nested = it.rest.join('\n').replace(/\s+$/, '');
      if (nested.trim()) liHtml += '\n' + renderBlocks(nested.split('\n'), ctx);
    }
    liHtml += '</li>';
    html += liHtml;
    n++;
  }

  if (ordered) {
    const attr = first.start !== 1 ? ' start="' + first.start + '"' : '';
    return { html: '<ol' + attr + '>' + html + '</ol>', next: i };
  }
  return { html: '<ul>' + html + '</ul>', next: i };
}

// ---------------------------------------------------------------- 块级解析

function renderBlocks(lines, ctx) {
  const out = [];
  let i = 0;
  let para = [];

  function flushPara() {
    if (!para.length) return;
    const text = para.join('\n');
    // 整段只有一张图时仍包在 <p> 里（与既有站点一致）
    out.push('<p>' + renderInline(text, ctx.slugger) + '</p>');
    para = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      flushPara();
      const mark = fence[1];
      const info = fence[2].trim().split(/\s+/)[0];
      const buf = [];
      i++;
      const closeRe = new RegExp('^\\s*' + mark.charAt(0) + '{' + mark.length + ',}\\s*$');
      while (i < lines.length && !closeRe.test(lines[i])) buf.push(lines[i++]);
      i++;
      const cls = info ? ' class="language-' + escapeAttr(info) + '"' : '';
      out.push('<pre><code' + cls + '>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }

    // 标题
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      flushPara();
      const lv = h[1].length;
      const raw = h[2];
      const id = ctx.slugger(raw);
      out.push(
        '<h' + lv + ' id="' + escapeAttr(id) + '">' + renderInline(raw, ctx.slugger) + '</h' + lv + '>',
      );
      i++;
      continue;
    }

    // 分隔线
    if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushPara();
      out.push('<hr/>');
      i++;
      continue;
    }

    // 引用块
    if (/^ {0,3}>/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
        buf.push(lines[i].replace(/^ {0,3}> ?/, ''));
        i++;
      }
      out.push('<blockquote>\n' + renderBlocks(buf, ctx) + '\n</blockquote>');
      continue;
    }

    // 表格
    if (line.indexOf('|') >= 0 && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      flushPara();
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') >= 0) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(header, rows, ctx));
      continue;
    }

    // 列表
    if (matchListItem(line)) {
      flushPara();
      const r = renderList(lines, i, ctx);
      out.push(r.html);
      i = r.next;
      continue;
    }

    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flushPara();
  return out.join('\n');
}

// ---------------------------------------------------------------- 页面模板

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1f2329; background: #f5f6f7; }
  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; background: #1d2530; padding: 20px 0; position: fixed; top: 0; bottom: 0; overflow-y: auto; }
  .sidebar h1 { color: #fff; font-size: 16px; padding: 0 20px 12px; margin: 0; border-bottom: 1px solid #2c3646; }
  .sidebar .tagline { color: #6b7887; font-size: 11px; padding: 8px 20px 0; }
  .sidebar a { display: block; color: #b8c2cc; text-decoration: none; padding: 10px 20px; font-size: 13px; line-height: 1.5; }
  .sidebar a:hover { color: #fff; background: #2c3646; }
  .sidebar a.active { color: #fff; background: #2d6cf6; }
  .sidebar .nav-section { color: #6b7887; font-size: 11px; padding: 18px 20px 6px; border-top: 1px solid #2c3646; margin-top: 12px; }
  .content { margin-left: 260px; flex: 1; padding: 32px 48px; max-width: 1080px; background: #fff; min-height: 100vh; }
  h1 { font-size: 26px; } h2 { font-size: 20px; margin-top: 36px; border-bottom: 1px solid #e5e6eb; padding-bottom: 8px; } h3 { font-size: 16px; margin-top: 24px; }
  h4 { font-size: 15px; margin-top: 20px; } h5 { font-size: 14px; } h6 { font-size: 14px; }
  h1, h2, h3, h4, h5, h6 { scroll-margin-top: 16px; }
  p { line-height: 1.8; }
  li { line-height: 1.8; margin: 4px 0; }
  ul, ol { padding-left: 24px; } ul ul, ul ol, ol ul, ol ol { margin: 4px 0; padding-left: 22px; }
  li.task-item { list-style: none; margin-left: -20px; }
  code { background: #f2f3f5; border: 1px solid #e5e6eb; border-radius: 4px; padding: 1px 6px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 13px; }
  pre { background: #10141a; color: #d5dde5; border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
  pre code { background: none; border: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; margin: 12px 0; width: 100%; }
  th, td { border: 1px solid #dee0e3; padding: 8px 12px; font-size: 14px; text-align: left; }
  th { background: #f7f8fa; }
  blockquote { margin: 12px 0; padding: 10px 16px; background: #f7f8fa; border-left: 4px solid #2d6cf6; color: #4e5969; }
  blockquote p { margin: 4px 0; }
  blockquote table { margin: 8px 0; }
  img { max-width: 100%; border: 1px solid #e5e6eb; border-radius: 6px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  a { color: #2d6cf6; }
`;

function navHtml(chapters, currentFile) {
  function link(c) {
    const active = c.file === currentFile ? ' class="active"' : '';
    const href = c.navHref ? c.navHref : c.out;
    return '<a' + active + ' href="' + escapeAttr(href) + '">' + escapeHtml(c.label) + '</a>';
  }
  let html = '';
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].extra && (i === 0 || !chapters[i - 1].extra)) {
      html += '<div class="nav-section">附加文档</div>';
    }
    html += link(chapters[i]);
  }
  return html;
}

function pageHtml(title, body, chapters, currentFile) {
  return (
    '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
    '<meta charset="UTF-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '<title>' +
    escapeHtml(title) +
    '</title>\n<style>' +
    CSS +
    '</style>\n</head>\n<body>\n<div class="layout">\n' +
    '  <nav class="sidebar">\n' +
    '    <h1>' +
    escapeHtml(SITE_NAME) +
    '</h1>\n' +
    '    <div class="tagline">' +
    escapeHtml(SITE_TAGLINE) +
    '</div>\n    ' +
    navHtml(chapters, currentFile) +
    '\n  </nav>\n' +
    '  <main class="content">\n' +
    body +
    '\n  </main>\n</div>\n</body>\n</html>\n'
  );
}

// ---------------------------------------------------------------- 构建

function discoverChapters() {
  const files = fs.readdirSync(ROOT).filter(function (f) {
    return /\.md$/i.test(f);
  });
  const numbered = files
    .filter(function (f) {
      return /^\d+-/.test(f);
    })
    .sort(function (a, b) {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });
  const extras = EXTRA_DOCS.filter(function (f) {
    return files.indexOf(f) >= 0;
  });
  const all = numbered.concat(extras);
  return all.map(function (file) {
    const isExtra = extras.indexOf(file) >= 0;
    return { file: file, extra: isExtra };
  });
}

function stripInlineMarkup(text) {
  return String(text)
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1');
}

function navLabel(file, title) {
  if (file === HOME_FILE) return HOME_LABEL;
  return stripInlineMarkup(title)
    .replace(/^\d+(\s*[.、:：]\s*\d+)*\s*[.、:：]?\s*/, '')
    .trim() || stripInlineMarkup(title);
}

function outputName(file) {
  return file.replace(/\.md$/i, '.html');
}

function collectIds(html) {
  const ids = Object.create(null);
  const re = /\sid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids[m[1]] = true;
  return ids;
}

function copyImages(log) {
  rmdirRecursive(IMG_DST);
  fs.mkdirSync(IMG_DST, { recursive: true });
  let n = 0;
  if (!fs.existsSync(IMG_SRC)) return n;
  const entries = fs.readdirSync(IMG_SRC);
  for (let i = 0; i < entries.length; i++) {
    const f = entries[i];
    if (!/\.(png|jpe?g|gif|svg|webp)$/i.test(f)) continue;
    fs.copyFileSync(path.join(IMG_SRC, f), path.join(IMG_DST, f));
    n++;
  }
  log.push('复制图片: ' + n + ' 张 -> ' + path.relative(process.cwd(), IMG_DST));
  return n;
}

function main() {
  const log = [];
  const warnings = [];

  rmdirRecursive(SITE);
  fs.mkdirSync(SITE, { recursive: true });
  copyImages(log);

  const chapters = discoverChapters();
  const docs = [];

  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const mdPath = path.join(ROOT, c.file);
    const md = fs.readFileSync(mdPath, 'utf-8');
    const hm = /^#\s+(.*)$/m.exec(md);
    const title = hm ? stripInlineMarkup(hm[1]).trim() : c.file;
    c.title = title;
    c.label = navLabel(c.file, title);
    c.out = outputName(c.file);
    c.navHref = c.file === HOME_FILE ? HOME_OUT : c.out;
    docs.push({ chapter: c, md: md, ids: null, html: null });
  }

  const byFile = Object.create(null);
  for (let i = 0; i < docs.length; i++) byFile[docs[i].chapter.file] = docs[i];

  // 渲染页面
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const ctx = { slugger: makeSlugger(), file: d.chapter.file };
    const body = renderBlocks(d.md.replace(/\r\n?/g, '\n').split('\n'), ctx);
    d.html = pageHtml(d.chapter.title, body, chapters, d.chapter.file);
    d.ids = collectIds(d.html);
  }

  // 写文件：每章一个 html；00-README 另外再写一份 index.html 作为手册首页入口
  const written = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const outPath = path.join(SITE, d.chapter.out);
    fs.writeFileSync(outPath, d.html);
    written.push({ name: d.chapter.out, size: Buffer.byteLength(d.html) });
  }
  const home = byFile[HOME_FILE];
  if (home) {
    fs.writeFileSync(path.join(SITE, HOME_OUT), home.html);
    written.push({ name: HOME_OUT, size: Buffer.byteLength(home.html) });
  }

  // 源 Markdown 中的链接 / 图片自检
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const md = d.md;

    const imgRe = /!\[[^\]]*\]\(\s*([^\s)]+)/g;
    let m;
    while ((m = imgRe.exec(md))) {
      const ref = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;
      if (!fs.existsSync(path.join(ROOT, ref.replace(/^\.\//, '')))) {
        warnings.push(d.chapter.file + ' 引用的图片不存在: ' + ref);
      }
    }

    const linkRe = /\[[^\]]*\]\(\s*([^)\s]+)\)/g;
    while ((m = linkRe.exec(md))) {
      const href = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.charAt(0) === '#') continue;
      const resolved = resolveHref(href);
      const hashAt = resolved.indexOf('#');
      const target = hashAt >= 0 ? resolved.slice(0, hashAt) : resolved;
      const anchor = hashAt >= 0 ? resolved.slice(hashAt + 1) : '';
      if (!/\.html$/i.test(target)) continue;
      const targetDoc = byFile[target.replace(/\.html$/i, '.md')];
      if (!targetDoc) {
        warnings.push(d.chapter.file + ' 链接目标不存在: ' + href);
        continue;
      }
      if (anchor && !targetDoc.ids[anchor]) {
        warnings.push(
          d.chapter.file + ' 锚点未命中: ' + href + ' -> ' + target + '#' + anchor,
        );
      }
    }

    const localRe = /\[[^\]]*\]\(#([^)\s]+)\)/g;
    while ((m = localRe.exec(md))) {
      if (!d.ids[m[1]]) {
        warnings.push(d.chapter.file + ' 页内锚点未命中: #' + m[1]);
      }
    }
  }

  log.push(
    '生成页面: ' +
      docs.length +
      ' 个章节页（含 00-README.html）+ ' +
      HOME_OUT +
      '，共 ' +
      written.length +
      ' 个 html',
  );
  for (let i = 0; i < written.length; i++) {
    log.push('  - ' + written[i].name + '  ' + written[i].size + ' B');
  }

  console.log('构建完成: ' + SITE);
  console.log(log.join('\n'));
  if (warnings.length) {
    console.log('存在 ' + warnings.length + ' 条问题:');
    for (let i = 0; i < warnings.length; i++) console.log('  ! ' + warnings[i]);
    process.exitCode = 1;
  } else {
    console.log('链接与图片自检通过（问题 0）');
  }
}

main();