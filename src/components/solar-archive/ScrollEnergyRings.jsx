import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ScrollEnergyRings({ scrollProgress = 0, reveal = 0, isDark = true }) {
  const ring1 = useRef()
  const ring2 = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const pulse = scrollProgress

    if (ring1.current) {
      ring1.current.rotation.x = Math.PI / 2 + t * 0.08
      ring1.current.rotation.z = t * 0.12 + pulse * 2
      const s = 6 + pulse * 4 + Math.sin(t * 1.4) * 0.2
      ring1.current.scale.set(s, s, s)
      ring1.current.material.opacity = THREE.MathUtils.lerp(
        ring1.current.material.opacity,
        reveal * ((isDark ? 0.08 : 0.12) + pulse * (isDark ? 0.22 : 0.32)),
        delta * 3
      )
    }
    if (ring2.current) {
      ring2.current.rotation.x = Math.PI / 2.4
      ring2.current.rotation.y = t * 0.18 - pulse * 1.5
      const s2 = 8.5 + pulse * 5
      ring2.current.scale.set(s2, s2, s2)
      ring2.current.material.opacity = THREE.MathUtils.lerp(
        ring2.current.material.opacity,
        reveal * ((isDark ? 0.04 : 0.08) + pulse * (isDark ? 0.14 : 0.24)),
        delta * 3
      )
    }
  })

  return (
    <group>
      <mesh ref={ring1}>
        <torusGeometry args={[1, 0.012, 8, 128]} />
        <meshBasicMaterial color={isDark ? '#4fc3f7' : '#f59e0b'} transparent opacity={0} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[1, 0.008, 8, 128]} />
        <meshBasicMaterial color={isDark ? '#a78bfa' : '#d97706'} transparent opacity={0} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
