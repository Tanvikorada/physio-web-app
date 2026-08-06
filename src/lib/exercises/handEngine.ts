import { Point3D } from "./angles"

export type HandExerciseType = "FingerFlexion" | "FingerSpreading"

export interface HandExerciseState {
  reps: number
  rejectedReps: number
  currentAngle: number // We map distance scores to "angle" 0-100 for UI compatibility
  maxAngleThisRep: number
  sessionMaxValidAngle: number
  phase: "setup" | "concentric" | "eccentric"
  formWarning: string | null
  formSignal: "good" | "poor"
  formFlags: string[]
  liveCue: string | null
  repPeakFlash: boolean
  holdTimeMs: number
  isHolding: boolean
}

const HAND_CONFIG = {
  FingerFlexion: { // Rep-counted
    exercise_id: "FingerFlexion",
    trackingMode: "C", // internally it maps to rep-counted logic in UI
    angle_range_valid: [0, 150] as [number, number],
    rep_start_angle: 25,
    rep_top_angle: 80,
    min_rep_duration_ms: 500,
    max_rep_duration_ms: 6000,
  },
  FingerSpreading: { // Hold-timed
    exercise_id: "FingerSpreading",
    trackingMode: "B",
    angle_range_valid: [0, 150] as [number, number],
    rep_start_angle: 20,
    rep_top_angle: 70,
    min_rep_duration_ms: 0,
    max_rep_duration_ms: 0,
  },
}

