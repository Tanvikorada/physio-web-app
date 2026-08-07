"use client"

import * as React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { PoseLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { ExerciseEngine, ExerciseType, ExerciseState } from "@/lib/exercises/engine"
import { HandExerciseEngine, HandExerciseState } from "@/lib/exercises/handEngine"
import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { Button } from "@/components/ui/button"
import { Point3D } from "@/lib/exercises/angles"
import { useTranslation } from "@/components/DictionaryProvider"

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe 33-point anatomical skeleton connections
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

// ─────────────────────────────────────────────────────────────────────────────
// Accuracy constants
// ─────────────────────────────────────────────────────────────────────────────
const EMA_ALPHA = 0.35           // Landmark smoothing factor (lower = smoother but more lag)
const CONFIDENCE_THRESHOLD = 0.6 // Minimum per-landmark visibility to accept a frame
const CALIBRATION_FRAMES = 60    // Number of frames to hold still during calibration (~2s at 30fps)
const DIAG_LOG_EVERY = 30        // Only log every N frames to reduce console spam

// Joint name mapping for user-facing cue messages
const JOINT_NAMES: Record<number, string> = {
  11: "left shoulder", 12: "right shoulder",
  13: "left elbow", 14: "right elbow",
  15: "left wrist", 16: "right wrist",
  23: "left hip", 24: "right hip",
  25: "left knee", 26: "right knee",
  27: "left ankle", 28: "right ankle",
}

interface LiveCameraProps {
  exerciseType: string
  exerciseName?: string
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

export function LiveCamera({ exerciseType, exerciseName, onSessionComplete, targetModifier, dynamicConfig, trackingMode, targetHoldSeconds }: LiveCameraProps) {
  const { t } = useTranslation()
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

  // ── EMA smoothing: per-landmark smoothed positions ─────────────────────────
  const smoothedLandmarksRef = useRef<Map<number, Point3D>>(new Map())
  const diagFrameCountRef = useRef(0) // for throttling diagnostic logs

  const applyEMASmoothing = useCallback((rawLandmarks: Point3D[]): Point3D[] => {
    return rawLandmarks.map((lm, i) => {
      const prev = smoothedLandmarksRef.current.get(i)
      if (!prev) {
        smoothedLandmarksRef.current.set(i, { ...lm })
        return lm
      }
      const smoothed: Point3D = {
        x: EMA_ALPHA * lm.x + (1 - EMA_ALPHA) * prev.x,
        y: EMA_ALPHA * lm.y + (1 - EMA_ALPHA) * prev.y,
        z: EMA_ALPHA * lm.z + (1 - EMA_ALPHA) * prev.z,
        visibility: lm.visibility, // Don't smooth visibility — use raw value for gating
      }
      smoothedLandmarksRef.current.set(i, smoothed)
      return smoothed
    })
  }, [])

  // ── Calibration state ──────────────────────────────────────────────────────
  const calibrationFramesRef = useRef(0)
  const [calibrationPhase, setCalibrationPhase] = useState<"calibrating" | "calibration-failed" | "ready">("calibrating")
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [calibrationFailReason, setCalibrationFailReason] = useState<string | null>(null)
  const calibrationPhaseRef = useRef<"calibrating" | "calibration-failed" | "ready">("calibrating")

  // ── Confidence-gated tracking cue ─────────────────────────────────────────
  const [lowConfidenceCue, setLowConfidenceCue] = useState<string | null>(null)

  // ── Camera init ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: "user" | "environment") => {
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

      canvas.width = rect.width
      canvas.height = rect.height

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const videoAspect = video.videoWidth / video.videoHeight
      const canvasAspect = canvas.width / canvas.height
      let drawW: number, drawH: number, offsetX: number, offsetY: number

      if (videoAspect > canvasAspect) {
        drawH = canvas.height
        drawW = drawH * videoAspect
        offsetX = (canvas.width - drawW) / 2
        offsetY = 0
      } else {
        drawW = canvas.width
        drawH = drawW / videoAspect
        offsetX = 0
        offsetY = (canvas.height - drawH) / 2
      }

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
        const isCenterJoint = activeTriplet ? i === activeTriplet[1] : false

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

  // ── Check confidence for all 3 active landmarks ────────────────────────────
  const checkConfidence = useCallback(
    (landmarks: Point3D[], triplet: [number, number, number] | null): { ok: boolean; cue: string | null } => {
      if (!triplet) return { ok: true, cue: null }
      for (const idx of triplet) {
        const lm = landmarks[idx]
        if (!lm || (lm.visibility ?? 1) < CONFIDENCE_THRESHOLD) {
          const jointName = JOINT_NAMES[idx] || "tracked joint"
          return { ok: false, cue: `Can't see your ${jointName} clearly — move into frame` }
        }
      }
      return { ok: true, cue: null }
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
          const mappedRaw: Point3D[] = rawLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }))

          // Apply EMA smoothing before any angle math
          const mappedLandmarks = isHandTracking ? mappedRaw : applyEMASmoothing(mappedRaw)

          // ── DIAGNOSTIC CHECKPOINT 1: EMA smoothing output ────────────────
          diagFrameCountRef.current += 1
          const shouldLog = diagFrameCountRef.current % DIAG_LOG_EVERY === 0
          if (shouldLog && !isHandTracking) {
            const [aI, bI, cI] = (engine as ExerciseEngine).getActiveTriplet(mappedLandmarks)
            console.log(
              `[DIAG CP1 EMA] frame=${diagFrameCountRef.current} triplet=[${aI},${bI},${cI}]`,
              `A=`, mappedLandmarks[aI] ? `{x:${mappedLandmarks[aI].x.toFixed(3)},y:${mappedLandmarks[aI].y.toFixed(3)},vis:${mappedLandmarks[aI].visibility?.toFixed(2)}}` : 'MISSING',
              `B=`, mappedLandmarks[bI] ? `{x:${mappedLandmarks[bI].x.toFixed(3)},y:${mappedLandmarks[bI].y.toFixed(3)},vis:${mappedLandmarks[bI].visibility?.toFixed(2)}}` : 'MISSING',
              `C=`, mappedLandmarks[cI] ? `{x:${mappedLandmarks[cI].x.toFixed(3)},y:${mappedLandmarks[cI].y.toFixed(3)},vis:${mappedLandmarks[cI].visibility?.toFixed(2)}}` : 'MISSING',
            )
          }

          // ── Calibration phase ────────────────────────────────────────────
          if (calibrationPhaseRef.current === "calibrating") {
            const activeTriplet = isHandTracking ? null : (engine as ExerciseEngine).getActiveTriplet(mappedLandmarks)
            const { ok, cue } = isHandTracking
              ? { ok: true, cue: null }
              : checkConfidence(mappedLandmarks, activeTriplet)

            if (!ok) {
              // Key joints not visible during calibration — stay in calibrating, don't advance frame count
              setCalibrationFailReason(cue)
              drawSkeleton(mappedLandmarks, null, false, "poor")
            } else {
              setCalibrationFailReason(null)
              calibrationFramesRef.current += 1
              const progress = Math.min(100, Math.round((calibrationFramesRef.current / CALIBRATION_FRAMES) * 100))
              setCalibrationProgress(progress)

              drawSkeleton(mappedLandmarks, null, false, "good")

              if (calibrationFramesRef.current >= CALIBRATION_FRAMES) {
                calibrationPhaseRef.current = "ready"
                setCalibrationPhase("ready")
              }
            }
            requestRef.current = requestAnimationFrame(renderLoop)
            return
          }

          // ── DIAGNOSTIC CHECKPOINT 2: Confidence gate ─────────────────────
          if (!isHandTracking) {
            const activeTriplet = (engine as ExerciseEngine).getActiveTriplet(mappedLandmarks)
            const { ok, cue } = checkConfidence(mappedLandmarks, activeTriplet)
            if (shouldLog) {
              const [aI, bI, cI] = activeTriplet
              const visA = mappedLandmarks[aI]?.visibility ?? -1
              const visB = mappedLandmarks[bI]?.visibility ?? -1
              const visC = mappedLandmarks[cI]?.visibility ?? -1
              console.log(
                `[DIAG CP2 CONFIDENCE] gate=${ok ? 'PASS ✅' : 'FAIL ❌'}`,
                `threshold=${CONFIDENCE_THRESHOLD}`,
                `visibilities=[${visA.toFixed(2)},${visB.toFixed(2)},${visC.toFixed(2)}]`,
                ok ? '' : `cue="${cue}"`
              )
            }
            if (!ok) {
              setLowConfidenceCue(cue)
              drawSkeleton(mappedLandmarks, activeTriplet, false, "poor")
              requestRef.current = requestAnimationFrame(renderLoop)
              return
            }
            setLowConfidenceCue(null)
          }

          const newState = engine.processLandmarks(mappedLandmarks, startTimeMs)

          // ── DIAGNOSTIC CHECKPOINT 5: Angle value in state vs UI ──────────
          if (shouldLog) {
            console.log(
              `[DIAG CP5 STATE->UI] currentAngle=${newState.currentAngle}`,
              `phase=${newState.phase}`,
              `reps=${newState.reps}`,
              `formSignal=${newState.formSignal}`,
            )
          }

          setState({ ...newState })

          drawSkeleton(
            mappedLandmarks,
            isHandTracking ? null : (engine as ExerciseEngine).getActiveTriplet(mappedLandmarks),
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
  }, [engine, drawSkeleton, onSessionComplete, applyEMASmoothing, checkConfidence])

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
    // Reset smoothing and calibration when switching cameras
    smoothedLandmarksRef.current.clear()
    calibrationFramesRef.current = 0
    calibrationPhaseRef.current = "calibrating"
    setCalibrationPhase("calibrating")
    setCalibrationProgress(0)
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

  const primaryJoint = isHandTracking ? "wrist" : ((engine as ExerciseEngine).config?.primary_joint || "shoulder")
  // Target angle should be read from config
  const baseTargetAngle = isHandTracking 
    ? (engine as HandExerciseEngine).config.rep_top_angle 
    : (engine as ExerciseEngine).config.rep_top_angle
  const targetAngle = isHandTracking ? baseTargetAngle : baseTargetAngle // Note: romModifier is already applied inside ExerciseEngine constructor, but wait!
  // In previous code:
  // const targetAngle = isHandTracking ? baseTargetAngle : baseTargetAngle * (targetModifier?.romModifier || 1.0)
  // BUT in ExerciseEngine, romModifier is applied to config.rep_top_angle!
  // So baseTargetAngle here already HAS the modifier! 
  // Let's just use baseTargetAngle directly.
  const isSignal = state.formSignal === "poor"

  return (
    <div className="relative flex h-full w-full flex-col md:flex-row bg-ink overflow-hidden">
      
      {/* ── PANEL 1: CAMERA (Top on mobile, Left on desktop) ── */}
      <div className="relative w-full h-[45%] md:h-full md:w-1/2 flex-shrink-0 bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
        {/* Video Feed Layer */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* ── Calibration Overlay ── */}
        {!isInitializing && calibrationPhase === "calibrating" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6">
            <div className="w-full max-w-xs space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-paper/10 flex items-center justify-center mx-auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-paper">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-widest text-paper/40 mb-1">Getting Ready</p>
                <h2 className="font-serif text-xl text-paper">Hold still</h2>
                <p className="font-sans text-xs text-paper/60 mt-1 leading-relaxed">
                  {calibrationFailReason
                    ? calibrationFailReason
                    : "Stay in frame and hold still for a moment."}
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-paper/10 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-recovery rounded-full transition-all duration-100"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>
              {calibrationFailReason && (
                <p className="font-sans text-[10px] text-signal/80 mt-1">
                  Step into frame so your joints are visible
                </p>
              )}
            </div>
          </div>
        )}

        {/* Center Prominent Live Coaching Cue HUD */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 p-4">
          {calibrationPhase === "ready" && (state.liveCue || state.formWarning) && (
            <div className="mt-24 md:mt-32 transition-all duration-300 ease-in-out w-full flex justify-center">
              {state.formSignal === "poor" ? (
                <div className="bg-black/70 backdrop-blur-md rounded-2xl px-5 py-3 border-2 border-signal shadow-2xl animate-in zoom-in-95 duration-200">
                  <p className="font-sans text-xl md:text-2xl font-bold text-signal text-center leading-tight drop-shadow-md">
                    {t(state.formWarning || state.liveCue)}
                  </p>
                </div>
              ) : (
                <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2.5 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className={`font-sans text-lg md:text-xl font-bold text-center tracking-wide drop-shadow-md ${
                    state.liveCue === "Good rep!" || state.liveCue === "Hold it!" || state.liveCue === "Holding position..."
                      ? "text-recovery"
                      : "text-white"
                  }`}>
                    {t(state.liveCue)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PANEL 2: DASHBOARD INFO (Bottom on mobile, Right on desktop) ── */}
      <div className="relative w-full flex-1 md:w-1/2 flex flex-col p-5 md:p-8 overflow-y-auto bg-ink z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] md:shadow-none">
        
        {/* Top bar */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex flex-col">
            <span className="font-sans text-xs md:text-sm text-paper/60 uppercase tracking-wide">
              {t(exerciseName || exerciseType)}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-3xl md:text-4xl text-paper">
                {state.reps}
              </span>
              <span className="font-sans text-sm md:text-base text-paper/70">{t("valid reps")}</span>
              {state.rejectedReps > 0 && (
                <span className="font-sans text-xs md:text-sm text-signal/80 ml-1">
                  ({state.rejectedReps} {t("not counted")})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Camera toggle button */}
            <button
              onClick={handleCameraToggle}
              className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-paper/5 text-paper hover:bg-paper/10 transition-colors border border-paper/10"
              title="Switch camera"
              aria-label="Switch camera front/back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 md:w-6 md:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l2 2-2 2" />
              </svg>
            </button>

            <Button
              variant="outline"
              size="sm"
              className="text-paper border-paper/20 hover:bg-paper/10 text-xs md:text-sm h-10 md:h-12 px-4 md:px-5 rounded-full"
              onClick={handleEndSession}
            >
              {t("End Session")}
            </Button>
          </div>
        </div>

        {/* Modifier & Cue Banners */}
        <div className="w-full flex flex-col gap-2 mt-4 shrink-0">
          {targetModifier && (
            <div className="rounded-xl bg-signal/90 px-4 py-2.5 text-paper shadow-lg font-sans text-xs md:text-sm font-medium text-center">
              {targetModifier.message}
            </div>
          )}
          {calibrationPhase === "ready" && lowConfidenceCue && (
            <div className="rounded-xl bg-signal/90 px-4 py-2.5 text-paper shadow-lg font-sans text-xs md:text-sm font-semibold text-center">
              👁 {lowConfidenceCue}
            </div>
          )}
        </div>

        {/* Center — Arc Indicator + Phase */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6 md:mt-0 min-h-[220px]">
          {/* Form Reminder */}
          {!isInitializing && calibrationPhase === "ready" && (
            <div className="text-center font-sans text-xs md:text-sm text-paper/70 bg-paper/5 px-4 py-2 rounded-full border border-paper/10">
              💡 {primaryJoint === "neck" ? t("Turn slowly and smoothly") : (primaryJoint === "knee" ? t("Bend smoothly without swinging") : t("Keep arm straight and move slowly"))}
            </div>
          )}

          {/* Phase indicator banner */}
          {!isInitializing && calibrationPhase === "ready" && (
            <div className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 font-sans text-sm md:text-base font-semibold shadow-lg transition-all duration-300 ${
              state.phase === "concentric"
                ? "bg-recovery/80 text-white"
                : state.phase === "eccentric"
                ? "bg-paper/10 text-paper border border-paper/20"
                : "bg-paper/5 text-paper/60 border border-paper/10"
            }`}>
              {state.phase === "setup" && (
                <><span>●</span><span>{t("Ready")} — {isHandTracking ? t("hand in view") : (primaryJoint === "neck" ? t("look forward") : (primaryJoint === "knee" || primaryJoint === "hip" || primaryJoint === "ankle" ? t("leg straight") : t("arm at side")))}</span></>
              )}
              {state.phase === "concentric" && (
                <><span>↑</span><span>{t("Lifting")}</span>
                  {state.currentAngle < targetAngle && (
                    <span className="ml-1.5 opacity-80 font-normal">
                      · {Math.max(0, Math.round(targetAngle - state.currentAngle))}° {t("to go")}
                    </span>
                  )}
                </>
              )}
              {state.phase === "eccentric" && (
                <><span>↓</span><span>{t("Lowering — return to start")}</span></>
              )}
            </div>
          )}

          {isInitializing ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full">
              <div className="w-10 h-10 border-2 border-paper/20 border-t-paper rounded-full animate-spin" />
              <p className="font-sans text-paper/60 text-sm md:text-base">{t("Initializing AI...")}</p>
            </div>
          ) : calibrationPhase === "ready" ? (
            <div className="relative w-full flex justify-center">
              <div
                className={`rounded-3xl bg-white p-5 md:p-6 shadow-xl transition-all duration-200 flex flex-col items-center justify-center w-64 md:w-72 ${
                  isSignal ? "ring-4 ring-signal/80 shadow-signal/20" : "ring-1 ring-black/5"
                }`}
              >
                <div className="scale-110 md:scale-125 my-4">
                  <ArcIndicator
                    currentValue={engine.trackingMode === "B" ? state.holdTimeMs / 1000 : state.currentAngle}
                    targetValue={engine.trackingMode === "B" && engine.targetHoldSeconds ? engine.targetHoldSeconds : targetAngle}
                    color={isSignal ? "signal" : "recovery"}
                    animated={engine.trackingMode === "B"}
                  />
                </div>
                <p className="mt-5 text-center font-sans text-xs md:text-sm font-medium text-ink/70 bg-ink/5 px-3 py-1.5 rounded-lg w-full">
                  {engine.trackingMode === "B" 
                    ? `${t(exerciseName || exerciseType)}: ${Math.floor(state.holdTimeMs / 1000)}s of ${engine.targetHoldSeconds || 0}s target`
                    : `${t(exerciseName || exerciseType)}: ${Math.round(state.currentAngle)}° of ${Math.round(targetAngle)}°`}
                </p>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  )
}
