// Grava o que o backend lê do front: JSON Schema do documento (apps/projects/schema), JSON
// Schemas dos bancos (apps/library/schema) e o seed do banco global (library_seed).
import { spawnSync } from 'node:child_process'

const r = spawnSync(
  'npx',
  ['vitest', 'run', 'src/core/project/json-schema.test.ts', 'src/core/library/seed.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, UPDATE_SCHEMA: '1' },
  },
)
process.exit(r.status ?? 1)