function dist2D(p1: Point3D, p2: Point3D) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export class HandExerciseEngine {
  public type: string
  public state: HandExerciseState
  public config: any

  private repStartTimeMs: number = 0
  private lastAngle: number = 0
  private lastTimestampMs: number = 0

  private repLostTracking: boolean = false
  private monotonicFails: number = 0

  private lastCueText: string | null = null
  private lastCueChangeMs: number = 0
  private readonly CUE_DEBOUNCE_MS = 1500

  public trackingMode: string
  public targetHoldSeconds: number | null

  constructor(type: string, romModifier: number = 1.0, trackingMode: string = "C", targetHoldSeconds: number | null = null) {
    this.type = type
    // If it's a hold-timed hand exercise, we need to treat it like B for logic
    this.trackingMode = type === "FingerSpreading" ? "B" : trackingMode
    this.targetHoldSeconds = targetHoldSeconds || (type === "FingerSpreading" ? 10 : null) // Default 10s if null

    const baseConfig = (HAND_CONFIG as any)[type] || HAND_CONFIG.FingerFlexion
    
    this.config = {
      ...baseConfig,
      rep_top_angle: baseConfig.rep_top_angle * romModifier,
    }

    this.state = {
      reps: 0,
      rejectedReps: 0,
      currentAngle: 0,
      maxAngleThisRep: 0,
      sessionMaxValidAngle: 0,
      phase: "setup",
      formWarning: null,
      formSignal: "good",
      formFlags: [],
      liveCue: null,
      repPeakFlash: false,
      holdTimeMs: 0,
      isHolding: false,
    }
  }

  private setLiveCue(cue: string | null, nowMs: number) {
    if (cue !== this.lastCueText && nowMs - this.lastCueChangeMs > this.CUE_DEBOUNCE_MS) {
      this.lastCueText = cue
      this.lastCueChangeMs = nowMs
      this.state.liveCue = cue
    }
  }

  public processLandmarks(landmarks: Point3D[], timestampMs: number) {
    // MediaPipe Hand Landmarks:
    // 0: Wrist
    // 5, 9, 13, 17: MCPs (knuckles)
    // 8, 12, 16, 20: Tips

    const wrist = landmarks[0]
    if (!wrist || landmarks.length < 21) {
      this.state.formWarning = "Hand tracking lost — keep your hand in view."
      this.state.formSignal = "poor"
      this.repLostTracking = true
      this.setLiveCue("Hand in frame", timestampMs)
      return this.state
    }

    let score = 0

    if (this.type === "FingerFlexion") {
      // Calculate average distance from fingertips to wrist
      const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]]
      const mcps = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]]
      
      let tipDist = 0
      let mcpDist = 0
      tips.forEach(t => tipDist += dist2D(t, wrist))
      mcps.forEach(m => mcpDist += dist2D(m, wrist))
      
      const ratio = tipDist / Math.max(mcpDist, 0.001)
      
      // ratio ~ 1.8 (open) to 0.5 (fist)
      // Map to 0-100 score
      let rawScore = (1.8 - ratio) * (100 / 1.3)
      score = Math.max(0, Math.min(150, rawScore))
    } 
    else if (this.type === "FingerSpreading") {
      // Calculate distance between adjacent fingertips
      const d1 = dist2D(landmarks[8], landmarks[12])
      const d2 = dist2D(landmarks[12], landmarks[16])
      const d3 = dist2D(landmarks[16], landmarks[20])
      const spreadDist = d1 + d2 + d3
      
      // Hand width (Index MCP to Pinky MCP)
      const mcpWidth = dist2D(landmarks[5], landmarks[17])
      
      const ratio = spreadDist / Math.max(mcpWidth, 0.001)
      
      // ratio ~ 1.0 (closed) to 2.5 (spread)
      let rawScore = (ratio - 1.0) * (100 / 1.5)
      score = Math.max(0, Math.min(150, rawScore))
    }

    this.state.currentAngle = Math.round(score)
    this.state.repPeakFlash = false

    if (this.state.phase === "setup") {
      const exerciseLabel = this.type === "FingerFlexion" ? "open hand" : "fingers together"
      this.setLiveCue(`Start: ${exerciseLabel}`, timestampMs)
    }

    this.updateState(timestampMs)

    this.lastAngle = this.state.currentAngle
    this.lastTimestampMs = timestampMs

    return this.state
  }

  private updateState(timestampMs: number) {
    const angle = this.state.currentAngle
    const config = this.config

    if (
      this.state.formWarning === "Hand tracking lost — keep your hand in view."
    ) {
      this.state.formWarning = null
      this.state.formSignal = "good"
    }

    if (this.trackingMode === "B") {
      // Mode B (Hold-Timed) Logic
      if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
        if (angle > (this.state.sessionMaxValidAngle || 0)) {
          this.state.sessionMaxValidAngle = angle
        }
      }

      const targetThreshold = config.rep_top_angle - 10

      if (angle >= targetThreshold) {
        if (!this.state.isHolding) {
          this.state.isHolding = true
        }
        
        if (this.lastTimestampMs > 0 && !this.repLostTracking) {
          const deltaMs = timestampMs - this.lastTimestampMs
          if (deltaMs < 1000) {
            this.state.holdTimeMs += deltaMs
          }
        }
        
        this.state.formSignal = "good"
        this.setLiveCue("Holding position...", timestampMs)
      } else {
        if (this.state.isHolding) {
          this.state.isHolding = false
          if (!this.state.formFlags.includes("Lost hold position")) {
            this.state.formFlags.push("Lost hold position")
          }
        }
        this.state.formSignal = "poor"
        this.setLiveCue("Hold the position!", timestampMs)
      }

      return
    }

    // Rep-counted logic
    if (this.state.phase === "setup") {
      if (angle > config.rep_start_angle + 10) {
        this.state.phase = "concentric"
        this.state.maxAngleThisRep = angle
        this.repStartTimeMs = timestampMs
        this.repLostTracking = false
        this.monotonicFails = 0
        this.state.formSignal = "good"
        this.state.formWarning = null
        this.setLiveCue(this.type === "FingerFlexion" ? "Make a fist!" : "Spread fingers!", timestampMs)
      }
    } else if (this.state.phase === "concentric") {
      if (angle < this.lastAngle - 10) {
        this.monotonicFails += 1
        if (this.monotonicFails > 3) {
          this.state.formSignal = "poor"
          this.setLiveCue("Slow down", timestampMs)
          if (!this.state.formFlags.includes("Jerky movement")) {
            this.state.formFlags.push("Jerky movement")
          }
        }
      } else if (this.state.formSignal === "good") {
        const progress = angle / config.rep_top_angle
        if (angle >= config.rep_top_angle) {
          this.setLiveCue("Hold it!", timestampMs)
        } else if (progress >= 0.8) {
          this.setLiveCue("Almost there!", timestampMs)
        } else {
          this.setLiveCue("Keep going!", timestampMs)
        }
      }

      if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
      }

      if (
        angle >= config.rep_top_angle &&
        this.lastAngle < config.rep_top_angle
      ) {
        this.state.repPeakFlash = true
      }

      if (this.state.maxAngleThisRep - angle > 20) {
        this.state.phase = "eccentric"
        this.monotonicFails = 0
        this.setLiveCue("Open slowly", timestampMs)
      }
    } else if (this.state.phase === "eccentric") {
      if (angle > this.lastAngle + 10) {
        this.monotonicFails += 1
        if (this.monotonicFails > 3) {
          this.state.formSignal = "poor"
          this.setLiveCue("Control it", timestampMs)
        }
      } else if (this.state.formSignal === "good") {
        this.setLiveCue("Open slowly", timestampMs)
      }

      if (angle <= config.rep_start_angle) {
        const durationMs = timestampMs - this.repStartTimeMs

        let validRep = true
        let rejectReason = ""

        if (this.repLostTracking) {
          validRep = false
          rejectReason = "Tracking lost during rep"
        } else if (this.state.maxAngleThisRep < config.rep_top_angle) {
          validRep = false
          rejectReason = "Incomplete range"
        } else if (durationMs < config.min_rep_duration_ms) {
          validRep = false
          rejectReason = "Too fast"
        } else if (durationMs > config.max_rep_duration_ms) {
          validRep = false
          rejectReason = "Too slow (lost tracking?)"
        }

        if (validRep) {
          this.state.reps += 1
          this.state.formWarning = null
          this.state.formSignal = "good"
          if (this.state.maxAngleThisRep > (this.state.sessionMaxValidAngle || 0)) {
            this.state.sessionMaxValidAngle = this.state.maxAngleThisRep
          }
          this.setLiveCue("Good rep!", timestampMs)
        } else {
          this.state.rejectedReps += 1
          this.state.formWarning = `Rep not counted: ${rejectReason}`
          this.state.formSignal = "poor"
          this.setLiveCue(rejectReason === "Incomplete range" ? "Squeeze tighter" : "Try again", timestampMs)
          if (!this.state.formFlags.includes(`Incomplete/Rejected: ${rejectReason}`)) {
            this.state.formFlags.push(`Incomplete/Rejected: ${rejectReason}`)
          }
        }

        this.state.phase = "setup"
        this.state.maxAngleThisRep = 0
        this.repStartTimeMs = 0
      } else if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
        this.state.phase = "concentric"
        this.monotonicFails = 0
      }
    }
  }
}
