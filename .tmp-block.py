# -*- coding: utf-8 -*-
# 提取 en 的 freeSoftwareNotice 区块，翻译成越南语（简明），并插入 vi.ts
import re, io

src = io.open('src/i18n/locales/en.ts', encoding='utf-8').read()
lines = src.split('\n')
start = next(i for i, l in enumerate(lines) if re.match(r'^  "freeSoftwareNotice":', l))
depth = 0
end = start
for i in range(start, len(lines)):
    depth += lines[i].count('{') - lines[i].count('}')
    if depth == 0 and i > start:
        end = i
        break
block = lines[start:end + 1]
print('\n'.join(block))
print('---vi 现有键里 ponder 区在哪一行---')
vi_lines = io.open('src/i18n/locales/vi.ts', encoding='utf-8').read().split('\n')
for i, l in enumerate(vi_lines):
    if re.match(r'^  "ponder":', l):
        print('ponder at line', i + 1)
