"use client"
import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause } from 'lucide-react'
import { useTranslation } from '@/components/DictionaryProvider'

interface ExerciseDemo3DProps {
  primaryJoint: string // e.g. "mixamorigLeftArm"
  startAngle: number   // degrees
  targetAngle: number  // degrees
  axis: 'x' | 'y' | 'z'
}

function Model({ primaryJoint, startAngle, targetAngle, axis, isPlaying }: ExerciseDemo3DProps & { isPlaying: boolean }) {
  const { scene } = useGLTF('/models/Soldier.glb')
  const jointRef = useRef<THREE.Bone | null>(null)
  
  // Find the bone on mount
  useEffect(() => {
    let foundBone = null
    scene.traverse((object) => {
      if ((object as THREE.Bone).isBone && object.name === primaryJoint) {
        foundBone = object
      }
    })
    jointRef.current = foundBone as THREE.Bone | null
  }, [scene, primaryJoint])

  useFrame((state) => {
    if (!jointRef.current || !isPlaying) return

    // Create a smooth looping value between 0 and 1
    // Math.sin oscillates between -1 and 1. We map it to 0..1
    const t = (Math.sin(state.clock.elapsedTime * 1.5) + 1) / 2
    
    const startRad = THREE.MathUtils.degToRad(startAngle)
    const targetRad = THREE.MathUtils.degToRad(targetAngle)
    
    // Lerp between start and target
    const currentAngle = THREE.MathUtils.lerp(startRad, targetRad, t)

    if (axis === 'x') jointRef.current.rotation.x = currentAngle
    if (axis === 'y') jointRef.current.rotation.y = currentAngle
    if (axis === 'z') jointRef.current.rotation.z = currentAngle
  })

  // Basic styling for the material to make it look clean/clinical
  useEffect(() => {
    scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh
        // Create a neutral, semi-matte material
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#e2e8f0', // slate-200
          roughness: 0.6,
          metalness: 0.1,
        })
      }
    })
  }, [scene])

  return <primitive object={scene} position={[0, -1, 0]} />
}

export function ExerciseDemo3D({ primaryJoint, startAngle, targetAngle, axis }: ExerciseDemo3DProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useTranslation()

  return (
    <div className="relative w-full h-[300px] bg-ink/5 rounded-2xl overflow-hidden border border-line mb-8">
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 5, 2]} intensity={2} />
        <directionalLight position={[-2, -5, -2]} intensity={0.5} />
        
        <Model 
          primaryJoint={primaryJoint} 
          startAngle={startAngle} 
          targetAngle={targetAngle} 
          axis={axis}
          isPlaying={isPlaying}
        />
        
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
  useGLTF.preload('/models/Soldier.glb')
}
