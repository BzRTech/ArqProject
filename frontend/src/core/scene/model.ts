import type { JoineryFinish } from '../project/schema'

/** Scene coordinates in mm: x = width, y = elevation, z = plan depth. */
export type Triple = [number, number, number]
export interface SceneBox {
  name: string
  size: Triple
  center: Triple
  rotationY?: number
  finish?: JoineryFinish
  grain?: 'vertical' | 'horizontal'
}
export interface SceneGroup {
  id: string
  center: Triple
  rotationY: number
  mirrored: boolean
  boxes: SceneBox[]
}
export interface SceneSlab {
  rings: [number, number][][]
  bottom: number
  height: number
  color: string
}
export interface Scene {
  groups: SceneGroup[]
  slabs: SceneSlab[]
}
