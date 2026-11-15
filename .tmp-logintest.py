# -*- coding: utf-8 -*-
# pillProvider 用例改为我方行为：全部不可用时也画出第一个（置灰），不是 null
import io

p = 'test/unit/login/loginView.test.ts'
c = io.open(p, encoding='utf-8').read()

old = """        expect(pillProvider([row('a', unusable)], 'a')).toBeNull();"""
new = """        // 网页版全部够不着时也画出第一个（置灰）：切换器上「看不见这个平台」与「看见了但用不了」是两回事。
        expect(pillProvider([row('a', unusable)], 'a')?.providerId).toBe('a');"""
assert old in c, 'pill case not found'
c = c.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(c)
print('pill case updated')
