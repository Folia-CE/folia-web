# -*- coding: utf-8 -*-
# 修 vi.ts 三处语法错误
import io

p = 'src/i18n/locales/vi.ts'
c = io.open(p, encoding='utf-8').read()

# 1) freeSoftwareNotice 区前的 }, 缺逗号
c = c.replace('    }\n  }\n  "freeSoftwareNotice"', '    }\n  },\n  "freeSoftwareNotice"')

# 2) noPaidTier 的裸双引号 → 全角引号
c = c.replace('hay bản "mở khóa",', 'hay bản ‘mở khóa’,')
c = c.replace('hay bản "mở khóa"', 'hay bản ‘mở khóa’')

# 3) version 行后补逗号，并加回 freeNotice
c = c.replace(
    '    "version": "phiên bản"\n  },',
    '    "version": "phiên bản",\n    "freeNotice": "Folia là phần mềm miễn phí: mọi tính năng đều mở cho tất cả mọi người, không có gói trả phí, mã kích hoạt hay bản ‘mở khóa’."\n  },',
)

io.open(p, 'w', encoding='utf-8', newline='\n').write(c)
print('done')
