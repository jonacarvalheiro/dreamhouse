import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cameraPresets, type CameraPreset } from './cameraPresets'
import type { Dir, Plan, Rect, Wall } from '@/plan/types'

const EYE = 1.6
const RADIUS = 0.22
const SPEED = 2.4
const SPRINT = 4.2

const dirVec: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }

function doorGaps(plan: Plan): Rect[] {
  const walls = plan.walls.filter((w) => w.kind !== 'demolish' && !w.overhead && !w.glassBlock)
  const out: Rect[] = []
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
    } else if (d.type === 'sliding') {
      if (d.orientation === 'v') out.push({ x: d.x - 0.08, y: d.y, w: 0.16, h: d.length })
      else out.push({ x: d.x, y: d.y - 0.08, w: d.length, h: 0.16 })
    } else if (d.orientation === 'v') {
      out.push({ x: d.x - 0.1, y: d.y, w: 0.2, h: d.length })
    } else {
      out.push({ x: d.x, y: d.y - 0.1, w: d.length, h: 0.2 })
    }
  }
  return out
}

function contains(r: Rect, x: number, y: number, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad
}

function inGap(gaps: Rect[], x: number, z: number) {
  return gaps.some((g) => contains(g, x, z, 0.06))
}

function insideRooms(plan: Plan, x: number, z: number) {
  return plan.rooms.some((room) => room.rects.some((r) => contains(r, x, z, 0.08)))
}

function collide(x: number, z: number, walls: Wall[], gaps: Rect[]) {
  let px = x
  let pz = z
  for (const w of walls) {
    if (inGap(gaps, px, pz)) continue
    const nearestX = Math.min(Math.max(px, w.x), w.x + w.w)
    const nearestZ = Math.min(Math.max(pz, w.y), w.y + w.h)
    const dx = px - nearestX
    const dz = pz - nearestZ
    const d2 = dx * dx + dz * dz
    if (d2 >= RADIUS * RADIUS) continue
    if (d2 < 1e-8) {
      const left = px - w.x
      const right = w.x + w.w - px
      const top = pz - w.y
      const bottom = w.y + w.h - pz
      const m = Math.min(left, right, top, bottom)
      if (m === left) px = w.x - RADIUS
      else if (m === right) px = w.x + w.w + RADIUS
      else if (m === top) pz = w.y - RADIUS
      else pz = w.y + w.h + RADIUS
      continue
    }
    const d = Math.sqrt(d2)
    px = nearestX + (dx / d) * RADIUS
    pz = nearestZ + (dz / d) * RADIUS
  }
  return { x: px, z: pz }
}

function spawnFor(preset: CameraPreset, plan: Plan) {
  const hall = plan.rooms.find((r) => r.id === 'hall' || r.id === 'atrio')
  const room =
    preset === 'suite'
      ? plan.rooms.find((r) => r.id === 'suite')
      : preset === 'quarto2'
        ? plan.rooms.find((r) => r.id === 'quarto2')
        : preset === 'escada'
          ? plan.rooms.find((r) => r.id === 'escada') ?? plan.rooms.find((r) => r.id === 'atrio')
          : hall
  const look = cameraPresets[preset].target
  if (room) {
    return { x: room.label.x, z: room.label.y, lookX: look[0], lookZ: look[2] }
  }
  return { x: 4.2, z: 3.2, lookX: look[0], lookZ: look[2] }
}

export function WalkControls({ plan, preset }: { plan: Plan; preset: CameraPreset }) {
  const { camera } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const keys = useRef(new Set<string>())
  const last = useRef({ x: 4.2, z: 3.2 })
  const walls = useMemo(
    () => plan.walls.filter((w) => w.kind !== 'demolish' && !w.overhead),
    [plan.walls],
  )
  const gaps = useMemo(() => doorGaps(plan), [plan])

  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current.add(e.code)
    const off = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', on)
    window.addEventListener('keyup', off)
    return () => {
      window.removeEventListener('keydown', on)
      window.removeEventListener('keyup', off)
    }
  }, [])

  useEffect(() => {
    const s = spawnFor(preset, plan)
    last.current = { x: s.x, z: s.z }
    cam.position.set(s.x, EYE, s.z)
    cam.lookAt(s.lookX, EYE, s.lookZ)
    cam.fov = 68
    cam.updateProjectionMatrix()
  }, [preset, plan, cam])

  useFrame((_, dt) => {
    const k = keys.current
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const right = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    if (!forward && !right) return
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT : SPEED) * Math.min(dt, 0.05)
    const front = new THREE.Vector3()
    cam.getWorldDirection(front)
    front.y = 0
    if (front.lengthSq() < 1e-6) front.set(0, 0, 1)
    front.normalize()
    const side = new THREE.Vector3().crossVectors(front, camera.up).normalize()
    let x = cam.position.x + front.x * forward * speed + side.x * right * speed
    let z = cam.position.z + front.z * forward * speed + side.z * right * speed
    const hit = collide(x, z, walls, gaps)
    x = hit.x
    z = hit.z
    if (!insideRooms(plan, x, z) && !inGap(gaps, x, z)) {
      x = last.current.x
      z = last.current.z
    } else {
      last.current = { x, z }
    }
    cam.position.set(x, EYE, z)
  })

  return <PointerLockControls makeDefault />
}
