import { Edges, OrbitControls } from '@react-three/drei'
import { WalkControls } from './WalkControls'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CONTEXT_BOTTOM, D, GLASS_BLOCK, T_S, W, contextWalls } from '@/plan/common'
import { cameraPresets, type CameraPreset } from './cameraPresets'
import { LST, ROOF, SOFFIT } from '@/plan/stair'
import type { Dir, Furniture, LStair, Plan, Rect, RoomTone, StraightStair, Wall, Window } from '@/plan/types'
import { winderPolys } from '@/plan/winders'

const HEAD = 2.02
/** Janelas existentes com 1,045 m de altura. */
const SILL = HEAD - 1.045

const floorColor: Record<RoomTone, string> = {
  bed: '#d8b48a',
  closet: '#d8b48a',
  bath: '#e4ecef',
  circ: '#d9d3c7',
  stair: '#d9d3c7',
  living: '#cfae86',
  service: '#d9d3c7',
}

type Props = {
  plan: Plan
  floorToFloor: number
  preset: CameraPreset
  showFurniture: boolean
  showLabels: boolean
  showWorks: boolean
  cutWalls: boolean
  walk: boolean
}

type Label = { x: number; z: number; h: number; title: string; sub?: string; muted?: boolean }

export default function House3D(props: Props) {
  const overlay = useRef<HTMLDivElement>(null)
  const labels = useMemo<Label[]>(() => {
    if (!props.showLabels || props.preset === 'escada') return []
    const rooms = props.plan.rooms.map((r) => ({
      x: r.label.x,
      z: r.label.y,
      h: props.walk ? 1.75 : r.id === 'escada' ? 1.6 : 0.9,
      title: r.name,
      sub: `${r.area.toFixed(1).replace('.', ',')} m²`,
    }))
    return [...rooms, { x: 1.44, z: 7.6, h: 0.1, title: 'Cozinha', muted: true }, { x: 4.1, z: 7.9, h: 0.1, title: 'Hall · entrada E2', muted: true }]
  }, [props.plan, props.showLabels, props.preset, props.walk])

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: props.walk ? 68 : 42, position: cameraPresets[props.preset].pos, near: 0.08, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#f3f0ea']} />
        <hemisphereLight args={['#ffffff', '#d6cfc2', 0.9]} />
        <directionalLight
          position={[9, 14, 11]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0004}
        />
        <Scene {...props} />
        {props.walk ? (
          <WalkControls plan={props.plan} preset={props.preset} />
        ) : (
          <>
            <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.02} minDistance={1} maxDistance={40} />
            <CameraRig preset={props.preset} />
            <OrbitFov />
          </>
        )}
        <LabelProjector labels={labels} overlay={overlay} />
      </Canvas>
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((l, i) =>
          l.muted ? (
            <div key={i} className="absolute top-0 left-0 text-[11px] font-medium whitespace-nowrap text-stone-500" style={{ visibility: 'hidden' }}>
              {l.title}
            </div>
          ) : (
            <div
              key={i}
              className="absolute top-0 left-0 rounded-full bg-white/90 px-2.5 py-1 text-[11px] leading-tight font-semibold whitespace-nowrap text-stone-800 shadow-sm ring-1 ring-stone-900/10"
              style={{ visibility: 'hidden' }}
            >
              {l.title}
              {l.sub && <span className="ml-1 font-normal text-stone-500">{l.sub}</span>}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function LabelProjector({ labels, overlay }: { labels: Label[]; overlay: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const nodes = overlay.current?.children
    if (!nodes) return
    labels.forEach((l, i) => {
      const el = nodes[i] as HTMLElement | undefined
      if (!el) return
      v.set(l.x, l.h, l.z).project(camera)
      if (v.z > 1) {
        el.style.visibility = 'hidden'
        return
      }
      const px = ((v.x + 1) / 2) * size.width
      const py = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px)`
      el.style.visibility = 'visible'
    })
  })
  return null
}

function OrbitFov() {
  const { camera } = useThree()
  useEffect(() => {
    if (!('fov' in camera)) return
    camera.fov = 42
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null }
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(...cameraPresets[preset].pos),
    target: new THREE.Vector3(...cameraPresets[preset].target),
    active: true,
  })

  useEffect(() => {
    goal.current.pos.set(...cameraPresets[preset].pos)
    goal.current.target.set(...cameraPresets[preset].target)
    goal.current.active = true
  }, [preset])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g.active || !controls) return
    const k = 1 - Math.pow(0.0015, dt)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.01 && controls.target.distanceTo(g.target) < 0.01) g.active = false
  })

  useEffect(() => {
    if (!controls) return
    const stop = () => (goal.current.active = false)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  return null
}

/** Caixa com coordenadas da planta: x → x, y da planta → z, altura → y. */
function Block({
  x,
  y,
  w,
  h,
  z0,
  z1,
  color,
  edges = true,
  opacity,
  cast = true,
}: {
  x: number
  y: number
  w: number
  h: number
  z0: number
  z1: number
  color: string
  edges?: boolean
  opacity?: number
  cast?: boolean
}) {
  if (w <= 0.001 || h <= 0.001 || z1 - z0 <= 0.001) return null
  return (
    <mesh position={[x + w / 2, (z0 + z1) / 2, y + h / 2]} castShadow={cast} receiveShadow>
      <boxGeometry args={[w, z1 - z0, h]} />
      <meshStandardMaterial color={color} roughness={0.85} transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
      {edges && <Edges color="#6b645c" threshold={20} />}
    </mesh>
  )
}

function splitByWindows(wall: Wall, windows: Window[], floorRaise: number) {
  const horizontal = wall.w >= wall.h
  const a0 = horizontal ? wall.x : wall.y
  const a1 = horizontal ? wall.x + wall.w : wall.y + wall.h
  const cuts = windows
    .filter((win) => win.kind !== 'optional')
    .filter((win) => win.x < wall.x + wall.w - 1e-3 && win.x + win.w > wall.x + 1e-3 && win.y < wall.y + wall.h - 1e-3 && win.y + win.h > wall.y + 1e-3)
    .map((win) => ({
      s0: horizontal ? Math.max(a0, win.x) : Math.max(a0, win.y),
      s1: horizontal ? Math.min(a1, win.x + win.w) : Math.min(a1, win.y + win.h),
      sill: win.sill ?? SILL - floorRaise,
      head: win.head ?? HEAD - floorRaise,
    }))
    .sort((p, q) => p.s0 - q.s0)

  const solid: [number, number][] = []
  let cur = a0
  for (const c of cuts) {
    if (c.s0 > cur) solid.push([cur, c.s0])
    cur = Math.max(cur, c.s1)
  }
  if (cur < a1) solid.push([cur, a1])

  const rect = (s0: number, s1: number) => (horizontal ? { x: s0, y: wall.y, w: s1 - s0, h: wall.h } : { x: wall.x, y: s0, w: wall.w, h: s1 - s0 })
  return {
    solid: solid.map(([s0, s1]) => rect(s0, s1)),
    openings: cuts.map((c) => ({ ...rect(c.s0, c.s1), sill: c.sill, head: c.head })),
  }
}

const dirVec: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }

/** Parede de um vão de correr ou livre: a que acaba numa das ombreiras e segue a linha do vão (as perpendiculares são mais compridas que 0,40). */
const gapHost = (walls: Wall[], d: { x: number; y: number; length: number; orientation: 'h' | 'v' }) =>
  walls.find((w) =>
    d.orientation === 'h'
      ? w.h <= 0.4 && d.y > w.y && d.y < w.y + w.h && (Math.abs(w.x + w.w - d.x) < 0.02 || Math.abs(w.x - d.x - d.length) < 0.02)
      : w.w <= 0.4 && d.x > w.x && d.x < w.x + w.w && (Math.abs(w.y + w.h - d.y) < 0.02 || Math.abs(w.y - d.y - d.length) < 0.02),
  )

function Walls({ plan, showWorks, top }: { plan: Plan; showWorks: boolean; top: number }) {
  const walls = plan.walls.filter((w) => w.kind !== 'demolish' && !w.overhead && !w.glassBlock)
  const glass = plan.walls.filter((w) => w.glassBlock)

  const lintels = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number }[] = []
    for (const d of plan.doors) {
      if (d.type === 'swing') {
        const [ax, ay] = dirVec[d.along]
        const [ix, iy] = dirVec[d.into]
        const px = d.hinge.x - ax * 0.02 - ix * 0.02
        const py = d.hinge.y - ay * 0.02 - iy * 0.02
        const host = walls.find((w) => px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h)
        const vertical = d.along === 'n' || d.along === 's'
        const t = host ? (vertical ? host.w : host.h) : 0.17
        const g0x = Math.min(d.hinge.x, d.hinge.x + ax * d.width)
        const g0y = Math.min(d.hinge.y, d.hinge.y + ay * d.width)
        if (vertical) out.push({ x: ix > 0 ? d.hinge.x - t : d.hinge.x, y: g0y, w: t, h: d.width })
        else out.push({ x: g0x, y: iy > 0 ? d.hinge.y - t : d.hinge.y, w: d.width, h: t })
      } else {
        const host = gapHost(walls, d)
        const fallback = d.type === 'sliding' ? 0.1 : d.orientation === 'v' ? 0.17 : T_S
        if (d.orientation === 'v') {
          const t = host?.w ?? fallback
          out.push({ x: host?.x ?? d.x - t / 2, y: d.y, w: t, h: d.length })
        } else {
          const t = host?.h ?? fallback
          out.push({ x: d.x, y: host?.y ?? d.y - t / 2, w: d.length, h: t })
        }
      }
    }
    return out
  }, [plan.doors, walls])

  return (
    <group>
      {walls.map((wall, i) => {
        const color = showWorks && wall.kind === 'new' ? '#f59e0b' : showWorks && wall.kind === 'infill' ? '#fcd34d' : '#f5f2ed'
        const { solid, openings } = splitByWindows(wall, plan.windows, plan.floorRaise ?? 0)
        return (
          <group key={i}>
            {solid.map((r, j) => (
              <Block key={j} {...r} z0={0} z1={Math.min(wall.low ?? top, top)} color={color} />
            ))}
            {openings.map(({ sill, head, ...r }, j) => (
              <group key={`o${j}`}>
                <Block {...r} z0={0} z1={Math.min(sill, top)} color={color} />
                <Block {...r} z0={head} z1={top} color={color} />
                {top > sill && <Glass r={r} bottom={sill} top={Math.min(head, top)} />}
              </group>
            ))}
          </group>
        )
      })}
      {lintels.map((l, i) => (
        <Block key={`l${i}`} {...l} z0={2.05} z1={top} color="#f5f2ed" />
      ))}
      {glass.map((g, i) => (
        <Block key={`g${i}`} {...g} z0={0} z1={Math.min(top, GLASS_BLOCK.h)} color={showWorks ? '#f59e0b' : '#cfe9f1'} opacity={0.55} cast={false} />
      ))}
    </group>
  )
}

function Glass({ r, bottom, top }: { r: { x: number; y: number; w: number; h: number }; bottom: number; top: number }) {
  const horizontal = r.w >= r.h
  const t = 0.03
  const gx = horizontal ? r.x : r.x + r.w / 2 - t / 2
  const gy = horizontal ? r.y + r.h / 2 - t / 2 : r.y
  return (
    <mesh position={[gx + (horizontal ? r.w : t) / 2, (bottom + top) / 2, gy + (horizontal ? t : r.h) / 2]}>
      <boxGeometry args={[horizontal ? r.w : t, top - bottom, horizontal ? t : r.h]} />
      <meshStandardMaterial color="#9fd3ea" transparent opacity={0.35} roughness={0.1} metalness={0.1} depthWrite={false} />
    </mesh>
  )
}

function Floors({ plan }: { plan: Plan }) {
  return (
    <group>
      {plan.rooms.map((room) => (
        <group key={room.id}>
          {room.rects.map((r, i) => (
            <Block key={i} {...r} z0={-0.04} z1={0} color={floorColor[room.tone]} edges={false} cast={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** Partes de `r` fora dos buracos. */
function subtractRects(r: Rect, holes: Rect[]): Rect[] {
  let out = [r]
  for (const h of holes) {
    out = out.flatMap((a) => {
      const x0 = Math.max(a.x, h.x)
      const x1 = Math.min(a.x + a.w, h.x + h.w)
      const y0 = Math.max(a.y, h.y)
      const y1 = Math.min(a.y + a.h, h.y + h.h)
      if (x1 <= x0 || y1 <= y0) return [a]
      return [
        { x: a.x, y: a.y, w: a.w, h: y0 - a.y },
        { x: a.x, y: y1, w: a.w, h: a.y + a.h - y1 },
        { x: a.x, y: y0, w: x0 - a.x, h: y1 - y0 },
        { x: x1, y: y0, w: a.x + a.w - x1, h: y1 - y0 },
      ].filter((p) => p.w > 1e-6 && p.h > 1e-6)
    })
  }
  return out
}

function Ceilings({ plan, height }: { plan: Plan; height: number }) {
  return (
    <group>
      {plan.rooms.map((room) =>
        room.rects
          .flatMap((r) => subtractRects(r, plan.ceilingOpenings ?? []))
          .map((r, i) => <Block key={`${room.id}-${i}`} {...r} z0={height} z1={height + 0.04} color="#f7f4ee" edges={false} cast={false} />),
      )}
    </group>
  )
}

const WOOD = '#b98a5e'

type StairProps<S> = { stair: S; floorToFloor: number; plan: Plan; top: number; showWorks: boolean; arrival: boolean }

/** Espessura do degrau desenhado, como nos outros degraus. */
const TREAD_T = 0.3
/** Faixa do chão do sótão desenhada à chegada quando a laje inteira não aparece. */
const ARRIVAL = 0.9

/** Degrau de planta poligonal (leque), de z0 a z1. */
function Prism({ pts, z0, z1, color }: { pts: { x: number; y: number }[]; z0: number; z1: number; color: string }) {
  const shape = useMemo(() => new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y))), [pts])
  return (
    <mesh rotation-x={Math.PI / 2} position-y={z1} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: z1 - z0, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.85} />
      <Edges color="#6b645c" threshold={20} />
    </mesh>
  )
}

function LStair3D({ stair, floorToFloor, plan, top, showWorks, arrival }: StairProps<LStair>) {
  const { w, bandY, flight1: f, treads1, treads2, going, xTop } = stair
  const fan = stair.winders ?? 0
  const turn = Math.max(1, fan)
  const risers = treads1 + turn + treads2 + 1
  const riser = floorToFloor / risers
  const landing = (treads1 + 1) * riser
  const cornerTop = (treads1 + turn) * riser
  const winders = useMemo(() => (fan ? winderPolys(stair.landing, fan) : []), [stair.landing, fan])
  const blocks = []
  for (let k = 1; k <= treads1; k++) {
    const tread = f.dir === 'n' ? { x: f.x, y: f.y + f.h - k * going, w: f.w, h: going } : { x: f.x + f.w - k * going, y: f.y, w: going, h: f.h }
    blocks.push(<Block key={`a${k}`} {...tread} z0={0} z1={k * riser} color={WOOD} />)
  }
  if (fan) winders.forEach((pts, j) => blocks.push(<Prism key={`w${j}`} pts={pts} z0={0} z1={landing + j * riser} color={WOOD} />))
  else blocks.push(<Block key="land" {...stair.landing} z0={0} z1={landing} color={WOOD} />)
  for (let k = 1; k <= treads2; k++) {
    const z1 = cornerTop + k * riser
    blocks.push(<Block key={`b${k}`} x={w + (k - 1) * going} y={bandY} w={going} h={w} z0={Math.max(0, z1 - 0.3)} z1={z1} color={WOOD} />)
  }
  const fill = stair.underFill
  if (fill) {
    for (let k = 1; k <= treads2; k++) {
      const x0 = Math.max(fill.x0, w + (k - 1) * going)
      const x1 = Math.min(fill.x1 ?? xTop, w + k * going)
      const z1 = cornerTop + k * riser - 0.32
      if (x1 - x0 > 1e-3 && z1 > 0.05) blocks.push(<Block key={`f${k}`} x={x0} y={fill.y} w={x1 - x0} h={fill.h} z0={0} z1={z1} color="#e9dfd0" />)
    }
  }
  const nose = 0.17
  blocks.push(<Block key="top" x={xTop} y={bandY} w={nose} h={w} z0={floorToFloor - riser - TREAD_T} z1={floorToFloor} color={WOOD} />)
  if (arrival && LST.xMax - xTop - nose > 1e-3)
    blocks.push(<Block key="arr" x={xTop + nose} y={bandY} w={LST.xMax - xTop - nose} h={w} z0={floorToFloor - SOFFIT} z1={floorToFloor} color={WOOD} />)

  const ceiling = plan.ceiling ?? 2.55
  const wallColor = showWorks ? '#f59e0b' : '#f5f2ed'
  const panels = plan.walls
    .filter((wl) => wl.overhead)
    .flatMap((wl, i) => {
      const out = []
      for (let k = 1; k <= treads2; k++) {
        const x0 = Math.max(wl.x, w + (k - 1) * going)
        const x1 = Math.min(wl.x + wl.w, w + k * going)
        const z0 = cornerTop + k * riser
        const z1 = Math.min(top, ceiling)
        if (x1 - x0 > 1e-3 && z1 > z0) out.push(<Block key={`p${i}-${k}`} x={x0} y={wl.y} w={x1 - x0} h={wl.h} z0={z0} z1={z1} color={wallColor} />)
      }
      return out
    })

  return (
    <group>
      {blocks}
      {panels}
    </group>
  )
}

function Stair3D({ stair, floorToFloor, plan, top, showWorks, arrival }: StairProps<StraightStair>) {
  const riser = floorToFloor / (stair.treads + 1)
  const bottom = stair.topY + stair.treads * stair.going
  const steps = []
  for (let i = 0; i < stair.treads; i++) {
    const top = (i + 1) * riser
    steps.push(
      <Block key={i} x={stair.x} y={bottom - (i + 1) * stair.going} w={stair.w} h={stair.going} z0={Math.max(0, top - 0.32)} z1={top} color="#b98a5e" />,
    )
  }
  const fill = stair.underFill
  if (fill) {
    for (let i = 0; i < stair.treads; i++) {
      const y0 = Math.max(fill.y0, bottom - (i + 1) * stair.going)
      const y1 = Math.min(fill.y1, bottom - i * stair.going)
      const z1 = Math.min((i + 1) * riser - 0.3, floorToFloor - 0.5)
      if (y1 - y0 > 1e-3 && z1 > 0.05)
        steps.push(<Block key={`f${i}`} x={stair.x + 0.02} y={y0} w={stair.w - 0.04} h={y1 - y0} z0={0} z1={z1} color="#e9dfd0" />)
    }
  }
  const ceiling = plan.ceiling ?? 2.55
  const wallColor = showWorks ? '#f59e0b' : '#f5f2ed'
  const zTop = Math.min(top, ceiling)
  plan.walls
    .filter((wl) => wl.overhead)
    .forEach((wl, j) => {
      for (let i = 0; i < stair.treads; i++) {
        const y0 = Math.max(wl.y, bottom - (i + 1) * stair.going)
        const y1 = Math.min(wl.y + wl.h, bottom - i * stair.going)
        if (y1 - y0 < 1e-3) continue
        const split = Math.min(Math.max(0, (i + 1) * riser - 0.3), zTop)
        if (split > 0.05) steps.push(<Block key={`w${j}-${i}f`} x={wl.x} y={y0} w={wl.w} h={y1 - y0} z0={0} z1={split} color="#e9dfd0" />)
        if (zTop > split) steps.push(<Block key={`w${j}-${i}`} x={wl.x} y={y0} w={wl.w} h={y1 - y0} z0={split} z1={zTop} color={wallColor} />)
      }
    })
  return (
    <group>
      {steps}
      <Block x={stair.x} y={stair.topY - 0.25} w={stair.w} h={0.25} z0={floorToFloor - riser - TREAD_T} z1={floorToFloor} color={WOOD} />
      {arrival && (
        <Block
          x={stair.x}
          y={Math.max(0, stair.topY - 0.25 - ARRIVAL)}
          w={stair.w}
          h={Math.min(ARRIVAL, stair.topY - 0.25)}
          z0={floorToFloor - SOFFIT}
          z1={floorToFloor}
          color={WOOD}
        />
      )}
    </group>
  )
}

function AtticSlab({ plan, floorToFloor }: { plan: Plan; floorToFloor: number }) {
  const z0 = floorToFloor - SOFFIT
  const z1 = floorToFloor
  const parts = useMemo(() => {
    const ops = (plan.ceilingOpenings ?? []).filter((o) => o.w > 0 && o.h > 0)
    const xs = [...new Set([0, W, ...ops.flatMap((o) => [o.x, o.x + o.w])])].sort((a, b) => a - b)
    const ys = [...new Set([0, D, ...ops.flatMap((o) => [o.y, o.y + o.h])])].sort((a, b) => a - b)
    const out: { x: number; y: number; w: number; h: number }[] = []
    for (let j = 0; j < ys.length - 1; j++) {
      let run: { x: number; y: number; w: number; h: number } | null = null
      for (let i = 0; i < xs.length - 1; i++) {
        const mx = (xs[i] + xs[i + 1]) / 2
        const my = (ys[j] + ys[j + 1]) / 2
        const open = ops.some((o) => mx > o.x && mx < o.x + o.w && my > o.y && my < o.y + o.h)
        if (open) {
          if (run) out.push(run)
          run = null
        } else if (run) run.w = xs[i + 1] - run.x
        else run = { x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j] }
      }
      if (run) out.push(run)
    }
    return out
  }, [plan.ceilingOpenings])
  return (
    <group>
      {parts.map((p, i) => (
        <Block key={i} {...p} z0={z0} z1={z1} color="#cbd5e1" opacity={0.28} edges={false} cast={false} />
      ))}
    </group>
  )
}

/** Sótão: parede baixa e telhado de 4 águas, desenhados pelo interior. */
function Roof3D({ floorToFloor }: { floorToFloor: number }) {
  const geometry = useMemo(() => {
    const z0 = floorToFloor + ROOF.knee
    const z1 = floorToFloor + ROOF.ridge
    const h = ROOF.D / 2
    const a: [number, number, number] = [0, z0, 0]
    const b: [number, number, number] = [ROOF.W, z0, 0]
    const c: [number, number, number] = [ROOF.W, z0, ROOF.D]
    const d: [number, number, number] = [0, z0, ROOF.D]
    const r1: [number, number, number] = [h, z1, h]
    const r2: [number, number, number] = [ROOF.W - h, z1, h]
    const tris = [a, b, r2, a, r2, r1, c, d, r1, c, r1, r2, d, a, r1, b, c, r2]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3))
    g.computeVertexNormals()
    return g
  }, [floorToFloor])
  const knee = floorToFloor + ROOF.knee
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#c2410c" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
        <Edges color="#9a3412" threshold={1} />
      </mesh>
      {[
        { x: -0.15, y: -0.15, w: ROOF.W + 0.3, h: 0.15 },
        { x: -0.15, y: ROOF.D, w: ROOF.W + 0.3, h: 0.15 },
        { x: -0.15, y: 0, w: 0.15, h: ROOF.D },
        { x: ROOF.W, y: 0, w: 0.15, h: ROOF.D },
      ].map((p, i) => (
        <Block key={i} {...p} z0={floorToFloor} z1={knee} color="#e7e2d8" opacity={0.35} edges={false} cast={false} />
      ))}
    </group>
  )
}

function Furniture3D({ f, top }: { f: Furniture; top: number }) {
  switch (f.kind) {
    case 'bed': {
      const headW = f.w > f.h
      const pillows = headW
        ? [
            { x: f.x + 0.05, y: f.y + 0.1, w: 0.35, h: f.h / 2 - 0.15 },
            { x: f.x + 0.05, y: f.y + f.h / 2 + 0.05, w: 0.35, h: f.h / 2 - 0.15 },
          ]
        : [
            { x: f.x + 0.1, y: f.y + 0.05, w: f.w / 2 - 0.15, h: 0.35 },
            { x: f.x + f.w / 2 + 0.05, y: f.y + 0.05, w: f.w / 2 - 0.15, h: 0.35 },
          ]
      let head = headW ? { x: f.x, y: f.y, w: 0.06, h: f.h } : { x: f.x, y: f.y, w: f.w, h: 0.06 }
      let throwR = headW ? { x: f.x + f.w - 0.55, y: f.y - 0.01, w: 0.5, h: f.h + 0.02 } : { x: f.x - 0.01, y: f.y + f.h - 0.55, w: f.w + 0.02, h: 0.5 }
      if (headW && f.headEast) {
        const flip = (r: { x: number; y: number; w: number; h: number }) => ({ ...r, x: 2 * f.x + f.w - r.x - r.w })
        pillows.forEach((p, i) => (pillows[i] = flip(p)))
        head = flip(head)
        throwR = flip(throwR)
      }
      if (!headW && f.headSouth) {
        const flip = (r: { x: number; y: number; w: number; h: number }) => ({ ...r, y: 2 * f.y + f.h - r.y - r.h })
        pillows.forEach((p, i) => (pillows[i] = flip(p)))
        head = flip(head)
        throwR = flip(throwR)
      }
      return (
        <group>
          <Block {...f} z0={0} z1={0.5} color="#fbfaf7" />
          <Block {...throwR} z0={0.3} z1={0.52} color="#8a9a7b" edges={false} />
          {pillows.map((p, i) => (
            <Block key={i} {...p} z0={0.5} z1={0.62} color="#ffffff" edges={false} />
          ))}
          <Block {...head} z0={0} z1={1.05} color="#9c7a57" />
        </group>
      )
    }
    case 'nightstand':
      return <Block {...f} z0={0} z1={0.5} color="#a88360" />
    case 'wardrobe':
      return <Block {...f} z0={0} z1={Math.min(top, 2.2)} color="#e9dfd0" />
    case 'desk':
      return (
        <group>
          <Block {...f} z0={0.72} z1={0.76} color="#a88360" />
          <Block x={f.x + 0.6} y={f.y + f.h / 2 - 0.22} w={0.44} h={0.44} z0={0} z1={0.45} color="#57534e" />
        </group>
      )
    case 'shower':
      if (f.walkIn) return <Block {...f} z0={-0.005} z1={0.005} color="#e7eef0" edges={false} cast={false} />
      return (
        <group>
          <Block {...f} z0={0} z1={0.03} color="#f8fafc" edges={false} />
          <Block {...f} z0={0.03} z1={Math.min(top, 2.0)} color="#bfe3f2" opacity={0.18} edges={false} cast={false} />
        </group>
      )
    case 'toilet':
      return (
        <group>
          <Block {...f} z0={0} z1={0.42} color="#ffffff" />
        </group>
      )
    case 'sink':
      return <Block {...f} z0={0} z1={0.86} color="#ffffff" />
    case 'washer':
      return <Block {...f} z0={0} z1={0.85} color="#f1f5f9" />
    case 'shelves':
      return (
        <group>
          {[0.3, 0.7, 1.1, 1.5, 1.9].map((z) => (
            <Block key={z} {...f} z0={z} z1={z + 0.03} color="#b08d68" />
          ))}
        </group>
      )
    default:
      return <Block {...f} z0={0} z1={f.label === 'Cadeirão' ? 0.8 : 0.85} color={f.label === 'Cadeirão' ? '#7c8b6f' : '#b08d68'} />
  }
}

function Context() {
  const y0 = D + T_S
  return (
    <group>
      <Block x={0} y={y0} w={2.88} h={CONTEXT_BOTTOM - y0} z0={-0.04} z1={0} color="#ddd8ce" edges={false} cast={false} />
      <Block x={3.12} y={y0} w={1.94} h={CONTEXT_BOTTOM - y0} z0={-0.04} z1={0} color="#ddd8ce" edges={false} cast={false} />
      {contextWalls.map((w, i) => (
        <Block key={i} {...w} z0={0} z1={0.35} color="#e2ddd4" />
      ))}
    </group>
  )
}

function Scene({ plan, floorToFloor, showFurniture, showWorks, preset, cutWalls }: Props) {
  const ceiling = plan.ceiling ?? 2.55
  const top = !cutWalls ? ceiling : preset === 'escada' ? 1.1 : 1.6
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.2, -0.05, 4]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#e7e2d8" roughness={1} />
      </mesh>
      <Floors plan={plan} />
      {!cutWalls && <Ceilings plan={plan} height={ceiling} />}
      <Walls plan={plan} showWorks={showWorks} top={top} />
      <Context />
      {plan.stair &&
        (plan.stair.kind === 'l' ? (
          <LStair3D stair={plan.stair} floorToFloor={floorToFloor} plan={plan} top={top} showWorks={showWorks} arrival={preset !== 'escada'} />
        ) : (
          <Stair3D stair={plan.stair} floorToFloor={floorToFloor} plan={plan} top={top} showWorks={showWorks} arrival={preset !== 'escada'} />
        ))}
      {plan.stair && preset === 'escada' && <AtticSlab plan={plan} floorToFloor={floorToFloor} />}
      {plan.stair && preset === 'escada' && <Roof3D floorToFloor={floorToFloor} />}
      {showFurniture && plan.furniture.filter((f) => !f.only2d).map((f, i) => <Furniture3D key={i} f={f} top={top} />)}
    </group>
  )
}
