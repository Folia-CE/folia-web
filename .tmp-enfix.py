# -*- coding: utf-8 -*-
# en 缺两个上游新键（auto-reverse 方向档）：从上游 en.ts 抓来插入
import re, io, subprocess

theirs = subprocess.run(['git', 'show', 'FETCH_HEAD:src/i18n/locales/en.ts'],
                        capture_output=True, text=True, encoding='utf-8').stdout
snips = {}
for line in theirs.split('\n'):
    m = re.match(r'^(\s{4})"(bravaisSeamDirectionAutoReverse\w*)":\s*(.*)$', line)
    if m:
        snips[m.group(2)] = line

print('found:', list(snips.keys()))

p = 'src/i18n/locales/en.ts'
c = io.open(p, encoding='utf-8').read()
anchor_key = 'bravaisSeamDirectionAutoDesc'
for line in io.open(p, encoding='utf-8').read().split('\n'):
    m = re.match(r'^(\s{4})"' + anchor_key + r'":\s*(.*)$', line)
    if m:
        indent = m.group(1)
        break

# 插到 AutoDesc 行之后
c = c.replace(m.group(0), m.group(0) + '\n' + snips['bravaisSeamDirectionAutoReverse'] + '\n' + snips['bravaisSeamDirectionAutoReverseDesc'])
io.open(p, 'w', encoding='utf-8', newline='\n').write(c)
print('inserted into en')
