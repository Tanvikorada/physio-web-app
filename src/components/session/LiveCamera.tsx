"use client"

import * as React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { PoseLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { ExerciseEngine, ExerciseType, ExerciseState } from "@/lib/exercises/engine"
import { HandExerciseEngine, HandExerciseState } from "@/lib/exercises/handEngine"
import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { Button } from "@/components/ui/button"
import { Point3D } from "@/lib/exercises/angles"

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe 33-point anatomical skeleton connections
// Same as PoseLandmarker.POSE_CONNECTIONS but defined here to avoid the
// static-property access issue in client bundles.
// ─────────────────────────────────────────────────────────────────────────────
const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Right arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Left arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Right leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Left leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
]

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [9, 10], [10, 11], [11, 12], // Middle
  [13, 14], [14, 15], [15, 16], // Ring
  [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17], // Palm arcs
  [0, 17] // Palm closing
]

interface LiveCameraProps {
  exerciseType: string
  onSessionComplete: (finalState: {
    reps: number
    rejectedReps: number
    maxAngle: number
    formWarning: string | null
    formFlags: string[]
    holdTimeMs?: number
    targetHoldMs?: number
  }) => void
  targetModifier?: { message: string; repModifier: number; romModifier: number } | null
  dynamicConfig?: any
  trackingMode?: string
  targetHoldSeconds?: number | null
}

