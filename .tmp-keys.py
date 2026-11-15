# -*- coding: utf-8 -*-
# 对比 en 与 vi 的顶层键差集
import re, io, sys

def keys(p):
    src = io.open(p, encoding='utf-8').read()
    return set(re.findall(r'^\s{4}"([\w\.]+)":', src, re.M))

en = keys('src/i18n/locales/en.ts')
vi = keys('src/i18n/locales/vi.ts')
missing = sorted(en - vi)
print(len(missing), 'missing in vi')
for k in missing:
    print(' ', k)
