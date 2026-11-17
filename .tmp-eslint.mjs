import { ESLint } from './dev/dedicatus/lint/node_modules/eslint/lib/index.js';
import { readFileSync } from 'node:fs';
const eslint = new ESLint({ cwd: 'D:/folia/folia-web' });
const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
const actual = {};
for (const r of results) {
  for (const m of r.messages) {
    if (!m.ruleId) continue;
    actual[r.filePath.replace(/\\/g, '/').replace('D:/folia/folia-web/', '')] ??= {};
    actual[r.filePath.replace(/\\/g, '/').replace('D:/folia/folia-web/', '')][m.ruleId] = (actual[r.filePath.replace(/\\/g, '/').replace('D:/folia/folia-web/', '')][m.ruleId] || 0) + 1;
  }
}
const sup = JSON.parse(readFileSync('D:/folia/folia-web/eslint-suppressions.json', 'utf8'));
const rules = ['dedicatus/restricted-apis'];
for (const [file, counts] of Object.entries(actual)) {
  for (const rule of rules) {
    const n = counts[rule] || 0;
    if (!n) continue;
    const recorded = sup[file]?.[rule]?.count ?? 0;
    if (n > recorded) console.log(`${file} | ${rule} | recorded ${recorded} | actual ${n}`);
  }
}
