// ==UserScript==
// @name         Folia Bridge Relay
// @namespace   folia.tangbot.xyz
// @version      1.0.0
// @description  Folia 纯网页版的瘦中继：只把页面的桥请求经 GM_xmlhttpRequest 直连上游，不含任何业务逻辑。
// @match        https://folia.tangbot.xyz/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
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
// ==/UserScript==

/*
 * public/folia-bridge-relay.user.js
 *
 * 篡改猴「瘦中继」：只转发请求，不含任何业务逻辑。
 *
 * 页面里的桥（src/services/webBridge.ts）默认把请求交给同源的 Node 服务
 * （server/static-server.mjs → src/webBridge/api/folia.js）。装了这个脚本之后，
 * 页面多出一条路：postMessage 把 payload 交给本脚本，脚本用 GM_xmlhttpRequest
 * 直连上游 —— 跨域、带 Cookie 都不受浏览器同源策略限制，这正是普通网页做不到、
 * 而脚本做得到的。好处：QQ 扫码等特权请求从用户自己的浏览器直连上游，更快，
 * 部署的服务器零负担。
 *
 * 协议（与页面侧约定，见 webBridge.ts 的 relay 段）：
 *   页面 → 脚本：window.postMessage({ type: '__folia_bridge_relay', id, payload }, origin)
 *   脚本 → 页面：window.postMessage({ type: '__folia_bridge_relay_result', id, ... })
 *   脚本就绪：  window.postMessage({ type: '__folia_bridge_relay_ready' })
 *
 * 安全边界：
 *   - 只接受 event.origin === 'https://folia.tangbot.xyz' 的消息，别的页面指使不动它。
 *   - payload 原样透传（provider/operation/params/sessionCookies...），脚本不读里面的业务字段。
 *   - Cookie 只来自 payload.sessionCookies，放进请求头转发；绝不打印 payload / cookie 内容。
 *   - 日志只打 id 和上游域名。
 *
 * 维护提示：URL 拼接是一份简单映射，与 src/webBridge/api/*.js 里各 provider 的基址保持同步
 * （netease → music.163.com / interface.music.163.com，qq → u.y.qq.com 的 musicu.fcg，
 * kugou → gateway.kugou.com，bodian → bd-api.kuwo.cn）。上游基址变了要两边一起改。
 */

