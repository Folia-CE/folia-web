# -*- coding: utf-8 -*-
# src/webBridge/api/* 的计数条目：kind=stored（provider 分发与存储键都按平台 id 写死）
import re, io

p = 'test/unit/onlineMusic/platformNamePlaces.ts'
src = io.open(p, encoding='utf-8').read()

entries = """    'src/webBridge/api/bodian.js': { n: { bodian: 61 }, kind: 'stored', why: '波点桥实现：provider 分发、operation 名与存储键都按平台 id 写死。' },
    'src/webBridge/api/cookies.js': { n: { netease: 11, qq: 50, kugou: 12, bodian: 1 }, kind: 'stored', why: '桥的会话罐：各平台 cookie 键与 adoptRequestSession 的 provider 分支。' },
    'src/webBridge/api/eapi.js': { n: { netease: 7 }, kind: 'stored', why: '网易云 eapi 加密协议实现：URL host、密钥名都是网易的线上名。' },
    'src/webBridge/api/folia.js': { n: { netease: 20, qq: 141, kugou: 16, bodian: 4 }, kind: 'stored', why: '桥的总路由：按 provider id 分发到各家实现，operation 名与键永不改名。' },
    'src/webBridge/api/kugou.js': { n: { kugou: 246 }, kind: 'stored', why: '酷狗桥实现：签名、设备 id 与 storage 键都是酷狗协议的一部分。' },
    'src/webBridge/api/libraryTrace.js': { n: { netease: 1, qq: 1, kugou: 1 }, kind: 'doc', why: '注释举例提到各平台，代码按 provider 字符串透传。' },
    'src/webBridge/api/netease.js': { n: { netease: 76, qq: 14, kugou: 1 }, kind: 'stored', why: '网易云桥实现：接口路径、cookie 键与 eapi 调用都是网易协议的一部分。' },
    'src/webBridge/api/qq-login-qr.js': { n: { qq: 103 }, kind: 'stored', why: 'QQ 扫码四步实现：ptlogin 域名、appid 与 cookie 名都是 QQ 协议的一部分。' },
    'src/webBridge/api/qq-wechat-login.js': { n: { qq: 44 }, kind: 'stored', why: 'QQ 微信扫码登录：open.weixin 域名与 cookie 名按协议写死。' },
    'src/webBridge/api/qq.js': { n: { qq: 481 }, kind: 'stored', why: 'QQ 桥实现：musicu 请求、vkey 换取与 cookie 名都是 QQ 协议的一部分。' },
    'src/webBridge/api/weapi.js': { n: { netease: 1 }, kind: 'doc', why: '注释提到 weapi 是网易的加密方案，代码平台无关。' },
"""

m = re.search(r'export const PLATFORM_NAME_PLACES: Record<string, PlatformNamePlace> = \{\n', src)
assert m
src = src[:m.end()] + entries + src[m.end():]
io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('added webBridge api entries')
