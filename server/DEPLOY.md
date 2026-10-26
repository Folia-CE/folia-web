# 部署到服务器

网页版跑起来只需要两样东西：**构建产物 `dist/`** 和一个 **Node 进程**（`server/static-server.mjs`）。
不需要数据库，不需要 Redis，也不需要 `node_modules`。

> 为什么非要一个进程：网易云 / QQ / 酷狗的接口都不发 `Access-Control-Allow-Origin`，
> 浏览器里直接调一定被 CORS 拦掉。页面必须和转发层**同源**，所以静态文件也得由它来发。
> 想只丢静态文件到 Nginx/CDN 也能跑，但没有本地登录（见文末）。

---

## 0. 先确认你卡在哪

你执行的那条：

```text
D:\folia\folia-major\server> node server/static-server.mjs
Error: Cannot find module 'D:\folia\folia-major\server\server\static-server.mjs'
```

**只是路径写重了**。你已经在 `server\` 里，又加了一层 `server/`。二选一：

```bash
cd D:\folia\folia-major          # 回仓库根目录
node server/static-server.mjs    # ← 用这个

# 或者就在 server\ 里：
node static-server.mjs
```

脚本内部用 `import.meta.url` 定位自己，所以**在哪个目录启动都行**，只有开头那个路径要对。

---

## 1. 构建

在仓库根目录：

```bash
npm ci
npm run build:web      # 只跑 vite build，产出 dist/
```

`npm run build` 也可以，但它会先编译 `api-ts/`（那是 Vercel serverless 那套，纯静态部署用不上）。

构建完 `dist/` 大约 **20 MB / 1900 个文件**。版本号从 `package.json` 读，做进产物里。

---

## 2. 上服务器需要的文件

只要这四个，**不用装 node_modules**（服务端只用 Node 内置模块，接口代码是纯 JS）：

```text
dist/                 ← 构建产物
server/               ← static-server.mjs + README
src/webBridge/        ← 接口代码（服务端运行时 import 它，必须带上）
package.json          ← 读版本号用
```

用 `scp` / `rsync` 传过去：

```bash
rsync -avz --delete \
  dist server src/webBridge package.json \
  user@your-server:/opt/folia/
```

> `src/webBridge/` 别漏。它不是构建输入，是**运行时**才被 `server/static-server.mjs`
> `import()` 进去的接口代码 —— 漏了的话页面能打开，但一登录就 500。

### 验证能不能跑

```bash
cd /opt/folia
PORT=4173 HOST=127.0.0.1 node server/static-server.mjs
curl http://127.0.0.1:4173/__health
# {"ok":true,"version":"0.7.22"}
```

看到这行就说明服务正常。

---

## 3. 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `HOST` | `127.0.0.1` | 只监听本机。**要对外就设 `0.0.0.0`**，或者保持默认、前面挂 Nginx 反代 |
| `PORT` | `4173` | 监听端口 |

推荐 **`HOST=127.0.0.1` + Nginx 反代**：Node 不直接暴露在公网，TLS 由 Nginx 管。

---

## 4. 用 systemd 常驻

`/etc/systemd/system/folia.service`：

```ini
[Unit]
Description=Folia web
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/folia
Environment=HOST=127.0.0.1
Environment=PORT=4173
# 只读产物 + 内存态登录，不需要写盘；顺手把权限收紧
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
Restart=always
RestartSec=3
ExecStart=/usr/bin/node /opt/folia/server/static-server.mjs

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now folia
sudo systemctl status folia
sudo journalctl -u folia -f
```

Node 需要 **>= 24**（`package.json` 里的 `engines`）。

---

## 5. 用 Nginx 反代 + HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name folia.example.com;

    ssl_certificate     /etc/letsencrypt/live/folia.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/folia.example.com/privkey.pem;

    # 构建产物里带 hash 的资源可以长缓存
    location /assets/ {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 登录轮询与接口转发都是短请求，但别设太紧
        proxy_read_timeout 60s;
    }

    client_max_body_size 2m;
}
```

```bash
sudo certbot --nginx -d folia.example.com
sudo nginx -t && sudo systemctl reload nginx
```

