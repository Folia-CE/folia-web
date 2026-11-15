# -*- coding: utf-8 -*-
# vi.ts 补键（安全版）：按 en.ts 中每个缺失键的「前一公共键」定位，且校验插入点在同一个命名空间内
import re, io

def read(p):
    return io.open(p, encoding='utf-8').read()

def key_lines(src):
    return [(i, re.match(r'^\s{4}"([\w\.]+)":', l).group(1))
            for i, l in enumerate(src.split('\n'))
            if re.match(r'^\s{4}"([\w\.]+)":', l)]

en_src = read('src/i18n/locales/en.ts')
vi_src = read('src/i18n/locales/vi.ts')
en_lines = en_src.split('\n')
vi_lines = vi_src.split('\n')
en_order = key_lines(en_src)
en_keys = [k for _, k in en_order]
vi_order = key_lines(vi_src)
vi_pos = {k: i for i, k in vi_order}
vi_keys = set(vi_pos.keys())

missing = [k for k in en_keys if k not in vi_keys]
print(len(missing), 'missing')

snip = {k: en_lines[i] for i, k in en_order if k in missing}

# 命名空间追踪：vi 中 2 空格缩进的 "xxx": { 是区开始
def ns_of(lines, line_no):
    ns = None
    for i in range(line_no, -1, -1):
        m = re.match(r'^  "([\w\-]+)": \{', lines[i])
        if m:
            ns = m.group(1)
            break
    return ns

# en 中每个缺失键的命名空间 + 前一公共键
out = list(vi_lines)
plan = []
for idx, k in enumerate(en_keys):
    if k not in missing:
        continue
    prev = None
    for j in range(idx - 1, -1, -1):
        if en_keys[j] in vi_pos:
            prev = en_keys[j]
            break
    plan.append((k, prev))

fail = []
for k, prev in plan:
    if prev is None:
        fail.append(k); continue
    at = vi_pos[prev]
    # 校验命名空间一致
    if ns_of(vi_lines, at) != ns_of(en_lines, en_lines.index(snip[k])):
        fail.append((k, ns_of(vi_lines, at), ns_of(en_lines, en_lines.index(snip[k]))))
        continue
    out.insert(at + 1, snip[k])
    vi_pos = {key: (p + 1 if p >= at + 1 else p) for key, p in vi_pos.items()}
    # vi_lines 也要同步，供 ns_of 使用
    vi_lines = out

if fail:
    print('FAILED anchors:', fail)
else:
    io.open('src/i18n/locales/vi.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
    print('all inserted')
