import { execSync } from 'node:child_process';
const upstream = JSON.parse(execSync('git show v0.7.29:eslint-suppressions.json', { cwd: 'D:/folia/folia-web', maxBuffer: 1e8 }).toString());
const ours = JSON.parse(execSync('git show d67e91cc:eslint-suppressions.json', { cwd: 'D:/folia/folia-web', maxBuffer: 1e8 }).toString());
const onlyOurs = Object.keys(ours).filter(f => !(f in upstream));
console.log('fork-only entries:', onlyOurs.length);
for (const f of onlyOurs) console.log(' ', f, JSON.stringify(ours[f]).slice(0, 120));