export function LiveCamera({ exerciseType, onSessionComplete, targetModifier, dynamicConfig, trackingMode, targetHoldSeconds }: LiveCameraProps) {
  const isHandTracking = trackingMode === "C"
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [engine] = useState(() => 
    isHandTracking
      ? new HandExerciseEngine(exerciseType, targetModifier?.romModifier ?? 1.0, trackingMode, targetHoldSeconds || null)
      : new ExerciseEngine(exerciseType, targetModifier?.romModifier ?? 1.0, dynamicConfig, trackingMode || "A", targetHoldSeconds || null)
  )
  const [state, setState] = useState<any>(engine.state)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Camera facing mode
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const facingModeRef = useRef<"user" | "environment">("user")
  const streamRef = useRef<MediaStream | null>(null)

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const requestRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef<number>(-1)

  // ── Camera init ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: "user" | "environment") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: mode },
      })
      streamRef.current = stream
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
  }, [])

  const initMediaPipe = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )
      if (isHandTracking) {
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        })
        handLandmarkerRef.current = landmarker
      } else {
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        })
        poseLandmarkerRef.current = landmarker
      }
      setIsInitializing(false)
    } catch (err) {
      console.error(err)
      setError("Failed to initialize tracking models.")
    }
  }

  // ── Draw skeleton on canvas ────────────────────────────────────────────────
  const drawSkeleton = useCallback(
    (landmarks: Point3D[], activeTriplet: [number, number, number] | null, repPeakFlash: boolean, formSignal: "good" | "poor") => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return

      const rect = video.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // Match canvas to rendered video size
      canvas.width = rect.width
      canvas.height = rect.height

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // The video uses object-cover: we need to map normalized [0,1] coordinates
      // to the cropped/scaled pixel space that actually appears on screen.
      const videoAspect = video.videoWidth / video.videoHeight
      const canvasAspect = canvas.width / canvas.height
      let drawW: number, drawH: number, offsetX: number, offsetY: number

      if (videoAspect > canvasAspect) {
        // Video is wider — crop sides
        drawH = canvas.height
        drawW = drawH * videoAspect
        offsetX = (canvas.width - drawW) / 2
        offsetY = 0
      } else {
        // Video is taller — crop top/bottom
        drawW = canvas.width
        drawH = drawW / videoAspect
        offsetX = 0
        offsetY = (canvas.height - drawH) / 2
      }

      // Map normalized landmark coords to canvas pixel coords
      const toCanvas = (lm: Point3D) => ({
        x: offsetX + lm.x * drawW,
        y: offsetY + lm.y * drawH,
      })

      const COLOR_RECOVERY = "#3C6E5E"
      const COLOR_SIGNAL = "#C4703A"
      const COLOR_GOOD_JOINT = "#6BC4A6"

      const activeSet = activeTriplet ? new Set(activeTriplet) : new Set<number>()

      // Draw connections
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      const connections = isHandTracking ? HAND_CONNECTIONS : POSE_CONNECTIONS
      for (const [from, to] of connections) {
        const lmFrom = landmarks[from]
        const lmTo = landmarks[to]
        if (!lmFrom || !lmTo) continue
        if (!isHandTracking && ((lmFrom.visibility ?? 1) < 0.35 || (lmTo.visibility ?? 1) < 0.35)) continue

        const isActiveConnection = isHandTracking ? true : (activeSet.has(from) && activeSet.has(to))
        ctx.strokeStyle =
          isActiveConnection && repPeakFlash
            ? COLOR_SIGNAL
            : isActiveConnection
            ? COLOR_GOOD_JOINT
            : formSignal === "poor" && (isHandTracking || activeSet.has(from) || activeSet.has(to))
            ? COLOR_SIGNAL
            : COLOR_RECOVERY

        const p1 = toCanvas(lmFrom)
        const p2 = toCanvas(lmTo)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      // Draw landmark dots
      ctx.globalAlpha = 1
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i]
        if (!lm) continue
        if ((lm.visibility ?? 1) < 0.35) continue

        const { x, y } = toCanvas(lm)
        const isActive = isHandTracking ? true : activeSet.has(i)
        const isCenterJoint = activeTriplet ? i === activeTriplet[1] : false // vertex joint (the angle joint)

        ctx.beginPath()
        ctx.arc(x, y, isCenterJoint ? 7 : isActive ? 5 : 3, 0, 2 * Math.PI)
        ctx.fillStyle =
          isCenterJoint && repPeakFlash
            ? COLOR_SIGNAL
            : isCenterJoint && formSignal === "poor"
            ? COLOR_SIGNAL
            : isActive
            ? COLOR_GOOD_JOINT
            : "#ffffff"
        ctx.fill()

        if (isCenterJoint) {
          ctx.strokeStyle = repPeakFlash || formSignal === "poor" ? COLOR_SIGNAL : COLOR_RECOVERY
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
    },
    []
  )

  // ── Render loop ────────────────────────────────────────────────────────────
  const renderLoop = useCallback(() => {
    const activeLandmarker = isHandTracking ? handLandmarkerRef.current : poseLandmarkerRef.current
    if (videoRef.current && activeLandmarker && videoRef.current.readyState >= 2) {
      const startTimeMs = performance.now()
      if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime
        const results = activeLandmarker.detectForVideo(videoRef.current, startTimeMs)

        if (results.landmarks && results.landmarks.length > 0) {
          const rawLandmarks = results.landmarks[0]
          const mappedLandmarks: Point3D[] = rawLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }))

          const newState = engine.processLandmarks(mappedLandmarks, startTimeMs)
          setState({ ...newState })

          // Draw skeleton overlay
          drawSkeleton(
            mappedLandmarks,
            isHandTracking ? null : (engine as ExerciseEngine).config.landmarks_used as [number, number, number],
            newState.repPeakFlash,
            newState.formSignal
          )

          // Auto-end session if Mode B target reached
          if (engine.trackingMode === "B" && engine.targetHoldSeconds && newState.holdTimeMs >= engine.targetHoldSeconds * 1000) {
            onSessionComplete({
              reps: newState.reps,
              rejectedReps: newState.rejectedReps,
              maxAngle: newState.sessionMaxValidAngle || 0,
              formWarning: newState.formWarning,
              formFlags: newState.formFlags,
              holdTimeMs: newState.holdTimeMs,
              targetHoldMs: engine.targetHoldSeconds * 1000,
            })
            return
          }
        } else {
          // No pose detected — clear canvas
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext("2d")
            ctx?.clearRect(0, 0, canvas.width, canvas.height)
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(renderLoop)
  }, [engine, drawSkeleton, onSessionComplete])

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    startCamera("user")
    initMediaPipe()

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close()
      if (handLandmarkerRef.current) handLandmarkerRef.current.close()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isInitializing && !error) {
      requestRef.current = requestAnimationFrame(renderLoop)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isInitializing, error, renderLoop])

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const handleCameraToggle = async () => {
    const newMode = facingModeRef.current === "user" ? "environment" : "user"
    facingModeRef.current = newMode
    setFacingMode(newMode)
    await startCamera(newMode)
  }

  const handleEndSession = () => {
    onSessionComplete({
      reps: state.reps,
      rejectedReps: state.rejectedReps,
      maxAngle: state.sessionMaxValidAngle || 0,
      formWarning: state.formWarning,
      formFlags: state.formFlags,
      holdTimeMs: state.holdTimeMs,
      targetHoldMs: engine.targetHoldSeconds ? engine.targetHoldSeconds * 1000 : undefined,
    })
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-paper p-6 text-center text-signal">
        <p className="font-sans text-base">{error}</p>
      </div>
    )
  }

  const baseTargetAngle = isHandTracking 
    ? (engine as HandExerciseEngine).config.rep_top_angle 
    : (exerciseType === "KneeFlexion" ? 135 : 180)
  const targetAngle = isHandTracking ? baseTargetAngle : baseTargetAngle * (targetModifier?.romModifier || 1.0)
  const isSignal = state.formSignal === "poor"

  return (
    <div className="relative flex h-full w-full flex-col bg-ink overflow-hidden">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Skeleton Canvas Overlay — same inset as video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full pointer-events-none"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 flex flex-col p-6 z-10">

        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-paper/60 uppercase tracking-wide">
              {isHandTracking ? exerciseType : (exerciseType === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction")}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl text-paper">
                {state.reps}
              </span>
              <span className="font-sans text-sm text-paper/70">valid reps</span>
              {state.rejectedReps > 0 && (
                <span className="font-sans text-xs text-signal/80">
                  ({state.rejectedReps} not counted)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Camera toggle button */}
            <button
              onClick={handleCameraToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20 transition-colors border border-paper/20"
              title="Switch camera"
              aria-label="Switch camera front/back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l2 2-2 2" />
              </svg>
            </button>

            <Button
              variant="outline"
              className="text-paper border-paper/30 hover:bg-paper/10"
              onClick={handleEndSession}
            >
              End Session
            </Button>
          </div>
        </div>

        {/* Target Modifier Banner */}
        {targetModifier && (
          <div className="mt-4 w-full flex justify-center">
            <div className="rounded-md bg-signal/90 px-4 py-2 text-paper shadow-lg font-sans text-sm font-medium max-w-sm text-center">
              {targetModifier.message}
            </div>
          </div>
        )}

        {/* Center — Arc Indicator + Phase */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Phase indicator banner */}
          {!isInitializing && (
            <div className={`flex items-center gap-2 rounded-full px-5 py-2 font-sans text-sm font-semibold shadow-lg backdrop-blur-sm transition-all duration-300 ${
              state.phase === "concentric"
                ? "bg-recovery/80 text-white"
                : state.phase === "eccentric"
                ? "bg-paper/20 text-paper border border-paper/30"
                : "bg-paper/10 text-paper/60 border border-paper/20"
            }`}>
              {state.phase === "setup" && (
                <><span>●</span><span>Ready — {isHandTracking ? "hand in view" : (exerciseType === "KneeFlexion" ? "leg straight" : "arm at side")}</span></>
              )}
              {state.phase === "concentric" && (
                <><span>↑</span><span>Lifting</span>
                  {state.currentAngle < targetAngle && (
                    <span className="ml-1 opacity-80">
                      · {Math.max(0, Math.round(targetAngle - state.currentAngle))}° to go
                    </span>
                  )}
                </>
              )}
              {state.phase === "eccentric" && (
                <><span>↓</span><span>Lowering — return to start</span></>
              )}
            </div>
          )}

          {isInitializing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
              <p className="font-sans text-paper/70 text-sm">Initializing camera & AI...</p>
            </div>
          ) : (
            <div className="relative">
              <div
                className={`rounded-full bg-paper p-4 shadow-2xl transition-all duration-200 ${
                  isSignal ? "ring-4 ring-signal shadow-signal/40" : "ring-0"
                }`}
              >
                <ArcIndicator
                  currentValue={engine.trackingMode === "B" ? state.holdTimeMs / 1000 : state.currentAngle}
                  targetValue={engine.trackingMode === "B" && engine.targetHoldSeconds ? engine.targetHoldSeconds : targetAngle}
                  color={isSignal ? "signal" : "recovery"}
                  animated={engine.trackingMode === "B"}
                />
              </div>

              {/* Live coaching cue badge */}
              {state.liveCue && (
                <div
                  className={`absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-sm font-semibold shadow-lg transition-all duration-300 ${
                    state.liveCue === "Good rep!" || state.liveCue === "Hold it!" || state.liveCue === "Holding position..."
                      ? "bg-recovery text-white"
                      : state.liveCue === "Almost there!" || state.liveCue === "Keep lifting!" || state.liveCue === "Lower slowly"
                      ? "bg-paper text-recovery border border-recovery/40"
                      : "bg-signal text-white"
                  }`}
                >
                  {state.liveCue}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom — Form Warning */}
        <div className="h-16 flex items-end justify-center">
          {state.formWarning && (
            <div className="rounded-md bg-signal/90 px-4 py-2 text-paper shadow-lg font-sans text-sm font-medium">
              {state.formWarning}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
