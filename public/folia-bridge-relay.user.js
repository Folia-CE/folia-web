// ==UserScript==
// @name         Folia Bridge Relay
// @namespace    folia.tangbot.xyz
// @version      2.0.0
// @description  Folia 纯网页版的本地桥：页面把请求交给本脚本，脚本在自己的沙箱里跑桥接口代码（运行时从站点拉取，随部署自动更新），用 GM_xmlhttpRequest 直连各家上游。跨域与带 Cookie 都不受网页同源策略限制。
// @match        https://folia.tangbot.xyz/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      folia.tangbot.xyz
// @connect      music.163.com
// @connect      interface.music.163.com
// @connect      interface3.music.163.com
// @connect      y.qq.com
// @connect      u.y.qq.com
// @connect      c.y.qq.com
// @connect      i.y.qq.com
// @connect      qq.com
// @connect      ssl.ptlogin2.qq.com
// @connect      xui.ptlogin2.qq.com
// @connect      graph.qq.com
// @connect      open.weixin.qq.com
// @connect      lp.open.weixin.qq.com
// @connect      q1.qlogo.cn
// @connect      gateway.kugou.com
// @connect      openapi.kugou.com
// @connect      kugouvip.kugou.com
// @connect      wwwapi.kugou.com
// @connect      songsearch.kugou.com
// @connect      complexsearch.kugou.com
// @connect      mobilecdn.kugou.com
// @connect      mobileservice.kugou.com
// @connect      apis.user.kugou.com
// @connect      login.user.kugou.com
// @connect      login-user.kugou.com
// @connect      m.kugou.com
// @connect      www.kugou.com
// @connect      h5.kugou.com
// @connect      krcs.kugou.com
// @connect      lyrics.kugou.com
// @connect      m.comment.service.kugou.com
// @connect      bd-api.kuwo.cn
// @connect      mlyric.kuwo.cn
// @connect      bodian-oia.kuwo.cn
// @connect      api.qrserver.com
// @connect      y.gtimg.cn
// @connect      imge.kugou.com
// @connect      fs.open.kugou.com
// @connect      trackercdn.kugou.com
// ==/UserScript==

/*
 * public/folia-bridge-relay.user.js —— v2：薄引导器 + 运行时拉取的桥代码
 *
 * v1 的教训：桥的接口代码（weapi/eapi 加密、酷狗签名、波点签名）没法也不该塞进
 * 脚本里手工维护 —— 加密变了脚本就得跟着发版，用户要手动升级。v2 改成：
 *
 *   - 脚本本体只有引导逻辑，@version 固定（2.0.0），**永不随桥代码升级**；
 *   - 桥接口代码（src/webBridge/api/folia.js 全家，与服务器桥同一份源码）在构建期
 *     打成 IIFE，发布到站点的 /folia-bridge-vm/<hash>.js；
 *   - 脚本启动时拉 /folia-bridge-vm/manifest.json 拿当前版本号，拉对应 bundle 并
 *     eval 进自己的沙箱；页面握手里带页面构建时注入的版本号，不一致时脚本重新拉
 *     —— 部署新版本后，用户刷新一次页面就自动换到新桥，**无感升级**；
 *   - 请求协议与服务器桥完全一致：`handleFoliaApiRequest(payload)`，加密、签名、
 *     Cookie 罐语义都在桥代码里，脚本只提供 fetch 传输（GM_xmlhttpRequest）与
 *     chrome.* 垫片（GM_setValue 持久化，比服务器内存罐更稳：浏览器重启都在）。
 *
 * 协议（与 src/services/webBridge.ts 对应）：
 *   页面 → 脚本：{ type: '__folia_bridge_relay_ping', version? }
 *               { type: '__folia_bridge_relay', id, payload }
 *   脚本 → 页面：{ type: '__folia_bridge_relay_ready' | '__folia_bridge_relay_pong', version, ready }
 *               { type: '__folia_bridge_relay_result', id, ok, data?, error? }
 *
 * 安全边界：
 *   - 只接受 event.origin === 'https://folia.tangbot.xyz' 的消息；
 *   - bundle 只从 https://folia.tangbot.xyz 拉（部署方自己发布的代码，与页面同源信任级别）；
 *   - 会话 Cookie 只在脚本沙箱与上游之间流动，不进日志。
 */

