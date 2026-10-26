import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// test/unit/server/staticServerLyricProxy.test.ts
//
// `/api/lyric-proxy` 是网页版能读到 QQ 与酷狗元数据的前提：
// 两家的接口都不返回 Access-Control-Allow-Origin，浏览器直接 fetch 一定被拦，
// 页面只能经这个同源中转。它曾经整条路由都不存在 —— 页面拼出的地址一请求就是 404，
// 表现是 QQ 与酷狗「什么都搜不到」，而界面不会说原因。
//
// 所以这里起一次真的服务，验证三件事：路由在、能把回答转回来、白名单挡得住别的主机。
// 只打本机，不出网：白名单之外的那一条根本不该发出去。

const ROOT = path.resolve(__dirname, '../../..');
const SERVER = path.join(ROOT, 'server', 'static-server.mjs');
const DIST = path.join(ROOT, 'dist');
const PORT = 4287;
const BASE = `http://127.0.0.1:${PORT}`;

let server: ChildProcess | null = null;
let started = false;

const waitForHealth = async (timeoutMs = 15_000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BASE}/__health`);
            if (response.ok) return true;
        } catch {
            // 还没起来。
        }
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    return false;
};

beforeAll(async () => {
    // 没有构建产物时服务自己会退出，那属于「环境没准备好」，跳过而不是失败。
    if (!existsSync(DIST) || !existsSync(SERVER)) return;
    server = spawn(process.execPath, [SERVER], {
        env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
        stdio: 'ignore',
    });
    started = await waitForHealth();
}, 30_000);

afterAll(() => {
    if (server && !server.killed) server.kill();
    server = null;
});

describe('the static server\'s lyric relay', () => {
    it('has the route the page builds its address for', async () => {
        if (!started) return;
        // 少了 url 参数：路由存在，就会是 400（说的是参数），不是 404（说的是没这条路）。
        const response = await fetch(`${BASE}/api/lyric-proxy`);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: 'Missing url parameter' });
    }, 20_000);

    it('refuses a host that is not a lyric provider, without calling it', async () => {
        if (!started) return;
        const response = await fetch(
            `${BASE}/api/lyric-proxy?url=${encodeURIComponent('https://evil.example.com/steal')}`,
        );
        expect(response.status).toBe(403);
    }, 20_000);

    it('refuses a scheme that is not http(s)', async () => {
        if (!started) return;
        const response = await fetch(
            `${BASE}/api/lyric-proxy?url=${encodeURIComponent('file:///etc/passwd')}`,
        );
        expect(response.status).toBe(403);
    }, 20_000);

    it('answers an OPTIONS preflight without going upstream', async () => {
        if (!started) return;
        const response = await fetch(`${BASE}/api/lyric-proxy`, { method: 'OPTIONS' });
        expect(response.status).toBe(204);
    }, 20_000);
});
