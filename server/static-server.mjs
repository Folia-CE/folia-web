#!/usr/bin/env node
/**
 * Folia 纯静态网页版的轻量服务端。
 *
 * 一个进程干两件事：
 *
 *   1. **把构建出来的 `dist/` 当静态站点发出去** —— 网页本体还是纯静态的，
 *      不需要 Node 参与渲染，也不需要数据库。
 *
 *   2. **在同一个来源下代理三家在线音乐的接口** —— 这是关键。网易云、QQ 音乐、
 *      酷狗的接口都不返回 `Access-Control-Allow-Origin`，浏览器里直接 fetch 一定会被
 *      CORS 拦掉（这是浏览器的硬限制，改前端代码解决不了）。页面与这个服务同源，
 *      于是页面发的 `/api/<平台>/...` 就是同源请求，压根不触发 CORS 预检。
 *
 * 因为接口代码（`src/webBridge/api/*.js`）已经随前端一起打包进浏览器，登录与取数据
 * 都在本机完成，这个服务只负责「把请求转出去」和「把 Cookie 带回来」，
 * **不保存任何账号、不落盘、不连任何第三方服务器**。
 *
 * 用法：
 *   node server/static-server.mjs            # 默认 http://127.0.0.1:4173
 *   PORT=8080 HOST=0.0.0.0 node server/static-server.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);

/**
 * 页面把「本地登录」的请求送到这里，由随前端一起打包的那份接口代码在 Node 里跑。
 * 路径要和 `src/services/webBridge.ts` 里的 `BRIDGE_ROUTE` 保持一致。
 */
const BRIDGE_ROUTE = '/api/__folia_bridge';

/**
 * Cookie 罐：桥的接口代码靠浏览器的 cookie 语义维持登录态（扩展里是 `chrome.cookies`，
 * 页面里是 `document.cookie`），Node 这边用一份内存表顶上，按 host 归档。
 *
 * 注意：**只存在本次运行的内存里，不落盘**。进程一退登录态就没了 —— 网页版没有
 * 系统加密存储可用，那就不把凭据写进磁盘。桌面版是「留在主进程 + safeStorage」，
 * 这里对应的选择是「留在内存».
 */
const cookieJar = new Map();

/**
 * 桥的接口代码原本是写给浏览器扩展环境的（Chrome MV3），要用 `chrome.cookies` 与
 * `chrome.storage.local`。搬到 Node 里跑，就得把这两样补上，语义尽量和扩展一致：
 *
 *   - `chrome.cookies.getAll/get/set/remove`：给的是同一份内存罐，按 host 归档；
 *   - `chrome.storage.local.get/set/remove`：一个内存对象，`get` 用法照扩展的两种重载
 *     （传数组 / 传对象带默认值）实现；
 *   - `declarativeNetRequest`：扩展用它改请求头，Node 这边直接在 fetch 上加，不需要，
 *     给个空实现让 `?.` 之后的分支自然跳过。
 *
 * 这些都是**进程内存**，不落盘。
 */
const chromeStorage = new Map();

function cookieRecord(host, name, value) {
  return { domain: host, name, value, path: '/', secure: true, hostOnly: false };
}