(() => {
    'use strict';

    const PAGE_ORIGIN = 'https://folia.tangbot.xyz';
    const MANIFEST_URL = `${PAGE_ORIGIN}/folia-bridge-vm/manifest.json`;
    const BUNDLE_URL = (file) => `${PAGE_ORIGIN}/folia-bridge-vm/${file}`;
    const REQUEST_TIMEOUT_MS = 45000;
    const BRIDGE_SOURCE = 'folia-extension-bridge';

    const log = (...parts) => {
        try { console.info('[FoliaBridgeRelay]', ...parts); } catch (_) { /* 安静失败 */ }
    };

    /* ---------------- chrome.* 垫片：桥代码写给扩展环境，这里补齐 ---------------- */

    // Cookie 罐语义（与 server/static-server.mjs 的内存罐一致），但用 GM storage 落地：
    // 浏览器重启后登录态还在 —— 这正是脚本比服务器强的地方。
    const GM_PREFIX = 'foliaJar:';

    const gmGet = (key) => new Promise((resolve) => {
        try {
            const value = GM_getValue(GM_PREFIX + key);
            resolve(value == null ? null : String(value));
        } catch (_) { resolve(null); }
    });
    const gmSet = (key, value) => {
        try { GM_setValue(GM_PREFIX + key, String(value ?? '')); } catch (_) {}
    };
    const gmKeys = () => {
        try { return (GM_listValues ? GM_listValues() : []).filter((k) => String(k).startsWith(GM_PREFIX)); } catch (_) { return []; }
    };

    const jarKeyOf = (url) => {
        try { return new URL(url).hostname; } catch (_) { return ''; }
    };
    const cookieRecord = (host, name, value) => ({ domain: host, name, value, path: '/', secure: true, hostOnly: false });

    // GM storage 只给键值对：罐序列化成「host → { name=value }」的一张表，按需读写。
    const jarGet = async (host) => {
        const raw = await gmGet(host);
        const map = new Map();
        if (raw) {
            for (const pair of String(raw).split('; ')) {
                const eq = pair.indexOf('=');
                if (eq > 0) map.set(pair.slice(0, eq), pair.slice(eq + 1));
            }
        }
        return map;
    };
    const jarPut = async (host, map) => { gmSet(host, Array.from(map.values()).join('; ')); };

    const chromeCookies = {
        async getAll(query = {}) {
            const wantedHost = query.url ? jarKeyOf(query.url) : '';
            const wantedDomain = String(query.domain || '').replace(/^\./, '');
            const out = [];
            for (const key of gmKeys()) {
                const host = key.slice(GM_PREFIX.length);
                const matches = wantedHost
                    ? host === wantedHost || wantedHost.endsWith(`.${host}`) || host.endsWith(`.${wantedHost}`)
                    : (wantedDomain ? host === wantedDomain || host.endsWith(`.${wantedDomain}`) : true);
                if (!matches) continue;
                for (const [name, nameValue] of await jarGet(host)) {
                    if (query.name && name !== query.name) continue;
                    out.push(cookieRecord(host, name, nameValue.slice(nameValue.indexOf('=') + 1)));
                }
            }
            return out;
        },
        async get(query = {}) {
            const host = jarKeyOf(query.url || '');
            if (!host) return null;
            const jar = await jarGet(host);
            if (!jar.has(query.name)) return null;
            const nameValue = jar.get(query.name);
            return cookieRecord(host, query.name, nameValue.slice(nameValue.indexOf('=') + 1));
        },
        async set(details = {}) {
            const host = jarKeyOf(details.url || '') || String(details.domain || '').replace(/^\./, '');
            if (!host || !details.name) return null;
            const jar = await jarGet(host);
            jar.set(details.name, `${details.name}=${details.value ?? ''}`);
            await jarPut(host, jar);
            return cookieRecord(host, details.name, details.value);
        },
        async remove(details = {}) {
            const host = jarKeyOf(details.url || '');
            if (!host) return null;
            const jar = await jarGet(host);
            const existed = jar.delete(details.name);
            await jarPut(host, jar);
            return existed ? { url: details.url, name: details.name } : null;
        },
    };

    const chromeStorageLocal = {
        async get(keys) {
            if (Array.isArray(keys)) {
                const out = {};
                for (const key of keys) {
                    const value = await gmGet(`st:${key}`);
                    if (value !== null) out[key] = value;
                }
                return out;
            }
            if (keys && typeof keys === 'object') {
                const out = { ...keys };
                for (const key of Object.keys(keys)) {
                    const value = await gmGet(`st:${key}`);
                    if (value !== null) out[key] = value;
                }
                return out;
            }
            if (typeof keys === 'string') {
                const value = await gmGet(`st:${keys}`);
                return value === null ? {} : { [keys]: value };
            }
            return {};
        },
        async set(items) {
            for (const [key, value] of Object.entries(items || {})) {
                gmSet(`st:${key}`, typeof value === 'string' ? value : JSON.stringify(value));
            }
        },
        async remove(keys) {
            for (const key of (Array.isArray(keys) ? keys : [keys])) {
                try { GM_deleteValue(GM_PREFIX + `st:${key}`); } catch (_) {}
            }
        },
        async clear() {
            for (const key of gmKeys()) {
                if (key.slice(GM_PREFIX.length).startsWith('st:')) {
                    try { GM_deleteValue(key); } catch (_) {}
                }
            }
        },
    };

    const installChromeShim = () => {
        try {
            globalThis.chrome = {
                __foliaShim: true,
                cookies: chromeCookies,
                storage: { local: chromeStorageLocal },
                declarativeNetRequest: { async updateSessionRules() {} },
            };
        } catch (_) { /* 已有（不该发生）就算了 */ }
    };

    /* ---------------- GM_xmlhttpRequest 版 fetch：桥代码里所有上游请求的传输层 ---------------- */

    /** 读响应头：GM 给的是拼接字符串，转成 Headers；Set-Cookie 原样保进镜像头。 */
    const headersFromGm = (response) => {
        const headers = new Headers();
        const raw = String(response.responseHeaders || '');
        for (const line of raw.split(/\r?\n/)) {
            const idx = line.indexOf(':');
            if (idx <= 0) continue;
            const name = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            if (/^set-cookie$/i.test(name)) {
                try { headers.append('x-folia-set-cookie', value); } catch (_) {}
            } else if (name) {
                try { headers.set(name, value); } catch (_) {}
            }
        }
        return headers;
    };

    const gmFetch = (input, init = {}) => new Promise((resolve, reject) => {
        const url = typeof input === 'string' ? input : (input && input.url) || String(input);
        const headers = {};
        const given = init.headers;
        if (given) {
            if (typeof given.forEach === 'function') given.forEach((v, k) => { headers[k] = v; });
            else for (const [k, v] of Object.entries(given)) headers[k] = v;
        }
        GM_xmlhttpRequest({
            url,
            method: String(init.method || 'GET').toUpperCase(),
            headers,
            data: init.body == null ? undefined : String(init.body),
            anonymous: false,
            redirect: { follow: 'follow', error: 'error', manual: 'manual' }[init.redirect] || 'follow',
            timeout: REQUEST_TIMEOUT_MS,
            onload: (response) => {
                const status = Number(response.status) || 0;
                const bodyText = response.responseText ?? '';
                resolve({
                    status,
                    ok: status >= 200 && status < 300,
                    url,
                    headers: headersFromGm(response),
                    text: () => Promise.resolve(bodyText),
                    json: () => Promise.resolve(JSON.parse(bodyText)),
                });
            },
            onerror: () => reject(new TypeError('fetch failed (relay network)')),
            ontimeout: () => reject(new TypeError('fetch timed out (relay)')),
        });
    });

    /* ---------------- 桥代码装载：运行时拉取 + eval ---------------- */

    let bridgeVm = null;      // { handleFoliaApiRequest, getFoliaBridgeStatus, ... }
    let bridgeVersion = '';   // 当前装载的 bundle 版本（内容哈希）
    let bridgeLoading = null; // 进行中的装载（并发请求合并成一次）

    const fetchText = (url) => new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url,
            method: 'GET',
            timeout: 20000,
            anonymous: false,
            onload: (response) => {
                if (Number(response.status) === 200) resolve(response.responseText);
                else reject(new Error(`fetch ${url} -> ${response.status}`));
            },
            onerror: () => reject(new Error(`fetch ${url} failed`)),
            ontimeout: () => reject(new Error(`fetch ${url} timed out`)),
        });
    });

    const loadBridge = async () => {
        if (bridgeVm) return bridgeVm;
        if (!bridgeLoading) {
            bridgeLoading = (async () => {
                const manifest = JSON.parse(await fetchText(MANIFEST_URL));
                const code = await fetchText(BUNDLE_URL(manifest.file));
                // 拉到的是我们自己构建的 IIFE（构建脚本 scripts/build-bridge-userscript.mjs），
                // 在篡改猴沙箱里执行 —— 沙箱的 window 与页面隔开，这段代码碰不到页面 DOM。
                (0, eval)(code);
                const vm = globalThis.__FOLIA_BRIDGE_VM__;
                if (!vm || typeof vm.handleFoliaApiRequest !== 'function') {
                    throw new Error('bridge bundle did not expose __FOLIA_BRIDGE_VM__');
                }
                // 桥代码里的 fetch 换成 GM 传输（脚本沙箱里浏览器 fetch 会被 CORS 拦，GM 不会）。
                globalThis.fetch = gmFetch;
                bridgeVm = vm;
                bridgeVersion = String(manifest.version || '');
                log('bridge loaded, version', bridgeVersion);
                return bridgeVm;
            })().catch((error) => {
                bridgeLoading = null;
                throw error;
            });
        }
        return bridgeLoading;
    };

    /** 页面握手要的版本：页面构建时注入的目标版本。脚本落后来就重拉。 */
    const syncToVersion = async (wantVersion) => {
        if (!wantVersion || wantVersion === bridgeVersion) return;
        // 已装载但版本旧：重拉（bundle 文件名换了，直接清缓存重走 loadBridge）。
        bridgeVm = null;
        bridgeLoading = null;
        try { await loadBridge(); } catch (error) { log('version sync failed', error); }
    };

    /* ---------------- 请求处理 ---------------- */

    const relayOnce = async (payload) => {
        await loadBridge();
        // 请求期间把 fetch 固定为 GM 传输（并发时这是同一个引用，无碍）。
        const originalFetch = globalThis.fetch;
        globalThis.fetch = gmFetch;
        try {
            return await bridgeVm.handleFoliaApiRequest(payload);
        } finally {
            globalThis.fetch = originalFetch;
        }
    };

    const handleMessage = async (event) => {
        if (event.origin !== PAGE_ORIGIN) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === '__folia_bridge_relay_ping') {
            // 页面带版本来了：先对齐版本再应答，应答里报当前版本。
            await syncToVersion(data.version).catch(() => {});
            try {
                window.postMessage({
                    type: '__folia_bridge_relay_pong',
                    version: bridgeVersion,
                    ready: Boolean(bridgeVm),
                }, PAGE_ORIGIN);
            } catch (_) {}
            return;
        }

        if (data.type !== '__folia_bridge_relay' || typeof data.id !== 'string') return;
        let ok = true;
        let answer;
        try {
            answer = await relayOnce(data.payload || {});
        } catch (error) {
            ok = false;
            answer = error instanceof Error ? error.message : String(error);
        }
        try {
            window.postMessage({
                type: '__folia_bridge_relay_result',
                id: data.id,
                ok,
                data: ok ? (answer ?? {}) : undefined,
                error: ok ? undefined : String(answer || 'bridge request failed'),
            }, PAGE_ORIGIN);
        } catch (_) { /* 页面已经走了就算了 */ }
    };

    const boot = () => {
        installChromeShim();
        window.addEventListener('message', (event) => { void handleMessage(event); });
        log('booted (thin loader v2)');
        // 先静默装载：等第一次 ping 或请求来的时候多半已经就绪。
        void loadBridge().then(() => {
            try { window.postMessage({ type: '__folia_bridge_relay_ready', version: bridgeVersion, ready: true }, PAGE_ORIGIN); } catch (_) {}
        }).catch(() => {});
    };

    boot();
})();
