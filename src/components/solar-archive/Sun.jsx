import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN } from './planetData.js'

/** 0 at journey start → 1 at final scroll — sun saves full output for the end */
export function sunRadiationLevel(reveal = 0, scrollProgress = 0) {
  const scroll = Math.pow(Math.max(0, Math.min(1, scrollProgress)), 1.45)
  return Math.max(0, Math.min(1, reveal * (0.1 + scroll * 0.9)))
}

export default function Sun({ reveal = 0, scrollProgress = 0, mouse, isDark = true }) {
  const groupRef = useRef()
  const coreRef = useRef()
  const coronaRef = useRef()
  const outerCoronaRef = useRef()
  const radiationShellRef = useRef()
  const lightRef = useRef()
  const parallax = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    const damp = 1 - Math.exp(-delta * 3.4)
    const mx = mouse?.current?.x ?? 0
    const my = mouse?.current?.y ?? 0
    parallax.current.x = THREE.MathUtils.lerp(parallax.current.x, mx, damp)
    parallax.current.y = THREE.MathUtils.lerp(parallax.current.y, my, damp)

    if (groupRef.current) {
      groupRef.current.position.set(parallax.current.x * 0.1, parallax.current.y * 0.06, 0)
    }

    const t = state.clock.elapsedTime
    const radiation = sunRadiationLevel(reveal, scrollProgress)
    const finale = Math.pow(Math.max(0, scrollProgress - 0.82) / 0.18, 2)
    const pulse = 1 + Math.sin(t * 1.2) * 0.05 + finale * 0.04

    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse * (0.48 + radiation * 0.52))
      coreRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        coreRef.current.material.emissiveIntensity,
        ((isDark ? 0.55 : 0.78) + Math.sin(t * 1.8) * 0.12 + finale * 0.25) * radiation,
        delta * 2.5
      )
    }
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1.45 + Math.sin(t * 0.85) * 0.08 + radiation * 0.35 + finale * 0.2)
      coronaRef.current.material.opacity = THREE.MathUtils.lerp(
        coronaRef.current.material.opacity,
        radiation * (isDark ? 0.38 : 0.34) + finale * (isDark ? 0.22 : 0.18),
        delta * 2
      )
    }
    if (outerCoronaRef.current) {
      outerCoronaRef.current.scale.setScalar(2.1 + radiation * 0.85 + finale * 0.45 + Math.sin(t * 0.6) * 0.06)
      outerCoronaRef.current.material.opacity = THREE.MathUtils.lerp(
        outerCoronaRef.current.material.opacity,
        radiation * (isDark ? 0.22 : 0.24) + finale * (isDark ? 0.28 : 0.2),
        delta * 1.8
      )
    }
    if (radiationShellRef.current) {
      radiationShellRef.current.scale.setScalar(3.2 + radiation * 1.4 + finale * 0.9)
      radiationShellRef.current.material.opacity = THREE.MathUtils.lerp(
        radiationShellRef.current.material.opacity,
        Math.max(0, radiation - 0.35) * (isDark ? 0.18 : 0.2) + finale * (isDark ? 0.32 : 0.22),
        delta * 1.6
      )
    }
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        radiation * ((isDark ? 2.2 : 3.1) + Math.sin(t * 1.4) * 0.35) + finale * (isDark ? 2.8 : 3.4),
        delta * 2
      )
      lightRef.current.distance = THREE.MathUtils.lerp(lightRef.current.distance, 28 + radiation * 24 + finale * 16, delta * 1.5)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef} castShadow>
        <sphereGeometry args={[SUN.radius, 48, 48]} />
        <meshPhysicalMaterial
          color={SUN.color}
          emissive={SUN.emissive}
          emissiveIntensity={0}
          roughness={0.45}
          metalness={0.05}
          clearcoat={0.2}
        />
      </mesh>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[SUN.radius * 1.45, 32, 32]} />
        <meshBasicMaterial color={isDark ? '#fbbf24' : '#f59e0b'} transparent opacity={0} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
      </mesh>
      <mesh ref={outerCoronaRef}>
        <sphereGeometry args={[SUN.radius * 2.1, 24, 24]} />
        <meshBasicMaterial color={isDark ? '#f59e0b' : '#d97706'} transparent opacity={0} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
      </mesh>
      <mesh ref={radiationShellRef}>
        <sphereGeometry args={[SUN.radius * 2.8, 16, 16]} />
        <meshBasicMaterial color={isDark ? '#facc15' : '#b45309'} transparent opacity={0} blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <pointLight ref={lightRef} color={isDark ? '#ffb86a' : '#f59e0b'} intensity={0} distance={32} decay={1.35} castShadow shadow-mapSize={[512, 512]} />
    </group>
  )
}
