# -*- coding: utf-8 -*-
# vi.ts 散键补齐（v3，内容锚点法）：每个键插到 vi 中「它 en 里前一公共键」那一行之后，
# 直接对文本做一次线性扫描，边扫描边按 en 键序匹配，绝不做位置表更新。
import re, io

def read(p):
    return io.open(p, encoding='utf-8').read()

def key_seq(src):
    return [(i, re.match(r'^\s{4}"([\w\.]+)":', l).group(1))
            for i, l in enumerate(src.split('\n'))
            if re.match(r'^\s{4}"([\w\.]+)":', l)]

en_src = read('src/i18n/locales/en.ts')
vi_src = read('src/i18n/locales/vi.ts')
en_lines = en_src.split('\n')
vi_lines = vi_src.split('\n')

en_order = key_seq(en_src)
en_keys = [k for _, k in en_order]
vi_keys = set(k for _, k in key_seq(vi_src))
missing = [k for k in en_keys if k not in vi_keys]
snip = {k: en_lines[i] for i, k in en_order if k in missing}

# 每个缺失键在 en 中的前一公共键
anchor = {}
for idx, k in enumerate(en_keys):
    if k in missing:
        for j in range(idx - 1, -1, -1):
            if en_keys[j] not in missing and en_keys[j] in vi_keys:
                anchor[k] = en_keys[j]
                break

# 收集每个锚点行在 vi 中的行号（只找一次，插入只影响其后的行 → 从文件尾往头插）
anchor_lines = {}
for i, l in enumerate(vi_lines):
    m = re.match(r'^\s{4}"([\w\.]+)":', l)
    if m and m.group(1) in set(anchor.values()):
        anchor_lines.setdefault(m.group(1), i)  # 第一处

inserts = []  # (行号, 内容)
for k in missing:
    a = anchor.get(k)
    if a is None or a not in anchor_lines:
        print('no anchor line for', k)
        continue
    inserts.append((anchor_lines[a], snip[k]))

inserts.sort(key=lambda t: -t[0])  # 从后往前插
for at, text in inserts:
    vi_lines.insert(at + 1, text)

io.open('src/i18n/locales/vi.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(vi_lines))
print('inserted', len(inserts), 'of', len(missing))
