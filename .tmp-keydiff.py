# -*- coding: utf-8 -*-
# 直接复现测试的键集合对比
import re, io, sys
sys.path.insert(0, '.')

def keys(p):
    src = io.open(p, encoding='utf-8').read()
    # 测试怎么收集键不清楚，用扁平化：所有 "a.b.c": 模式（含嵌套路径很难）——
    # 改用简单法：模拟测试输出中的差异键。先抓 vi 与 en 的4空格键集合
    return set(re.findall(r'^\s{4}"([\w\.]+)":', src, re.M)) | set(re.findall(r'^\s{2}"([\w\-]+)":', src, re.M))

en = keys('src/i18n/locales/en.ts')
vi = keys('src/i18n/locales/vi.ts')
print('en-vi:', sorted(en - vi))
print('vi-en:', sorted(vi - en))
