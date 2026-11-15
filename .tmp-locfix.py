# -*- coding: utf-8 -*-
# zh-CN / in / vi 补上游 auto-reverse 两键
import re, io, subprocess

for lang, a, b in [
    ('zh-CN', '竖屏横条、横屏竖缝之外再加一档', None),
    ('in', None, None),
    ('vi', None, None),
]:
    pass

theirs = {}
for lang in ['zh-CN', 'in', 'vi']:
    src = subprocess.run(['git', 'show', f'FETCH_HEAD:src/i18n/locales/{lang}.ts'],
                         capture_output=True, text=True, encoding='utf-8').stdout
    for line in src.split('\n'):
        m = re.match(r'^(\s{4})"(bravaisSeamDirectionAutoReverse\w*)":\s*(.*)$', line)
        if m:
            theirs[(lang, m.group(2))] = line

for lang in ['zh-CN', 'in', 'vi']:
    p = f'src/i18n/locales/{lang}.ts'
    c = io.open(p, encoding='utf-8').read()
    if 'bravaisSeamDirectionAutoReverse' in c:
        print(lang, 'already has')
        continue
    m = re.search(r'^(\s{4}"bravaisSeamDirectionAutoDesc":\s*.*)$', c, re.M)
    if not m:
        print(lang, 'no anchor!')
        continue
    add = theirs[(lang, 'bravaisSeamDirectionAutoReverse')] + '\n' + theirs[(lang, 'bravaisSeamDirectionAutoReverseDesc')]
    c = c.replace(m.group(0), m.group(0) + '\n' + add, 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(c)
    print(lang, 'inserted')
