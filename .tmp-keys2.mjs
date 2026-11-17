import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = 'D:/folia/folia-web';
const { buildModuleGraph } = await import(`${root}/dev/mcp/ts-code-map/graph/modules.mjs`);
const { checkBoundaries } = await import(`${root}/dev/dedicatus/checks/boundaries.mjs`);
const { checkCycles } = await import(`${root}/dev/dedicatus/checks/cycles.mjs`);
const { checkModIntegration } = await import(`${root}/dev/dedicatus/checks/modIntegration.mjs`);
const { checkStartupWeight } = await import(`${root}/dev/dedicatus/checks/startupWeight.mjs`);
const graph = buildModuleGraph(root);
const findings = [...checkBoundaries(graph), ...checkCycles(graph), ...checkModIntegration(graph), ...checkStartupWeight(root, graph)];
for (const f of findings) {
  if (f.code === 'D506' || f.code === 'D513' || f.code === 'D203') console.log(JSON.stringify(f.key).slice(0, 300));
}
