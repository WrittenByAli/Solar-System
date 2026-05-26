import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function OrbitRing({ radius, reveal = 0, color = '#4fc3f7', tilt = 0, isDark = true }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.material.opacity = THREE.MathUtils.lerp(
      ref.current.material.opacity,
      reveal * (isDark ? 0.38 : 0.46),
      delta * 1.6
    )
  })

  return (
    <mesh ref={ref} rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <ringGeometry args={[radius * 0.994, radius * 1.006, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
    </mesh>
  )
}
