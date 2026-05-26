import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ParallaxGroup({ mouse, scrollProgress = 0, children }) {
  const groupRef = useRef()
  const smooth = useRef({ x: 0, y: 0 })
  const smoothScale = useRef(1)

  useFrame((_, delta) => {
    if (!groupRef.current || !mouse?.current) return
    const damp = 1 - Math.exp(-delta * 3.4)

    smooth.current.x = THREE.MathUtils.lerp(smooth.current.x, mouse.current.x, damp)
    smooth.current.y = THREE.MathUtils.lerp(smooth.current.y, mouse.current.y, damp)

    const targetScale = 1 + scrollProgress * 0.14
    smoothScale.current = THREE.MathUtils.lerp(smoothScale.current, targetScale, damp)

    groupRef.current.position.set(smooth.current.x * 0.34, smooth.current.y * 0.24, scrollProgress * -0.6)
    groupRef.current.rotation.y = smooth.current.x * 0.04 + scrollProgress * 0.12
    groupRef.current.rotation.x = smooth.current.y * -0.025
    groupRef.current.scale.setScalar(smoothScale.current)
  })

  return <group ref={groupRef}>{children}</group>
}
