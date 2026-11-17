import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModuleGraph } from '../mcp/ts-code-map/graph/modules.mjs';
const root = 'D:/folia/folia-web';
const graph = buildModuleGraph(root);
const all = [];
for (const f of graph.files || []) { /* noop */ }
