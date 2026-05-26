import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Starfield3D from './Starfield3D.jsx'
import DustParticles from './DustParticles.jsx'
import OrbitRing from './OrbitRing.jsx'
import Planet from './Planet.jsx'
import Sun, { sunRadiationLevel } from './Sun.jsx'
import Meteoroid from './Meteoroid.jsx'
import CameraRig from './CameraRig.jsx'
import HyperspaceStreaks from './HyperspaceStreaks.jsx'
import ParallaxGroup from './ParallaxGroup.jsx'
import ScrollEnergyRings from './ScrollEnergyRings.jsx'
import { PLANETS, METEOROIDS } from './planetData.js'

const DARK_ORBIT_COLORS = ['#4fc3f7', '#a78bfa', '#f5a623', '#38bdf8']
const LIGHT_ORBIT_COLORS = ['#f59e0b', '#d97706', '#fbbf24', '#b45309']

function SceneContent({ reveal, scrollProgress, scrollVelocity, mouse, shake, isDark }) {
  const radiation = sunRadiationLevel(reveal, scrollProgress)
  const fogNear = isDark ? 3 + (1 - radiation) * 8 - scrollProgress * 0.8 : 9 + (1 - radiation) * 5
  const fogFar = isDark ? 22 + radiation * 32 + scrollProgress * 10 : 42 + radiation * 28
  const bgColor = isDark ? '#010108' : '#edf6ff'
  const fogColor = isDark ? '#030818' : '#f8fbff'
  const orbitColors = isDark ? DARK_ORBIT_COLORS : LIGHT_ORBIT_COLORS

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <ambientLight intensity={isDark ? 0.04 + radiation * 0.22 : 0.42 + radiation * 0.34} />
      <hemisphereLight color={isDark ? '#3d2510' : '#fff5dd'} groundColor={isDark ? '#020208' : '#cfe7ff'} intensity={isDark ? 0.06 + radiation * 0.42 : 0.32 + radiation * 0.58} />
      <directionalLight position={[8, 6, 4]} intensity={isDark ? 0.04 + radiation * 0.18 : 0.42 + radiation * 0.24} color={isDark ? '#ffcc88' : '#ffffff'} castShadow />

      <CameraRig scrollProgress={scrollProgress} mouse={mouse} reveal={reveal} shake={shake} />

      <Starfield3D reveal={reveal} scrollProgress={scrollProgress} isDark={isDark} />
      <HyperspaceStreaks scrollProgress={scrollProgress} scrollVelocity={scrollVelocity} reveal={reveal} isDark={isDark} />
      <DustParticles mouse={mouse} reveal={reveal} scrollVelocity={scrollVelocity} isDark={isDark} />
      <ScrollEnergyRings scrollProgress={scrollProgress} reveal={reveal} isDark={isDark} />

      <ParallaxGroup mouse={mouse} scrollProgress={scrollProgress}>
        <Sun reveal={reveal} scrollProgress={scrollProgress} mouse={mouse} isDark={isDark} />

        {PLANETS.map((planet, i) => (
          <group key={planet.id}>
            <OrbitRing
              radius={planet.orbit}
              reveal={reveal * (1 + scrollProgress * 0.3)}
              color={orbitColors[i % orbitColors.length]}
              tilt={planet.tilt}
              isDark={isDark}
            />
            <Planet data={planet} reveal={reveal} timeOffset={i * 1.6} mouse={mouse} isDark={isDark} />
          </group>
        ))}

        {METEOROIDS.map((m) => (
          <Meteoroid
            key={m.id}
            data={m}
            scrollProgress={scrollProgress}
            reveal={reveal}
            timeOffset={m.id * 0.8}
          />
        ))}
      </ParallaxGroup>

      <mesh rotation={[Math.PI / 2, scrollProgress * 0.4, 0]}>
        <ringGeometry args={[5.7, 7.1, 96]} />
        <meshBasicMaterial
          color={isDark ? '#6b5d52' : '#d97706'}
          transparent
          opacity={(isDark ? 0.04 : 0.18) * reveal + scrollProgress * (isDark ? 0.06 : 0.2)}
          side={2}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export default function SolarSystemScene({ reveal, scrollProgress, scrollVelocity, mouse, shake, isDark = true }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
  return (
    <Canvas
      dpr={isMobile ? [1, 1] : [1, 1.75]}
      shadows={!isMobile}
      camera={{ position: [0, 2.5, 20], fov: 50, near: 0.1, far: 90 }}
      gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'auto' }}
    >
      <Suspense fallback={null}>
        <SceneContent
          reveal={reveal}
          scrollProgress={scrollProgress}
          scrollVelocity={scrollVelocity}
          mouse={mouse}
          shake={shake}
          isDark={isDark}
        />
      </Suspense>
    </Canvas>
  )
}
