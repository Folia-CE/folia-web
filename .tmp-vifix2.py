# -*- coding: utf-8 -*-
# 在 vi.ts 的 ponder 区后插入 freeSoftwareNotice 区（越南语），并补齐散键（除该区 8 键外的其余缺失键）
import re, io

vi_path = 'src/i18n/locales/vi.ts'
src = io.open(vi_path, encoding='utf-8').read()
lines = src.split('\n')

fsn_block = '''  "freeSoftwareNotice": {
    "title": "Folia là phần mềm miễn phí",
    "freeForever": "Folia hoàn toàn miễn phí, mọi tính năng đều mở cho tất cả mọi người.",
    "noPaidTier": "Không có hội viên trả phí, mã kích hoạt hay bản \"mở khóa\", và chúng tôi sẽ không bao giờ tính phí.",
    "paidIsScam": "Nếu bạn đã trả tiền qua bên thứ ba, đó không phải chính thức — hãy yêu cầu hoàn tiền.",
    "joinGroup": "Tham gia nhóm QQ chính thức",
    "joinGroupHint": "Nhóm QQ chính thức {{number}} — bấm để sao chép",
    "groupCopied": "Đã sao chép số nhóm",
    "officialChannels": "Ứng dụng và nhóm QQ chính thức là hai nơi duy nhất chúng tôi đăng tin tức.",
    "acknowledge": "Đã hiểu"
  },'''

# 插到 ponder 区结束之后：找 ponder 区的结束 "}," 行
ponder_start = next(i for i, l in enumerate(lines) if re.match(r'^  "ponder":', l))
depth = 0
ponder_end = ponder_start
for i in range(ponder_start, len(lines)):
    depth += lines[i].count('{') - lines[i].count('}')
    if depth == 0 and i > ponder_start:
        ponder_end = i
        break
lines = lines[:ponder_end + 1] + fsn_block.split('\n') + lines[ponder_end + 1:]

io.open(vi_path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print('freeSoftwareNotice 区已插入到', ponder_end + 2)