function installChromeShim() {
  if (globalThis.chrome?.__foliaShim) return;

  const hostOf = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  const cookies = {
    async getAll(query = {}) {
      const out = [];
      const wantedHost = query.url ? hostOf(query.url) : '';
      const wantedDomain = String(query.domain || '').replace(/^\./, '');
      for (const [host, jar] of cookieJar) {
        const matches = wantedHost
          ? host === wantedHost || wantedHost.endsWith(`.${host}`) || host.endsWith(`.${wantedHost}`)
          : (wantedDomain ? host === wantedDomain || host.endsWith(`.${wantedDomain}`) : true);
        if (!matches) continue;
        for (const [name, value] of jar) {
          if (query.name && name !== query.name) continue;
          out.push(cookieRecord(host, name, value));
        }
      }
      return out;
    },
    async get(query = {}) {
      const host = hostOf(query.url || '');
      const jar = cookieJar.get(host);
      if (!jar || !jar.has(query.name)) return null;
      return cookieRecord(host, query.name, jar.get(query.name));
    },
    async set(details = {}) {
      const host = hostOf(details.url || '') || String(details.domain || '').replace(/^\./, '');
      if (!host || !details.name) return null;
      if (!cookieJar.has(host)) cookieJar.set(host, new Map());
      cookieJar.get(host).set(details.name, `${details.name}=${details.value ?? ''}`);
      return cookieRecord(host, details.name, details.value);
    },
    async remove(details = {}) {
      const host = hostOf(details.url || '');
      const jar = cookieJar.get(host);
      if (jar && jar.has(details.name)) {
        jar.delete(details.name);
        return { url: details.url, name: details.name };
      }
      return null;
    },
  };

  const storageLocal = {
    async get(keys) {
      // 扩展的两种重载：数组 → 只取这些键；对象 → 取出这些键并补默认值。
      if (Array.isArray(keys)) {
        const out = {};
        for (const key of keys) if (chromeStorage.has(key)) out[key] = chromeStorage.get(key);
        return out;
      }
      if (keys && typeof keys === 'object') {
        const out = { ...keys };
        for (const key of Object.keys(keys)) {
          if (chromeStorage.has(key)) out[key] = chromeStorage.get(key);
        }
        return out;
      }
      if (typeof keys === 'string') {
        return chromeStorage.has(keys) ? { [keys]: chromeStorage.get(keys) } : {};
      }
      return Object.fromEntries(chromeStorage);
    },
    async set(items) {
      for (const [key, value] of Object.entries(items || {})) chromeStorage.set(key, value);
    },
    async remove(keys) {
      for (const key of (Array.isArray(keys) ? keys : [keys])) chromeStorage.delete(key);
    },
    async clear() {
      chromeStorage.clear();
    },
  };

  globalThis.chrome = {
    __foliaShim: true,
    cookies,
    storage: { local: storageLocal },
    declarativeNetRequest: {
      // Node 里改请求头直接做在 fetch 上，这里不需要真的建规则。
      async updateSessionRules() {},
    },
  };
}

/**
 * 桥的接口代码是 ESM + 浏览器风格（`fetch` / `Response` / `CryptoJS`），Node 24 全都有，
 * 直接动态 import 就能用。加载失败只影响本地登录，静态站点照常服务。
 */
let bridgeModule = null;
let bridgeLoading = null;
async function loadBridge() {
  if (bridgeModule) return bridgeModule;
  if (!bridgeLoading) {
    installChromeShim();
    bridgeLoading = import('../src/webBridge/api/folia.js')
      .then((mod) => {
        bridgeModule = mod;
        return mod;
      })
      .catch((error) => {
        bridgeLoading = null;
        throw error;
      });
  }
  return bridgeLoading;
}

/**
 * Cookie 罐：桥的接口代码靠 `document.cookie` 那一套语义维持登录态，但 Node 里没有
 * `document`。这里用一个最简单的内存键值罐顶上，按服务生命周期存在，不落盘。
 *
 * 注意：**只存这台机器这一次运行期间的登录态**，进程一退就没了，与桌面版
 * 「凭据留在主进程、用系统加密」的思路一致 —— 网页版没有安全存储可用，
 * 那就干脆不写进磁盘。
 */
function jarKeyFor(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 把 Set-Cookie 的原始字符串塞进罐里（去掉属性，只留 name=value）。 */
function storeSetCookies(url, rawValues) {
  const host = jarKeyFor(url);
  if (!host) return;
  for (const raw of rawValues) {
    for (const piece of String(raw).split(/,(?=[^;]+?=)/)) {
      const nameValue = piece.split(';')[0].trim();
      if (!nameValue.includes('=')) continue;
      const name = nameValue.slice(0, nameValue.indexOf('=')).trim();
      if (!name) continue;
      if (!cookieJar.has(host)) cookieJar.set(host, new Map());
      cookieJar.get(host).set(name, nameValue);
    }
  }
}

function cookieHeaderFor(url) {
  const host = jarKeyFor(url);
  const jar = host ? cookieJar.get(host) : null;
  if (!jar || jar.size === 0) return '';
  return [...jar.values()].join('; ');
}

function readCookiesFromHeader(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie();
    if (Array.isArray(list) && list.length) return list.filter(Boolean).map(String);
  }
  const single = headers.get?.('set-cookie');
  return single ? [String(single)] : [];
}

/**
 * 桥不需要「真的跨域」：它就在服务端，直接发 Node fetch 即可，顺便把 cookie 罐接上。
 *
 * 注意：这里必须用**捕获下来的原始 fetch**。桥的调用期间会把 `globalThis.fetch`
 * 换成本函数，若在函数体里再写 `fetch(...)` 就会解析到替换后的那个，自己调自己无限递归。
 */
const rawFetch = globalThis.fetch.bind(globalThis);

