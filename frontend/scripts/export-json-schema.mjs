// Grava backend/apps/projects/schema/project.schema.json a partir do schema zod do documento.
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['vitest', 'run', 'src/core/project/json-schema.test.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, UPDATE_SCHEMA: '1' },
})
process.exit(r.status ?? 1)
