// scripts/build-bridge-userscript.mjs
//
// 构建期生成「篡改猴中继」要执行的桥代码 bundle：
//
//   public/folia-bridge-vm/<content-hash>.js   —— 桥接口代码（src/webBridge/api/folia.js 全家）的 IIFE
//   public/folia-bridge-vm/manifest.json       —— { version: <hash>, file: "<hash>.js" }
//
// 设计（见 public/folia-bridge-relay.user.js 头注释）：篡改猴脚本本身是**薄引导器**，
// 永不升级；桥代码在运行时从站点拉取。每次部署构建都会重新产出 bundle 与 manifest，
// 版本就是内容哈希 —— 脚本比对页面握手里带来的版本，不一致就重新拉取，用户无感。
//
// 这个脚本被 `node scripts/build-bridge-userscript.mjs` 调用；`npm run build` 之前跑
// （见 package.json），dev 模式不需要它（中继通道在 dev 里本来就不可用：origin 不对）。

import { rolldown } from 'rolldown';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'folia-bridge-vm');

const bundle = await rolldown({
  input: join(root, 'src/webBridge/api/folia.js'),
  platform: 'browser',
});
const { output } = await bundle.generate({ format: 'iife', name: '__FOLIA_BRIDGE_VM__' });
const chunk = output.find((item) => item.type === 'chunk' && item.isEntry);
if (!chunk) throw new Error('rolldown produced no entry chunk');

const hash = createHash('sha256').update(chunk.code).digest('hex').slice(0, 12);
const fileName = `folia-bridge-vm-${hash}.js`;

await mkdir(outDir, { recursive: true });
// 清掉旧版本的 bundle（manifest 换代后它们没人引用了）。
for (const entry of await readdir(outDir)) {
  if (entry !== fileName && entry !== 'manifest.json') {
    await rm(join(outDir, entry), { force: true });
  }
}
await writeFile(join(outDir, fileName), chunk.code, 'utf8');
await writeFile(
  join(outDir, 'manifest.json'),
  `${JSON.stringify({ version: hash, file: fileName }, null, 2)}\n`,
  'utf8',
);
console.log(`[bridge-vm] ${fileName} (${Math.round(chunk.code.length / 1024)} KB, version ${hash})`);
