# -*- coding: utf-8 -*-
# 把 --lower 工具列出的 9 个新文件条目追加进 platformNamePlaces.ts（kind 与 why 按各文件性质）
import re, io

p = 'test/unit/onlineMusic/platformNamePlaces.ts'
src = io.open(p, encoding='utf-8').read()

entries = """    'src/assets/providers/appIcons.ts': { n: { netease: 2, qq: 2, kugou: 2, bodian: 2, ytm: 3, spotify: 3 }, kind: 'stored', why: '平台 App 本尊图标的文件名与导入路径：文件名就是平台 id，永不改名。' },
    'src/components/app/notices/RelayInstallNotice.tsx': { n: { qq: 1 }, kind: 'doc', why: '安装引导的说明文字提到中继支持的平台，仅注释与文案。' },
    'src/components/modal/FreeSoftwareNoticeModal.tsx': { n: { qq: 7 }, kind: 'text', why: '免费软件声明里的官方 QQ 群号与按钮文案：展示给用户的文字，不是平台调用。' },
    'src/components/shared/JoinCommunityButton.tsx': { n: { qq: 19 }, kind: 'text', why: '加入社区按钮的 QQ 群号、复制逻辑与文案：纯 UI，不碰平台接口。' },
    'src/library/core/account/loginPollBackoff.ts': { n: { qq: 1 }, kind: 'doc', why: '注释举例提到 QQ 扫码轮询，代码本身平台无关。' },
    'src/library/core/account/loginQrCache.ts': { n: { netease: 1, qq: 2, kugou: 1 }, kind: 'doc', why: '注释说明各平台扫码缓存的差异，代码按传入的 provider id 工作。' },
    'src/library/core/account/providerLoginSession.service.ts': { n: { qq: 2 }, kind: 'doc', why: '注释提到 QQ 会话的特例（桥上的 cookie 罐），代码平台无关。' },
    'src/services/aiCloudCache.ts': { n: { netease: 1, qq: 1, kugou: 1 }, kind: 'doc', why: '注释说明云缓存的歌名搜索按平台排序，代码只透传 platform 字符串。' },
    'src/services/webBridge.ts': { n: { netease: 4, qq: 3, kugou: 3, bodian: 1 }, kind: 'stored', why: '桥的载荷里 provider id 与注释里的存储键（online_provider:xxx:cookie）：stored 名字，永不改名。' },
"""

# 插到 PLATFORM_NAME_PLACES 对象的开头（第一个条目之前）
m = re.search(r'export const PLATFORM_NAME_PLACES: Record<string, PlatformNamePlace> = \{\n', src)
assert m, '找不到 PLATFORM_NAME_PLACES 开头'
src = src[:m.end()] + entries + src[m.end():]
io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('added 9 entries')
