import { Component, useEffect, useMemo, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Path, Shape } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Scene, SceneBox, SceneSlab, Triple } from '@/core/scene/model'
import { shade } from '@/core/joinery/finish'
import { solidTexture, woodTexture } from './textures'

const meters = (v: Triple): Triple => [v[0] / 1000, v[1] / 1000, v[2] / 1000]

function PanelMesh({ box }: { box: SceneBox }) {
  const hex = box.finish?.hex ?? box.color ?? '#cec4b4'
  const wood = box.finish?.kind === 'madeirado'
  const map = useMemo(
    () =>
      wood
        ? woodTexture(hex, shade(hex, 0.65), 17, box.grain !== 'horizontal')
        : solidTexture(hex, 17),
    [hex, wood, box.grain],
  )
  useEffect(() => () => map.dispose(), [map])
  const [width, height, depth] = box.size
  const radius = box.radiusMm ?? 0
  const roundedGeometry = useMemo(
    () =>
      radius > 0
        ? new RoundedBoxGeometry(width / 1000, height / 1000, depth / 1000, 3, radius / 1000)
        : null,
    [width, height, depth, radius],
  )
  useEffect(() => () => roundedGeometry?.dispose(), [roundedGeometry])
  return (
    <mesh
      position={meters(box.center)}
      rotation={[0, box.rotationY ?? 0, 0]}
      castShadow
      receiveShadow
    >
      {roundedGeometry ? (
        <primitive attach="geometry" object={roundedGeometry} />
      ) : (
        <boxGeometry args={meters(box.size)} />
      )}
      <meshStandardMaterial map={map} roughness={0.72} />
    </mesh>
  )
}

function SlabMesh({ slab }: { slab: SceneSlab }) {
  const shape = useMemo(() => {
    const rings = slab.rings.map((r) =>
      r.map(([x, z]) => [x / 1000, -z / 1000] as [number, number]),
    )
    const result = new Shape()
    const trace = (path: Path, points: [number, number][]) => {
      const [first, ...rest] = points
      if (!first) return
      path.moveTo(...first)
      rest.forEach((p) => path.lineTo(...p))
      path.closePath()
    }
    trace(result, rings[0] ?? [])
    result.holes = rings.slice(1).map((r) => {
      const hole = new Path()
      trace(hole, r)
      return hole
    })
    return result
  }, [slab.rings])
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, slab.bottom / 1000, 0]}
      castShadow
      receiveShadow
    >
      <extrudeGeometry args={[shape, { depth: slab.height / 1000, bevelEnabled: false }]} />
      <meshStandardMaterial color={slab.color} roughness={0.9} />
    </mesh>
  )
}

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? (
      <p role="alert">
        Não foi possível iniciar o 3D. Verifique a aceleração gráfica do navegador e reabra a aba.
      </p>
    ) : (
      this.props.children
    )
  }
}

export function SceneView({
  scene,
  target,
  span,
  onCanvas,
}: {
  scene: Scene
  target: Triple
  span: number
  onCanvas: (canvas: HTMLCanvasElement) => void
}) {
  const t = meters(target)
  const distance = span / 1000
  return (
    <ViewBoundary>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [t[0] + distance, t[1] + distance * 0.8, t[2] + distance],
          fov: 45,
          near: 0.01,
          far: Math.max(1000, distance * 20),
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => onCanvas(gl.domElement)}
        fallback={<p role="alert">O navegador precisa de WebGL para mostrar a vista 3D.</p>}
      >
        <color attach="background" args={['#f4f1ea']} />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[t[0] + distance, distance * 2, t[2] + distance]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        {scene.slabs.map((slab, i) => (
          <SlabMesh key={i} slab={slab} />
        ))}
        {scene.groups.map((g) => (
          <group
            key={g.id}
            position={meters(g.center)}
            rotation={[0, g.rotationY, 0]}
            scale={[g.mirrored ? -1 : 1, 1, 1]}
          >
            {g.boxes.map((box, i) => (
              <PanelMesh key={i} box={box} />
            ))}
          </group>
        ))}
        <gridHelper
          args={[distance * 3, 30, '#b5ad9c', '#ddd6c8']}
          position={[t[0], -0.025, t[2]]}
        />
        <OrbitControls makeDefault target={t} maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </ViewBoundary>
  )
}
