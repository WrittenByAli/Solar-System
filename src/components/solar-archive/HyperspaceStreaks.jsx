import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 140

export default function HyperspaceStreaks({ scrollProgress = 0, scrollVelocity = 0, reveal = 0, isDark = true }) {
  const ref = useRef()
  const speeds = useRef(new Float32Array(COUNT))

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 28
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16
      arr[i * 3 + 2] = -8 - Math.random() * 40
      speeds.current[i] = 0.18 + Math.random() * 0.46
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const attr = ref.current.geometry.attributes.position
    const warp = 0.22 + scrollProgress * 1.25 + Math.abs(scrollVelocity) * 3.5
    const opacityTarget = reveal * ((isDark ? 0.12 : 0.06) + scrollProgress * (isDark ? 0.3 : 0.18) + Math.abs(scrollVelocity) * (isDark ? 0.9 : 0.5))

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      attr.array[i3 + 2] += speeds.current[i] * warp * delta * 3.2
      if (attr.array[i3 + 2] > 6) {
        attr.array[i3 + 2] = -12 - Math.random() * 30
        attr.array[i3] = (Math.random() - 0.5) * 28
        attr.array[i3 + 1] = (Math.random() - 0.5) * 16
      }
    }
    attr.needsUpdate = true
    ref.current.material.opacity = THREE.MathUtils.lerp(
      ref.current.material.opacity,
      Math.min(0.48, opacityTarget),
      delta * 2
    )
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045 + scrollProgress * 0.024}
        color={isDark ? '#8ecfff' : '#0369a1'}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
