"use client"
import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useFBX, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause } from 'lucide-react'
import { useTranslation } from '@/components/DictionaryProvider'

export type Demo3DConfig = {
  boneName: string;
  rotationAxis: "x" | "y" | "z";
  rotationDirection: 1 | -1;
  startAngleDeg: number;
  targetAngleDeg: number;
  useQuaternionSlerp: boolean;
};

interface ExerciseDemo3DProps {
  config: Demo3DConfig;
}

function Model({ config, isPlaying }: ExerciseDemo3DProps & { isPlaying: boolean }) {
  const fbx = useFBX('/models/tracksuit.fbx')
  const jointRef = useRef<THREE.Bone | null>(null)
  const initialQuatRef = useRef<THREE.Quaternion | null>(null)
  
  // Set to true to force a static target pose for verifying the axis and bone name.
  // Set to false to run the full smooth loop.
  const debugStaticPose = true; 
  
  // Find the bone on mount
  useEffect(() => {
    let foundBone = null
    fbx.traverse((object) => {
      // FBX files often add prefixes like "Namespace:" to node names
      // We must match exactly the bone name (or namespace + bone name), but NEVER match a child bone like "RightForeArm" when looking for "RightArm"
      if (object.name === config.boneName || object.name.endsWith(':' + config.boneName)) {
        foundBone = object
      }
    })
    jointRef.current = foundBone as THREE.Bone | null
    if (foundBone) {
      initialQuatRef.current = (foundBone as THREE.Bone).quaternion.clone()
    }

    // DEBUG: Add SkeletonHelper to visually debug bone rotations vs skinning
    const helper = new THREE.SkeletonHelper(fbx)
    fbx.add(helper)
    return () => {
      fbx.remove(helper)
    }
  }, [fbx, config.boneName])

  useFrame((state) => {
    if (!jointRef.current || !initialQuatRef.current) return

    // If not in debug mode, respect the playing state. If paused, lock to start position (progress = 0)
    const time = state.clock.elapsedTime
    const progress = (debugStaticPose || !isPlaying) ? 0 : (Math.sin(time * 1.5) + 1) / 2
    
    // In debugStaticPose mode, we override progress to 1 so it holds at targetAngle.
    const effectiveProgress = debugStaticPose ? 1 : progress;

    const startRad = THREE.MathUtils.degToRad(config.startAngleDeg)
    const targetRad = THREE.MathUtils.degToRad(config.targetAngleDeg)
    
    // Lerp angle based on progress and apply direction multiplier
    const currentAngle = THREE.MathUtils.lerp(startRad, targetRad, effectiveProgress)
    const delta = (currentAngle - startRad) * config.rotationDirection;

    const axisVec = new THREE.Vector3(
      config.rotationAxis === 'x' ? 1 : 0,
      config.rotationAxis === 'y' ? 1 : 0,
      config.rotationAxis === 'z' ? 1 : 0
    )
    
    // Create quaternion for the local delta rotation
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, delta)
    
    // Apply local delta to the initial rest quaternion
    if (config.useQuaternionSlerp) {
        jointRef.current.quaternion.copy(initialQuatRef.current).multiply(deltaQuat)
    }
  })

  // Enable shadow casting for realism
  useEffect(() => {
    fbx.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [fbx])

  return <primitive object={fbx} position={[0, -1, 0]} scale={0.01} />
}

export function ExerciseDemo3D({ config }: ExerciseDemo3DProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useTranslation()

  return (
    <div className="relative w-full h-[300px] bg-ink/5 rounded-2xl overflow-hidden border border-line mb-8">
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 5, 2]} intensity={2} />
        <directionalLight position={[-2, -5, -2]} intensity={0.5} />
        
        <React.Suspense fallback={null}>
          <Model 
            config={config}
            isPlaying={isPlaying}
          />
        </React.Suspense>
        
        {/* Orbit controls limited to prevent getting lost */}
        <OrbitControls 
          enablePan={false}
          minDistance={2}
          maxDistance={5}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>

      {/* Play/Pause Overlay */}
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute bottom-4 right-4 bg-paper/80 backdrop-blur-sm p-3 rounded-full shadow-sm border border-line text-ink hover:bg-paper transition-colors"
        aria-label={isPlaying ? t("Pause Animation") : t("Play Animation")}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      
      {/* Label Overlay */}
      <div className="absolute top-4 left-4 bg-paper/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-line flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-recovery animate-pulse" />
        <span className="font-sans text-xs font-medium text-ink uppercase tracking-wide">
          {t("Clinical Range Demo")}
        </span>
      </div>
    </div>
  )
}

// Preload the model
if (typeof window !== 'undefined') {
  useFBX.preload('/models/tracksuit.fbx')
}
