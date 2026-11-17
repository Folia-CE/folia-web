import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('D:/folia/folia-web/dev/dedicatus/lint/node_modules/eslint/package.json');
const { ESLint } = require('eslint');
const eslint = new ESLint({ cwd: 'D:/folia/folia-web' });
const targets = ['src', 'test', 'dev', 'electron', 'shared', 'api', 'api-ts', 'worker', 'packaging', 'build', 'deploy', 'public', 'skills', 'sync-server', '.github/scripts', 'packages'];
const results = await eslint.lintFiles(targets);
const actual = {};
for (const r of results) {
  const file = r.filePath.replace(/\\/g, '/').replace('D:/folia/folia-web/', '');
  for (const m of r.messages) {
    if (!m.ruleId) continue;
    actual[file] ??= {};
    actual[file][m.ruleId] = (actual[file][m.ruleId] || 0) + 1;
  }
}
const sup = JSON.parse(readFileSync('D:/folia/folia-web/eslint-suppressions.json', 'utf8'));
let over = 0;
for (const [file, counts] of Object.entries(actual)) {
  for (const [rule, n] of Object.entries(counts)) {
    const recorded = sup[file]?.[rule]?.count ?? 0;
    if (n > recorded) { console.log(`OVER ${file} | ${rule} | recorded ${recorded} | actual ${n}`); over++; }
  }
}
console.log('total over:', over);