async function nodeFetchForBridge(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers.Cookie && !headers.cookie) {
    const jarCookies = cookieHeaderFor(url);
    if (jarCookies) headers.Cookie = jarCookies;
  }
  if (!headers['User-Agent'] && !headers['user-agent']) {
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  }
  const response = await rawFetch(url, { ...options, headers, redirect: 'follow' });
  storeSetCookies(url, readCookiesFromHeader(response.headers));
  return response;
}

async function handleBridge(req, res) {
  const bridge = await loadBridge();

  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, ready: true, providers: ['netease', 'qq', 'kugou', 'qq_raw'] });
    return;
  }

  const body = await readBody(req, 8 * 1024 * 1024);
  let payload;
  try {
    payload = JSON.parse(body.toString('utf8') || '{}');
  } catch {
    sendJson(res, 400, { __foliaBridgeError: 'BAD_REQUEST', message: 'invalid JSON body' });
    return;
  }

  // 请求期间把 Node 的 fetch 换成带 cookie 罐的那个版本，让内置接口代码拿到的
  // 就是「浏览器里 document.cookie 能用」的效果。
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => nodeFetchForBridge(String(input), init || {});
  try {
    const result = await bridge.handleFoliaApiRequest(payload);
    sendJson(res, 200, result ?? {});
  } catch (error) {
    sendJson(res, 200, {
      __foliaBridgeError: 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}


/** 上游接口的来源（代理白名单）。只允许这几家，别的一律拒绝。 */
const UPSTREAMS = {
  netease: 'https://music.163.com',
  interface: 'https://interface.music.163.com',
  interface3: 'https://interface3.music.163.com',
  qq: 'https://u.y.qq.com',
  qqc: 'https://c.y.qq.com',
  qqi: 'https://i.y.qq.com',
  qqy: 'https://y.qq.com',
  kugou: 'https://www.kugou.com',
  kugoum: 'https://m.kugou.com',
  kugous: 'https://songsearch.kugou.com',
  kugouc: 'https://complexsearch.kugou.com',
  kugout: 'https://trackercdn.kugou.com',
  kugoufs: 'https://fs.open.kugou.com',
  kgimg: 'https://imge.kugou.com',
  weixin: 'https://open.weixin.qq.com',
  wxlong: 'https://long.open.weixin.qq.com',
  qrserver: 'https://api.qrserver.com',
  gtimg: 'https://y.gtimg.cn',
};

/** 转发时不要带过去、或由代理自己决定的请求头。 */
const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer',
  'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-ch-ua', 'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** 每个响应都允许被同源的页面读到（其实同源本来就允许，写出来是为了跨端口调试也不炸）。 */
function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function sendJson(res, status, body) {
  applyCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  applyCors(res);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

/**
 * 读请求体。上传上限放得比较松，因为要把音频/封面字节原样转给上游。
 */
function readBody(req, limitBytes = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * `/api/<upstream>/<path>` → 真正的上游地址。
 *
 * 返回 null 表示这个路径不该被代理（未知的上游名）。
 */
function resolveUpstreamPath(url) {
  const match = /^\/api\/([a-z0-9]+)(\/.*)?$/i.exec(url.pathname);
  if (!match) return null;
  const key = match[1].toLowerCase();
  const origin = UPSTREAMS[key];
  if (!origin) return null;
  const rest = match[2] || '/';
  return new URL(`${origin}${rest}${url.search}`);
}

/**
 * 把上游响应的 Set-Cookie 收下来，改写成浏览器能接受的形式。
 *
 * 代理和上游不同源（我们发的是 127.0.0.1，上游是 music.163.com），浏览器不会替我们
 * 保存上游域的 cookie；而接口代码要靠这些 cookie（`MUSIC_U`、`qrsig`、`p_skey` …）才能
 * 维持登录态。所以这里把每个 cookie 的 Domain / Secure 去掉，落到本服务自己的域上，
 * 再由页面侧的 fetch 带着 `credentials: 'include'` 自动带回。
 */
function rewriteSetCookie(values) {
  const out = [];
  for (const raw of values) {
    const parts = String(raw).split(';');
    const first = parts.shift() || '';
    if (!first.includes('=')) continue;
    const kept = [];
    for (const part of parts) {
      const name = part.split('=')[0].trim().toLowerCase();
      // Domain / Secure 会让浏览器拒收（我们的域和上游不一样），直接丢掉。
      if (name === 'domain' || name === 'secure' || name === 'samesite' || name === 'partitioned') continue;
      kept.push(part.trim());
    }
    // SameSite=Lax + 同源请求就够用；Path 统一成 / 免得按路径丢。
    out.push(`${first}; Path=/; SameSite=Lax${kept.length ? `; ${kept.join('; ')}` : ''}`);
  }
  return out;
}

async function handleProxy(req, res, url) {
  const target = resolveUpstreamPath(url);
  if (!target) {
    sendJson(res, 404, { error: 'unknown upstream' });
    return;
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) headers[key] = value.join(', ');
    else if (value != null) headers[key] = value;
  }
  // 上游对没有 Referer 的请求会多一道校验，按各家自己的习惯补上。
  if (!headers['referer'] && !headers['Referer']) {
    const { origin } = target;
    headers['Referer'] = `${origin}/`;
    headers['Origin'] = origin;
  }

  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await readBody(req) : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let upstream;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    sendJson(res, 502, {
      error: 'upstream request failed',
      detail: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  clearTimeout(timer);

  applyCors(res);
  // 把上游的业务响应头尽可能照搬过来（Content-Type 尤其重要：图片和音频要靠它）。
  const contentType = upstream.headers.get('content-type');
  if (contentType) res.setHeader('Content-Type', contentType);
  const cacheControl = upstream.headers.get('cache-control');
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);

  // Set-Cookie 是禁止暴露给 JS 的响应头，这里必须由服务端处理；
  // 同时把原值镜像到一个页面能读到的头里，接口代码有时要直接读它（qrsig / p_skey 等）。
  if (typeof upstream.headers.getSetCookie === 'function') {
    const raw = upstream.headers.getSetCookie();
    const rewritten = rewriteSetCookie(raw);
    if (rewritten.length) {
      res.setHeader('Set-Cookie', rewritten);
      res.setHeader('X-Folia-Set-Cookie', raw.join('\n'));
    }
  }

  res.writeHead(upstream.status);
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

/**
 * 静态文件。找不到就退回 index.html —— 前端是 SPA，路由靠 history 走。
 */
function handleStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(res, 400, 'bad path');
    return;
  }
  if (pathname === '/') pathname = '/index.html';

  // 不允许跳出 dist。
  const candidate = path.resolve(DIST, `.${pathname}`);
  if (!candidate.startsWith(DIST)) {
    sendText(res, 403, 'forbidden');
    return;
  }

  fs.stat(candidate, (statError, stat) => {
    if (!statError && stat.isFile()) return serveFile(res, candidate);

    // 目录 → 目录里的 index.html。
    if (!statError && stat.isDirectory()) {
      const indexPath = path.join(candidate, 'index.html');
      if (fs.existsSync(indexPath)) return serveFile(res, indexPath);
    }

    // SPA 回退：没有扩展名的路径交给前端路由。
    if (!path.extname(pathname)) {
      const fallback = path.join(DIST, 'index.html');
      if (fs.existsSync(fallback)) return serveFile(res, fallback);
    }

    sendText(res, 404, 'not found');
    return undefined;
  });
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  // 带内容哈希的资源可以长缓存，html 不要缓存（否则更新后拿到旧壳）。
  const longCache = /\.[0-9a-f]{8,}\.\w+$/.test(filePath) || filePath.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': ext === '.html' ? 'no-cache' : (longCache ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'),
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查，方便确认服务起来了。
  if (url.pathname === '/__health') {
    sendJson(res, 200, { ok: true, version: readVersion() });
    return;
  }

  // 「本地登录」的真正入口：页面把一家平台的请求交给这里，由内置的接口代码在服务端跑。
  if (url.pathname === BRIDGE_ROUTE) {
    handleBridge(req, res).catch((error) => {
      if (!res.headersSent) {
        sendJson(res, 500, { __foliaBridgeError: 'INTERNAL', message: error instanceof Error ? error.message : String(error) });
      } else {
        res.end();
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    handleProxy(req, res, url).catch((error) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      } else {
        res.end();
      }
    });
    return;
  }

  handleStatic(req, res, url);
});

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '';
  } catch {
    return '';
  }
}

if (!fs.existsSync(DIST)) {
  console.error(`[folia] 找不到构建产物：${DIST}`);
  console.error('[folia] 先跑一次 npm run build:web');
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`[folia] 静态站点 + 同源接口代理已启动：http://${HOST}:${PORT}`);
  console.log(`[folia] 版本 ${readVersion()}`);
  console.log('[folia] 页面与接口同源，各家登录不需要任何自建后端');
});
