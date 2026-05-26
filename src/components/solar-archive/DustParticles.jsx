import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 160

export default function DustParticles({ mouse, reveal = 0, scrollVelocity = 0, isDark = true }) {
  const ref = useRef()
  const base = useRef()

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24
    }
    base.current = pos.slice()
    return pos
  }, [])

  useFrame((state, delta) => {
    if (!ref.current || !base.current) return
    const attr = ref.current.geometry.attributes.position
    const t = state.clock.elapsedTime
    const mx = mouse.current.x * 2.5
    const my = mouse.current.y * 1.6
    const drift = 0.55 + Math.abs(scrollVelocity || 0) * 2.5

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      const bx = base.current[i3]
      const by = base.current[i3 + 1]
      const bz = base.current[i3 + 2]
      const dx = bx - mx
      const dy = by - my
      const dist = Math.sqrt(dx * dx + dy * dy + bz * bz) + 0.01
      const pull = 0.4 / dist
      attr.array[i3] = bx + Math.sin(t * 0.12 + i) * 0.035 * drift + dx * pull * 0.06
      attr.array[i3 + 1] = by + Math.cos(t * 0.1 + i) * 0.026 * drift + dy * pull * 0.05
      attr.array[i3 + 2] = bz + Math.sin(t * 0.08 + i) * 0.03 * drift
    }
    attr.needsUpdate = true
    ref.current.material.opacity = THREE.MathUtils.lerp(ref.current.material.opacity, reveal * (isDark ? 0.28 : 0.18), delta * 0.9)
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.026} color={isDark ? '#7eb8ff' : '#0ea5e9'} transparent opacity={0} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
