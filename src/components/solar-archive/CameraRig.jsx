import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function CameraRig({ scrollProgress = 0, mouse, reveal = 0, shake = 0 }) {
  const { camera, size } = useThree()
  const isMobile = size.width <= 640
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const shakeOffset = useRef(new THREE.Vector3())
  const smoothMouse = useRef({ x: 0, y: 0 })
  const smoothScroll = useRef(scrollProgress)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const damp = 1 - Math.exp(-delta * 2.8)

    smoothScroll.current = THREE.MathUtils.lerp(smoothScroll.current, scrollProgress, damp)
    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, mouse.current.x, damp * 0.85)
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, mouse.current.y, damp * 0.85)

    const sp = smoothScroll.current
    const mx = smoothMouse.current.x
    const my = smoothMouse.current.y

    let targetX, targetY, targetZ

    if (isMobile) {
      // Fixed frontal view on mobile — no orbit, just scroll-driven zoom/pan
      targetX = mx * 0.4
      targetY = 2.2 - sp * 3.2 + my * 0.25
      targetZ = 14.5 - sp * 5.8
    } else {
      const dive = Math.sin(sp * Math.PI) * 3.6
      const baseRadius = 14.5 - sp * 6.5 - dive * 0.55
      const angle = t * 0.055 + sp * 0.85
      targetX = Math.sin(angle) * baseRadius + mx * 0.72
      targetY = 2.4 - dive * 0.65 + Math.sin(t * 0.28) * 0.22 + my * 0.42
      targetZ = Math.cos(angle) * baseRadius - sp * 3.2
    }

    if (shake > 0) {
      shakeOffset.current.set(
        (Math.random() - 0.5) * shake * 0.1,
        (Math.random() - 0.5) * shake * 0.07,
        (Math.random() - 0.5) * shake * 0.05
      )
    } else {
      shakeOffset.current.lerp(new THREE.Vector3(0, 0, 0), damp * 2.5)
    }

    const camDamp = 1 - Math.exp(-delta * 2.2)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX + shakeOffset.current.x, camDamp)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY + shakeOffset.current.y, camDamp)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ + shakeOffset.current.z, camDamp)

    lookAt.current.set(mx * 0.22, my * 0.14 - sp * 0.35, -sp * 1.4)
    camera.lookAt(lookAt.current)

    const fovTarget = 52 - sp * 10 - reveal * 1.2 + Math.abs(shake) * 2
    camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, camDamp)
    camera.updateProjectionMatrix()
  })

  return null
}
