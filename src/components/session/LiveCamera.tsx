"use client"

import * as React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { ExerciseEngine, ExerciseType, ExerciseState } from "@/lib/exercises/engine"
import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { Button } from "@/components/ui/button"
import { Point3D } from "@/lib/exercises/angles"

interface LiveCameraProps {
  exerciseType: ExerciseType
  onSessionComplete: (finalState: { reps: number; maxAngle: number; formWarning: string | null }) => void
  targetModifier?: { message: string, repModifier: number, romModifier: number } | null
}

export function LiveCamera({ exerciseType, onSessionComplete, targetModifier }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [engine] = useState(() => new ExerciseEngine(exerciseType))
  const [state, setState] = useState<ExerciseState>(engine.state)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overallMaxAngle, setOverallMaxAngle] = useState(0)

  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const requestRef = useRef<number>(null)
  const lastVideoTimeRef = useRef<number>(-1)

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
    } catch (err) {
      console.error(err)
      setError("Camera access denied or unavailable.")
    }
  }

  const initMediaPipe = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      })
      landmarkerRef.current = landmarker
      setIsInitializing(false)
    } catch (err) {
      console.error(err)
      setError("Failed to initialize tracking models.")
    }
  }

  const renderLoop = useCallback(() => {
    if (videoRef.current && landmarkerRef.current && videoRef.current.readyState >= 2) {
      const startTimeMs = performance.now()
      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime
        const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs)
        
        if (results.landmarks && results.landmarks.length > 0) {
          // Map to Point3D
          const rawLandmarks = results.landmarks[0]
          const mappedLandmarks: Point3D[] = rawLandmarks.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }))

          const newState = engine.processLandmarks(mappedLandmarks)
          setState({ ...newState })
          
          if (newState.currentAngle > overallMaxAngle) {
            setOverallMaxAngle(newState.currentAngle)
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(renderLoop)
  }, [engine, overallMaxAngle])

  useEffect(() => {
    initCamera()
    initMediaPipe()

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      if (landmarkerRef.current) landmarkerRef.current.close()
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (!isInitializing && !error) {
      requestRef.current = requestAnimationFrame(renderLoop)
    }
  }, [isInitializing, error, renderLoop])

  const handleEndSession = () => {
    onSessionComplete({
      reps: state.reps,
      maxAngle: overallMaxAngle,
      formWarning: state.formWarning,
    })
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-paper p-6 text-center text-signal">
        <p className="font-sans text-base">{error}</p>
      </div>
    )
  }

  const baseTargetAngle = exerciseType === "KneeFlexion" ? 135 : 180
  const targetAngle = baseTargetAngle * (targetModifier?.romModifier || 1.0)

  return (
    <div className="relative flex h-full w-full flex-col bg-ink overflow-hidden">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />

      {/* Overlay UI Layer */}
      <div className="absolute inset-0 flex flex-col p-6 z-10">
        
        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-paper/60 uppercase tracking-wide">
              {exerciseType}
            </span>
            <span className="font-serif text-3xl text-paper">
              {state.reps} <span className="font-sans text-lg text-paper/70">reps</span>
            </span>
          </div>
          <Button variant="outline" className="text-paper border-paper/30 hover:bg-paper/10" onClick={handleEndSession}>
            End Session
          </Button>
        </div>

        {/* Target Modifier Message */}
        {targetModifier && (
          <div className="mt-4 w-full flex justify-center">
            <div className="rounded-md bg-signal/90 px-4 py-2 text-paper shadow-lg font-sans text-sm font-medium max-w-sm text-center">
              {targetModifier.message}
            </div>
          </div>
        )}

        {/* Center - Arc Indicator */}
        <div className="flex-1 flex items-center justify-center">
          {isInitializing ? (
            <p className="font-sans text-paper/70 animate-pulse">Initializing camera & AI...</p>
          ) : (
            <div className="relative">
              {/* Force white/light coloring for the arc text by wrapping in a div that overrides text color if we had to, but ArcIndicator uses text-ink. 
                  Let's pass a custom class or wrap it in a container that forces text-paper.
                  Actually, ArcIndicator hardcodes `text-ink`. 
                  Let's wrap it in a div with a CSS filter to invert it if needed, or we just leave it and fix ArcIndicator to accept a text color prop.
                  For now, a white background rounded wrapper is cleanest for contrast against the dark video. */}
              <div className="rounded-full bg-paper p-4 shadow-2xl">
                <ArcIndicator 
                  currentValue={state.currentAngle} 
                  targetValue={targetAngle} 
                  color={state.formWarning ? "signal" : "recovery"}
                  animated={false} // Real-time feed needs instant updates, not 600ms trailing anim
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar - Form Warning */}
        <div className="h-16 flex items-end justify-center">
          {state.formWarning && (
            <div className="rounded-md bg-signal px-4 py-2 text-paper shadow-lg font-sans text-sm font-medium">
              {state.formWarning}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
