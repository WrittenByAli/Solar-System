import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SHARD_COUNT = 14

function makeRockGeometry(size, seed) {
  const geo = new THREE.DodecahedronGeometry(size, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i)
    const ny = pos.getY(i)
    const nz = pos.getZ(i)
    const n = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
    const noise = 0.78 + (n - Math.floor(n)) * 0.38
    pos.setXYZ(i, nx * noise, ny * noise, nz * noise)
  }
  geo.computeVertexNormals()
  return geo
}

function spawnShards(size, seed) {
  return Array.from({ length: SHARD_COUNT }, (_, i) => {
    const angle = (i / SHARD_COUNT) * Math.PI * 2 + seed
    const elevation = (Math.random() - 0.5) * 1.2
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation) * 0.8 + 0.2,
      Math.sin(angle) * Math.cos(elevation)
    ).normalize()

    return {
      velocity: dir.multiplyScalar(1.2 + Math.random() * 2.4),
      angular: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ),
      scale: size * (0.12 + Math.random() * 0.22),
      offset: dir.clone().multiplyScalar(size * 0.15),
      geo: makeRockGeometry(size * (0.12 + Math.random() * 0.18), seed + i * 0.7),
    }
  })
}

export default function Meteoroid({ data, scrollProgress, reveal, timeOffset = 0 }) {
  const groupRef = useRef()
  const coreRef = useRef()
  const [broken, setBroken] = useState(false)
  const [shards, setShards] = useState(null)
  const shardRefs = useRef([])
  const dustRef = useRef()
  const breakTime = useRef(0)

  const rockGeo = useMemo(() => makeRockGeometry(data.size, data.id * 1.37), [data.size, data.id])
  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6b5d52',
        emissive: '#2a2218',
        emissiveIntensity: 0.15,
        roughness: 0.92,
        metalness: 0.08,
        flatShading: true,
      }),
    []
  )

  useEffect(() => {
    if (!broken && scrollProgress >= data.breakAt && reveal > 0.85) {
      setBroken(true)
      setShards(spawnShards(data.size, data.id))
      breakTime.current = performance.now()
    }
  }, [scrollProgress, data.breakAt, data.size, data.id, broken, reveal])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime + timeOffset
    const angle = data.angle + t * data.spin * 0.05
    groupRef.current.position.x = Math.cos(angle) * data.orbit
    groupRef.current.position.z = Math.sin(angle) * data.orbit
    groupRef.current.position.y = data.y + Math.sin(t * 0.55 + data.id) * 0.04

    if (!broken && coreRef.current) {
      coreRef.current.rotation.x += delta * data.spin * 0.4
      coreRef.current.rotation.y += delta * data.spin * 0.55
      const s = reveal * (1 - Math.max(0, scrollProgress - data.breakAt + 0.05) * 0.3)
      coreRef.current.scale.setScalar(Math.max(0.001, s))
      coreRef.current.material.emissiveIntensity = 0.12 + Math.sin(t * 2) * 0.04
    }

    if (broken && shards) {
      const elapsed = (performance.now() - breakTime.current) / 1000
      shardRefs.current.forEach((mesh, i) => {
        if (!mesh) return
        const shard = shards[i]
        shard.velocity.y -= delta * 0.35
        mesh.position.addScaledVector(shard.velocity, delta)
        mesh.rotation.x += shard.angular.x * delta
        mesh.rotation.y += shard.angular.y * delta
        mesh.rotation.z += shard.angular.z * delta
        const fade = Math.max(0, 1 - elapsed * 0.55)
        mesh.material.opacity = fade * 0.95
        mesh.scale.setScalar(shard.scale * (0.6 + fade * 0.4))
      })

      if (dustRef.current) {
        dustRef.current.material.opacity = Math.max(0, 0.5 - elapsed * 0.8)
        dustRef.current.scale.setScalar(1 + elapsed * 2.5)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {!broken && (
        <mesh ref={coreRef} geometry={rockGeo} material={rockMat} castShadow receiveShadow />
      )}

      {broken && shards && (
        <>
          {shards.map((shard, i) => (
            <mesh
              key={i}
              ref={(el) => { shardRefs.current[i] = el }}
              geometry={shard.geo}
              position={shard.offset}
              castShadow
            >
              <meshStandardMaterial
                color="#5a4f45"
                emissive="#1a1510"
                emissiveIntensity={0.2}
                roughness={0.95}
                metalness={0.05}
                flatShading
                transparent
                opacity={0.95}
              />
            </mesh>
          ))}
          <mesh ref={dustRef}>
            <sphereGeometry args={[data.size * 0.5, 8, 8]} />
            <meshBasicMaterial
              color="#8a7a68"
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
