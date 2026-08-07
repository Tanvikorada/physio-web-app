import { Point3D, calculateAngle2D } from "./angles"

export type ExerciseType = "KneeFlexion" | "ShoulderAbduction"

export interface ExerciseState {
  reps: number
  rejectedReps: number
  currentAngle: number
  maxAngleThisRep: number
  sessionMaxValidAngle: number
  phase: "setup" | "concentric" | "eccentric" // setup=rest, concentric=moving to target, eccentric=returning
  formWarning: string | null
  formSignal: "good" | "poor"
  formFlags: string[]
  /** 2-4 word in-rep coaching cue — only changes when content changes, no per-frame flicker */
  liveCue: string | null
  /** Whether the active joint triplet just crossed the rep top threshold (used to flash skeleton color) */
  repPeakFlash: boolean
  // Mode B properties
  holdTimeMs: number
  isHolding: boolean
}

const CONFIG = {
  KneeFlexion: {
    exercise_id: "knee_flexion",
    landmarks_used: [24, 26, 28] as [number, number, number], // Right hip, knee, ankle (MediaPipe indices)
    primary_joint: "knee",
    angle_range_valid: [0, 160] as [number, number], // Degrees of flexion (180 - raw angle)
    rep_start_angle: 20, // Must return below 20 deg to finish rep
    rep_top_angle: 90, // Must exceed 90 deg to count as a good rep
    min_rep_duration_ms: 1000,
    max_rep_duration_ms: 8000,
  },
  ShoulderAbduction: {
    exercise_id: "shoulder_abduction",
    landmarks_used: [24, 12, 14] as [number, number, number], // Right hip, shoulder, elbow
    primary_joint: "shoulder",
    angle_range_valid: [0, 180] as [number, number], // Raw angle
    rep_start_angle: 25,
    rep_top_angle: 90,
    min_rep_duration_ms: 800,
    max_rep_duration_ms: 6000,
  },
}

export class ExerciseEngine {
  public type: string
  public state: ExerciseState
  public config: any // typeof CONFIG["KneeFlexion"] shape

  private minAngleThisRep: number = 999
  private repStartTimeMs: number = 0
  private lastAngle: number = 0
  private lastTimestampMs: number = 0

  // Track visibility for current rep
  private repLostTracking: boolean = false
  // Track jerky movement
  private monotonicFails: number = 0
  private oppositeShoulderInitialY: number | null = null

  // Multi-frame rep validation
  private peakFrameCount: number = 0
  private readonly PEAK_FRAMES_REQUIRED = 4

  // Live cue debouncing — only update text when it actually changes
  private lastCueText: string | null = null
  private lastCueChangeMs: number = 0
  private readonly CUE_DEBOUNCE_MS = 1500 // hold cue for at least this long before changing

  public trackingMode: string
  public targetHoldSeconds: number | null

