import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = 'D:/folia/folia-web';
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { buildModuleGraph } = await imp('dev/mcp/ts-code-map/graph/modules.mjs');
const { checkBoundaries } = await imp('dev/dedicatus/checks/boundaries.mjs');
const { checkCycles } = await imp('dev/dedicatus/checks/cycles.mjs');
const { checkModIntegration } = await imp('dev/dedicatus/checks/modIntegration.mjs');
const { checkStartupWeight } = await imp('dev/dedicatus/checks/startupWeight.mjs');
const graph = buildModuleGraph(root);
const findings = [...checkBoundaries(graph), ...checkCycles(graph), ...checkModIntegration(graph), ...checkStartupWeight(root, graph)];
for (const f of findings) {
  if (f.code === 'D506' || f.code === 'D513' || f.code === 'D203') console.log(f.key.slice(0, 280));
}