(() => {
    'use strict';

    const PAGE_ORIGIN = 'https://folia.tangbot.xyz';
    const REQUEST_TIMEOUT_MS = 30000;

    // 各 provider 的上游基址（与 src/webBridge/api/*.js 保持同步）。
    // netease：weapi/eapi 都在 music.163.com，eapi 走 interface 子域（src/webBridge/api/eapi.js）。
    // qq：musicu 网关（src/webBridge/api/qq.js 的 QQ_MUSICU_URL）。
    // kugou：网关（src/webBridge/api/kugou.js 的 KG_GATEWAY 一族）。
    // bodian：波点（src/webBridge/api/bodian.js 的 API_ORIGIN）。
    const PROVIDER_BASE = {
        netease: 'https://music.163.com',
        qq: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
        qq_raw: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
        kugou: 'https://gateway.kugou.com',
        bodian: 'https://bd-api.kuwo.cn',
    };

    const log = (...parts) => {
        try { console.info('[FoliaBridgeRelay]', ...parts); } catch (_) { /* 安静失败 */ }
    };

    /** 只报主机名，不报路径，更不报 payload / cookie。 */
    const hostOf = (url) => {
        try { return new URL(url).host || 'unknown'; } catch (_) { return 'unparseable'; }
    };

    /** 根据 provider 拼上游 URL；payload 里带 path/query 时按桥的形状接上。 */
    const buildUrl = (payload) => {
        const provider = String(payload && payload.provider || '').trim().toLowerCase();
        const base = PROVIDER_BASE[provider];
        if (!base) return '';
        // qq / qq_raw 是固定的 musicu 网关，path/query 不参与拼接（body 在 payload.body 里）。
        if (provider === 'qq' || provider === 'qq_raw') return base;
        // 其余按桥的 parseInput：path（缺省用 operation）+ query 拼在基址后面。
        const path = String(payload.path || payload.operation || '/').trim() || '/';
        let search = '';
        const query = payload.query;
        if (query && typeof query === 'object') {
            const pairs = [];
            for (const [key, value] of Object.entries(query)) {
                if (value === undefined || value === null) continue;
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
            }
            if (pairs.length) search = `?${pairs.join('&')}`;
        }
        const joiner = base.endsWith('/') && path.startsWith('/') ? path.slice(1) : (path.startsWith('/') || base.endsWith('/') ? '' : '/');
        return `${base}${joiner}${path}${search}`;
    };

    /** 会话可能是 Cookie 头字符串、[{name,value}] 或 {name:value}，统一归一成 Cookie 头字符串。 */
    const cookieHeaderOf = (sessionCookies) => {
        if (!sessionCookies) return '';
        if (typeof sessionCookies === 'string') return sessionCookies.trim();
        if (Array.isArray(sessionCookies)) {
            return sessionCookies
                .filter((item) => item && typeof item === 'object' && item.name)
                .map((item) => `${String(item.name)}=${String(item.value ?? '')}`)
                .join('; ');
        }
        if (typeof sessionCookies === 'object') {
            return Object.entries(sessionCookies)
                .map(([name, value]) => `${name}=${String(value ?? '')}`)
                .join('; ');
        }
        return '';
    };

    /** 用 GM_xmlhttpRequest 发一次上游请求；答复原样交回（JSON 就解析，解析不了就交文本）。 */
    const relayOnce = (payload) => new Promise((resolve) => {
        const url = buildUrl(payload);
        if (!url) {
            resolve({ __foliaBridgeError: 'UNSUPPORTED', message: `Relay does not know provider ${String(payload && payload.provider || '')}` });
            return;
        }
        const method = String(payload.method || 'GET').toUpperCase();
        const headers = Object.assign({}, payload.headers || {});
        const cookie = cookieHeaderOf(payload.sessionCookies);
        if (cookie) headers.Cookie = cookie;
        let body;
        if (payload.body !== undefined && payload.body !== null) {
            if (typeof payload.body === 'string') body = payload.body;
            else {
                body = JSON.stringify(payload.body);
                if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
            }
        }
        log(`#${payload.__relayId || '-'} → ${hostOf(url)} ${method}`);
        GM_xmlhttpRequest({
            url,
            method,
            headers,
            data: body,
            anonymous: true,
            timeout: REQUEST_TIMEOUT_MS,
            onload: (response) => {
                let answer;
                try {
                    answer = response.responseText ? JSON.parse(response.responseText) : {};
                } catch (_) {
                    answer = { __foliaBridgeError: 'UPSTREAM_NON_JSON', message: `Upstream replied non-JSON (${response.status})` };
                }
                resolve(answer);
            },
            onerror: () => {
                log(`#${payload.__relayId || '-'} ✕ ${hostOf(url)}`);
                resolve({ __foliaBridgeError: 'RELAY_NETWORK', message: 'Relay request failed (network)' });
            },
            ontimeout: () => {
                log(`#${payload.__relayId || '-'} ✕ ${hostOf(url)} timeout`);
                resolve({ __foliaBridgeError: 'RELAY_TIMEOUT', message: 'Relay request timed out' });
            },
        });
    });

    /** 一条页面消息 → 一次上游请求 → 一条结果消息。页面 ping 一下就答 ready（处理脚本晚装好）。 */
    const handleMessage = async (event) => {
        if (event.origin !== PAGE_ORIGIN) return;
        const data = event.data;
        if (data && data.type === '__folia_bridge_relay_ping') {
            try { window.postMessage({ type: '__folia_bridge_relay_ready' }, PAGE_ORIGIN); } catch (_) { /* 安静失败 */ }
            return;
        }
        if (!data || data.type !== '__folia_bridge_relay' || typeof data.id !== 'string') return;
        const answer = await relayOnce({ ...data.payload, __relayId: data.id });
        try {
            window.postMessage({
                type: '__folia_bridge_relay_result',
                id: data.id,
                answer,
            }, PAGE_ORIGIN);
        } catch (_) { /* 页面已经走了就算了 */ }
    };

    window.addEventListener('message', (event) => { void handleMessage(event); });
    log('ready');
    try {
        window.postMessage({ type: '__folia_bridge_relay_ready' }, PAGE_ORIGIN);
    } catch (_) { /* 安静失败 */ }
})();
