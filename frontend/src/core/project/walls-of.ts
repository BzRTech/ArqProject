import type { Environment, Wall } from './schema'

export const wallsOf = (env: Pick<Environment, 'drawings'>): Wall[] =>
  env.drawings.filter((d): d is Wall => d.kind === 'wall')
