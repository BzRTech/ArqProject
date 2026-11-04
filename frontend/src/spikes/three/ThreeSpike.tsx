import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { solidTexture, woodTexture } from '@/render/three/textures'

interface BoxSpec {
  /** Medidas em mm (padrão do modelo); convertidas para metros só aqui no renderizador. */
  sizeMm: [number, number, number]
  posMm: [number, number, number]
  finish:
    | { kind: 'wood'; base: string; grain: string; vertical: boolean }
    | { kind: 'solid'; color: string }
}

const MM = 0.001

const BOXES: BoxSpec[] = Array.from({ length: 10 }, (_, i) => {
  const col = i % 5
  const row = Math.floor(i / 5)
  const w = 450 + (i % 3) * 150
  const h = 400 + (i % 4) * 200
  const finishes: BoxSpec['finish'][] = [
    { kind: 'wood', base: '#b7834f', grain: '#6b4423', vertical: true },
    { kind: 'solid', color: '#e9e4da' },
    { kind: 'wood', base: '#d8b98c', grain: '#9c7448', vertical: false },
    { kind: 'solid', color: '#3b4a5a' },
    { kind: 'wood', base: '#7b5233', grain: '#3d2412', vertical: true },
  ]
  return {
    sizeMm: [w, h, 450],
    posMm: [col * 900 - 1800, h / 2, row * 900 - 450],
    finish: finishes[i % finishes.length]!,
  }
})

function TexturedBox({ spec, seed }: { spec: BoxSpec; seed: number }) {
  const map = useMemo(
    () =>
      spec.finish.kind === 'wood'
        ? woodTexture(spec.finish.base, spec.finish.grain, seed + 1, spec.finish.vertical)
        : solidTexture(spec.finish.color, seed + 1),
    [spec, seed],
  )
  const [w, h, d] = spec.sizeMm
  const [x, y, z] = spec.posMm
  return (
    <mesh position={[x * MM, y * MM, z * MM]} castShadow receiveShadow>
      <boxGeometry args={[w * MM, h * MM, d * MM]} />
      <meshStandardMaterial map={map} roughness={0.7} />
    </mesh>
  )
}

export default function ThreeSpike() {
  return (
    <section className="spike">
      <header className="spike__header">
        <h1>Spike: three.js — 10 caixas texturizadas</h1>
      </header>
      <div className="spike__body">
        <div className="canvas" data-testid="three-canvas">
          <Canvas
            shadows
            camera={{ position: [2.8, 2.2, 3.2], fov: 45 }}
            gl={{ preserveDrawingBuffer: true }}
          >
            <color attach="background" args={['#f4f1ea']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 2]} intensity={1.6} castShadow />
            {BOXES.map((b, i) => (
              <TexturedBox key={i} spec={b} seed={i} />
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[8, 6]} />
              <meshStandardMaterial color="#ddd6c8" />
            </mesh>
            <gridHelper args={[8, 16, '#b5ad9c', '#cfc8b9']} position={[0, 0.001, 0]} />
            <OrbitControls makeDefault target={[0, 0.4, 0]} />
          </Canvas>
        </div>
        <footer className="statusbar">
          <span>Arraste para girar · botão direito para mover · roda para zoom</span>
          <span>Texturas geradas no próprio app (sem arquivos de terceiros)</span>
        </footer>
      </div>
    </section>
  )
}