`/api/__folia_bridge` 是 POST + 大 JSON 的转发通道，不要给它单独加限流或 body 限制，
否则扫码登录会莫名其妙失败。

---

## 6. Docker（可选）

```dockerfile
FROM node:24-alpine

WORKDIR /app
# 运行期只需要这几样：没有 node_modules
COPY dist ./dist
COPY server ./server
COPY src/webBridge ./src/webBridge
COPY package.json ./

ENV HOST=0.0.0.0
ENV PORT=4173
EXPOSE 4173

USER node
CMD ["node", "server/static-server.mjs"]
```

```bash
docker build -t folia-web .
docker run -d --name folia -p 127.0.0.1:4173:4173 --restart unless-stopped folia-web
```

产物在**宿主机上构建好**再 `COPY` 进去，镜像里不需要装依赖，也不用跑构建，镜像很小。

---

## 7. 更新版本

```bash
git pull && npm ci && npm run build:web
rsync -avz --delete dist/ user@your-server:/opt/folia/dist/
ssh user@your-server 'sudo systemctl restart folia'
```

只同步 `dist/` 就够（除非 `server/` 或 `src/webBridge/` 也有改动）。

---

## 8. 关于「服务器扛不住」

这点在设计上已经堵死了 —— **歌曲音频永远不经过这台服务器**：

- 服务端只去要**播放地址那个 JSON**（几百字节），返回的是各家 CDN 的直链；
- 音频由浏览器的 `<audio>` 直接向 CDN 取；
- 代码里有两道闸：`audio/*`、`video/*`、`application/octet-stream` 的响应一律 **415** 掐断。

所以这台服务器的带宽压力就是「页面 + 少量 JSON」，**不随听歌人数增长**。
真正占带宽的只有首次加载的静态资源（20 MB，其中大头是字体和可视化素材），
配上 Nginx 的 `Cache-Control` 之后每人只下一次。

---

## 9. 登录态与隐私

- Cookie 只存在于**进程内存**（`cookieJar` / `chromeStorage`），不落盘、不进数据库。
- 进程重启 → 所有人重新扫码。这是刻意的：网页版没有系统加密存储可用，那就不写磁盘。
- 服务器不保存任何账号信息，也不上报任何数据。
- 反代时注意：因为登录态在内存里，**不要开多副本负载均衡**，否则扫码落在 A 实例、
  轮询打到 B 实例就会一直「未登录」。要么单实例，要么做会话粘滞。

---

## 10. 只想托管静态文件？

可以，把 `dist/` 丢给任意静态托管（Nginx、GitHub Pages、Cloudflare Pages、Vercel 静态）。
代价是**没有本地登录**：

- 应用自动探测不到 `server/static-server.mjs`，退回「需要自己配后端」的旧行为；
- 你可以在构建时指定 `VITE_NETEASE_API_BASE` / `VITE_QQ_API_BASE` / `VITE_KUGOU_API_BASE`
  指向自建的接口后端；
- 或者直接不配 —— 本地曲库、主题、可视化这些照常能用。

---

## 11. AI 云缓存（与这台服务器无关）

设置 → 外观 → 云缓存，默认打开。它让**没填 AI Key 的人**也能拿到别人生成好的主题。

- 按歌词文件的 MD5 存取，**不经过你这台服务器**：页面直接去 `https://apif.tangbot.xyz`
  （可以在设置里换成你自己的地址）；
- 只上传生成结果和歌词哈希，不上传歌词原文、提示词与密钥；
- 可以关掉，关掉只是每次都要自己生成主题，不影响其他功能。

---

## 排错

| 现象 | 原因 |
|---|---|
| `Cannot find module ...server\server\...` | 路径写重了，见第 0 节 |
| `找不到构建产物` | 没跑 `npm run build:web`，或 `dist/` 没传上去 |
| 页面能开，一登录就 500 | `src/webBridge/` 没传上去 |
| 一直「未登录」/ 扫码没反应 | 多实例负载均衡导致会话不粘滞（见第 9 节） |
| 接口全 502 | 服务器访问不了外网；或反代把 `/api/` 拦了 |
| 长按/刷新后掉登录 | 正常 —— 进程重启了，登录态在内存里 |