  constructor(type: string, romModifier: number = 1.0, dynamicConfig?: any, trackingMode: string = "A", targetHoldSeconds: number | null = null) {
    this.type = type
    this.trackingMode = trackingMode
    this.targetHoldSeconds = targetHoldSeconds

    // Copy config and apply ROM modifier to the rep_top_angle
    const baseConfig = dynamicConfig || (CONFIG as any)[type]
    
    if (!baseConfig) {
      throw new Error(`Exercise config missing for ${type}`)
    }

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

  /** Update the liveCue only when the text changes and debounce period has elapsed */
  private setLiveCue(cue: string | null, nowMs: number) {
    if (cue !== this.lastCueText && nowMs - this.lastCueChangeMs > this.CUE_DEBOUNCE_MS) {
      this.lastCueText = cue
      this.lastCueChangeMs = nowMs
      this.state.liveCue = cue
    }
  }

  public getActiveTriplet(landmarks: Point3D[]): [number, number, number] {
    const config = this.config
    let [aIdx, bIdx, cIdx] = config.landmarks_used

    const rightVisibility =
      (landmarks[aIdx]?.visibility || 0) +
      (landmarks[bIdx]?.visibility || 0) +
      (landmarks[cIdx]?.visibility || 0)
    
    const leftVisibility =
      (landmarks[aIdx - 1]?.visibility || 0) +
      (landmarks[bIdx - 1]?.visibility || 0) +
      (landmarks[cIdx - 1]?.visibility || 0)

    if (leftVisibility > rightVisibility) {
      return [aIdx - 1, bIdx - 1, cIdx - 1]
    }
    return [aIdx, bIdx, cIdx]
  }

  public processLandmarks(landmarks: Point3D[], timestampMs: number) {
    const activeTriplet = this.getActiveTriplet(landmarks)
    const [aIdx, bIdx, cIdx] = activeTriplet

    // Is it the left side? (Assuming config defaults to right side which are even numbers)
    const isLeftSide = aIdx % 2 !== 0

    const a = landmarks[aIdx]
    const b = landmarks[bIdx]
    const c = landmarks[cIdx]

    // Compensation check (opposite shoulder tilt)
    const oppositeShoulderIdx = isLeftSide ? 12 : 11 // 12=Right, 11=Left
    const oppositeShoulder = landmarks[oppositeShoulderIdx]

    if (
      !a ||
      !b ||
      !c ||
      (a.visibility && a.visibility < 0.5) ||
      (b.visibility && b.visibility < 0.5)
    ) {
      this.state.formWarning = "Tracking lost — make sure your full body is in frame."
      this.state.formSignal = "poor"
      this.repLostTracking = true
      this.setLiveCue("Get in frame", timestampMs)
      return this.state
    }

    // Capture initial opposite shoulder position for compensation checking
    if (
      this.state.phase === "setup" &&
      oppositeShoulder &&
      (oppositeShoulder.visibility || 0) > 0.5
    ) {
      this.oppositeShoulderInitialY = oppositeShoulder.y
    }

    // Use 2D angle for more stability in single-camera setups
    let rawAngle = calculateAngle2D(a, b, c)

    // ── DIAGNOSTIC CP3: landmarks into angle function ─────────────────────────
    if (Math.random() < 0.033) { // ~1 in 30 frames
      console.log(
        `[DIAG CP3 TRIPLET] type=${this.type} isLeft=${isLeftSide} idx=[${aIdx},${bIdx},${cIdx}]`,
        `A={x:${a.x.toFixed(3)},y:${a.y.toFixed(3)},vis:${a.visibility?.toFixed(2)}}`,
        `B={x:${b.x.toFixed(3)},y:${b.y.toFixed(3)},vis:${b.visibility?.toFixed(2)}}`,
        `C={x:${c.x.toFixed(3)},y:${c.y.toFixed(3)},vis:${c.visibility?.toFixed(2)}}`,
      )
    }

    let computedAngle = 0
    if (this.type === "KneeFlexion") {
      computedAngle = Math.abs(180 - rawAngle)
    } else if (this.type === "ShoulderAbduction") {
      computedAngle = rawAngle
    }

    // ── DIAGNOSTIC CP4: raw angle result ─────────────────────────────────────
    if (Math.random() < 0.033) {
      console.log(
        `[DIAG CP4 RAW ANGLE] rawAngle=${rawAngle.toFixed(2)}° computedAngle=${computedAngle.toFixed(2)}°`,
        `(${this.type} uses ${this.type === "KneeFlexion" ? "180-raw" : "raw"})`,
      )
    }

    this.state.currentAngle = Math.round(computedAngle)

    // Check for compensation during rep
    if (
      this.state.phase !== "setup" &&
      this.oppositeShoulderInitialY !== null &&
      oppositeShoulder &&
      (oppositeShoulder.visibility || 0) > 0.5
    ) {
      if (Math.abs(oppositeShoulder.y - this.oppositeShoulderInitialY) > 0.08) {
        if (!this.state.formFlags.includes("Asymmetric compensation (shoulder tilt)")) {
          this.state.formFlags.push("Asymmetric compensation (shoulder tilt)")
        }
        this.state.formSignal = "poor"
        this.state.formWarning = "Keep your opposite shoulder still."
        this.setLiveCue("Level shoulders", timestampMs)
      }
    }

    // Reset peak flash before this frame's evaluation
    this.state.repPeakFlash = false

    // Setup-phase cue: prompt user to get into starting position
    if (this.state.phase === "setup") {
      const exerciseLabel = this.type === "KneeFlexion" ? "leg straight" : "arm at side"
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

    // Validate angle range
    if (angle < config.angle_range_valid[0] || angle > config.angle_range_valid[1]) {
      this.state.formWarning = "Angle out of plausible bounds."
      this.state.formSignal = "poor"
      this.repLostTracking = true
      return
    }

    // Basic form recovery if inside valid bounds and no active compensation triggered this frame
    if (
      this.state.formWarning === "Tracking lost — make sure your full body is in frame." ||
      this.state.formWarning === "Angle out of plausible bounds."
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

      // 10 degree tolerance to not instantly drop if they slightly waver
      const targetThreshold = config.rep_top_angle - 10

      if (angle >= targetThreshold) {
        if (!this.state.isHolding) {
          this.state.isHolding = true
        }
        
        // Accumulate time if we have a valid previous frame
        if (this.lastTimestampMs > 0 && !this.repLostTracking) {
          const deltaMs = timestampMs - this.lastTimestampMs
          // Cap delta to prevent huge jumps if tab was backgrounded
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

    if (this.state.phase === "setup") {
      if (angle > config.rep_start_angle + 10) {
        this.state.phase = "concentric"
        this.state.maxAngleThisRep = angle
        this.repStartTimeMs = timestampMs
        this.repLostTracking = false
        this.monotonicFails = 0
        this.state.formSignal = "good"
        this.state.formWarning = null
        this.setLiveCue("Keep lifting!", timestampMs)
      }
    } else if (this.state.phase === "concentric") {
      // Check jerkiness (angle dropping significantly during concentric phase)
      if (angle < this.lastAngle - 5) {
        this.monotonicFails += 1
        if (this.monotonicFails > 3) {
          this.state.formSignal = "poor"
          this.setLiveCue("Slow down", timestampMs)
          if (!this.state.formFlags.includes("Jerky movement")) {
            this.state.formFlags.push("Jerky movement")
          }
        }
      } else if (this.state.formSignal === "good") {
        // Provide guidance based on progress toward top angle
        const progress = angle / config.rep_top_angle
        if (angle >= config.rep_top_angle) {
          this.setLiveCue("Hold it!", timestampMs)
        } else if (progress >= 0.8) {
          this.setLiveCue("Almost there!", timestampMs)
        } else {
          this.setLiveCue("Keep lifting!", timestampMs)
        }
      }

      if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
      }

      // Multi-frame peak validation: angle must stay above rep_top_angle for
      // PEAK_FRAMES_REQUIRED consecutive frames before we confirm the peak.
      // This prevents a single noisy frame spike from falsely triggering the top.
      if (angle >= config.rep_top_angle) {
        this.peakFrameCount += 1
        if (this.peakFrameCount === this.PEAK_FRAMES_REQUIRED) {
          // Confirmed peak — flash the joint
          this.state.repPeakFlash = true
        }
      } else {
        // Dropped below threshold — reset the counter
        this.peakFrameCount = 0
      }

      // Switch to eccentric if we drop by 15 deg from max
      if (this.state.maxAngleThisRep - angle > 15) {
        this.state.phase = "eccentric"
        this.monotonicFails = 0
        this.peakFrameCount = 0
        this.setLiveCue("Lower slowly", timestampMs)
      }
    } else if (this.state.phase === "eccentric") {
      // Check jerkiness (angle increasing significantly during eccentric phase)
      if (angle > this.lastAngle + 5) {
        this.monotonicFails += 1
        if (this.monotonicFails > 3) {
          this.state.formSignal = "poor"
          this.setLiveCue("Control descent", timestampMs)
        }
      } else if (this.state.formSignal === "good") {
        this.setLiveCue("Lower slowly", timestampMs)
      }

      if (angle <= config.rep_start_angle) {
        // Evaluate if it was a valid rep
        const durationMs = timestampMs - this.repStartTimeMs

        let validRep = true
        let rejectReason = ""

        if (this.repLostTracking) {
          validRep = false
          rejectReason = "Tracking lost during rep"
        } else if (this.state.maxAngleThisRep < config.rep_top_angle) {
          validRep = false
          rejectReason = "Range too small"
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
          this.setLiveCue(rejectReason === "Range too small" ? "Full range" : "Try again", timestampMs)
          if (!this.state.formFlags.includes(`Incomplete/Rejected: ${rejectReason}`)) {
            this.state.formFlags.push(`Incomplete/Rejected: ${rejectReason}`)
          }
        }

        // Reset for next rep
        this.state.phase = "setup"
        this.state.maxAngleThisRep = 0
        this.repStartTimeMs = 0
        this.peakFrameCount = 0
        this.oppositeShoulderInitialY = null
      } else if (angle > this.state.maxAngleThisRep) {
        // Wait, they started going back up without finishing the rep
        this.state.maxAngleThisRep = angle
        this.state.phase = "concentric"
        this.monotonicFails = 0
      }
    }
  }
}
