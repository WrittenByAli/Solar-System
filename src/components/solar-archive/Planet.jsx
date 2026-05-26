import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Planet({ data, reveal = 0, timeOffset = 0, mouse, isDark = true }) {
  const groupRef = useRef()
  const meshRef = useRef()
  const atmoRef = useRef()
  const glowRef = useRef()
  const parallax = useRef({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return
    const damp = 1 - Math.exp(-delta * 3.4)
    const mx = mouse?.current?.x ?? 0
    const my = mouse?.current?.y ?? 0
    parallax.current.x = THREE.MathUtils.lerp(parallax.current.x, mx, damp)
    parallax.current.y = THREE.MathUtils.lerp(parallax.current.y, my, damp)

    const t = state.clock.elapsedTime + timeOffset
    const angle = t * data.speed * 0.11
    groupRef.current.position.x = Math.cos(angle) * data.orbit + parallax.current.x * 0.04
    groupRef.current.position.z = Math.sin(angle) * data.orbit
    groupRef.current.position.y = Math.sin(t * 0.38 + timeOffset) * 0.05 + parallax.current.y * 0.03 + data.tilt

    const spin = hovered ? 1.6 : 1
    meshRef.current.rotation.y += delta * 0.28 * spin

    meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
      meshRef.current.material.emissiveIntensity,
      (hovered ? (isDark ? 0.35 : 0.62) : (isDark ? 0.18 : 0.38)) * reveal,
      delta * 4
    )
    const targetScale = hovered ? 1.06 : 1
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 4))

    if (atmoRef.current && data.atmosphere) {
      atmoRef.current.material.opacity = THREE.MathUtils.lerp(
        atmoRef.current.material.opacity,
        reveal * (hovered ? (isDark ? 0.35 : 0.5) : (isDark ? 0.22 : 0.34)),
        delta * 3
      )
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.16 + Math.sin(t * 0.7 + timeOffset) * 0.025 + (hovered ? 0.08 : 0))
      glowRef.current.material.opacity = THREE.MathUtils.lerp(
        glowRef.current.material.opacity,
        reveal * (hovered ? (isDark ? 0.16 : 0.36) : (isDark ? 0.08 : 0.24)),
        delta * 3
      )
    }
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[data.radius, 32, 32]} />
        <meshPhysicalMaterial
          color={data.color}
          emissive={data.emissive}
          emissiveIntensity={0}
          roughness={isDark ? 0.78 : 0.5}
          metalness={isDark ? 0.06 : 0.12}
          clearcoat={data.id === 'earth' ? 0.45 : 0.18}
          sheen={isDark ? 0.1 : 0.36}
          sheenColor={data.atmosphere || data.color}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[data.radius * 1.16, 24, 24]} />
        <meshBasicMaterial
          color={data.atmosphere || data.emissive || data.color}
          transparent
          opacity={0}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {data.atmosphere && (
        <mesh ref={atmoRef}>
          <sphereGeometry args={[data.radius * 1.06, 24, 24]} />
          <meshBasicMaterial color={data.atmosphere} transparent opacity={0} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {data.rings && (
        <>
          <mesh rotation={[Math.PI / 2.35, 0.15, 0]} receiveShadow>
            <ringGeometry args={[data.radius * 1.35, data.radius * 1.85, 64]} />
            <meshStandardMaterial color={isDark ? '#dcc890' : '#f59e0b'} transparent opacity={(isDark ? 0.55 : 0.72) * reveal} side={THREE.DoubleSide} roughness={0.72} metalness={isDark ? 0.05 : 0.16} emissive={isDark ? '#6b4c1b' : '#fb923c'} emissiveIntensity={(isDark ? 0.08 : 0.26) * reveal} />
          </mesh>
          <mesh rotation={[Math.PI / 2.35, 0.15, 0]}>
            <ringGeometry args={[data.radius * 1.9, data.radius * 2.15, 64]} />
            <meshStandardMaterial color={isDark ? '#c8b070' : '#38bdf8'} transparent opacity={(isDark ? 0.28 : 0.48) * reveal} side={THREE.DoubleSide} roughness={0.78} emissive={isDark ? '#4d3c16' : '#0ea5e9'} emissiveIntensity={(isDark ? 0.04 : 0.18) * reveal} />
          </mesh>
        </>
      )}
    </group>
  )
}
