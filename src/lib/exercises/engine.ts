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
}

const CONFIG = {
  KneeFlexion: {
    exercise_id: "knee_flexion",
    landmarks_used: [24, 26, 28], // Right hip, knee, ankle (MediaPipe indices)
    primary_joint: "knee",
    angle_range_valid: [0, 160], // Degrees of flexion (180 - raw angle)
    rep_start_angle: 20, // Must return below 20 deg to finish rep
    rep_top_angle: 90, // Must exceed 90 deg to count as a good rep
    min_rep_duration_ms: 1000, 
    max_rep_duration_ms: 8000,
  },
  ShoulderAbduction: {
    exercise_id: "shoulder_abduction",
    landmarks_used: [24, 12, 14], // Right hip, shoulder, elbow
    primary_joint: "shoulder",
    angle_range_valid: [0, 180], // Raw angle
    rep_start_angle: 25,
    rep_top_angle: 90,
    min_rep_duration_ms: 800,
    max_rep_duration_ms: 6000,
  }
}

export class ExerciseEngine {
  public type: ExerciseType
  public state: ExerciseState
  public config: typeof CONFIG["KneeFlexion"]

  private minAngleThisRep: number = 999
  private repStartTimeMs: number = 0
  private lastAngle: number = 0
  private lastTimestampMs: number = 0
  
  // Track visibility for current rep
  private repLostTracking: boolean = false
  // Track jerky movement
  private monotonicFails: number = 0
  private oppositeShoulderInitialY: number | null = null

  constructor(type: ExerciseType, romModifier: number = 1.0) {
    this.type = type
    
    // Copy config and apply ROM modifier to the rep_top_angle
    const baseConfig = CONFIG[type]
    this.config = {
      ...baseConfig,
      rep_top_angle: baseConfig.rep_top_angle * romModifier
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
    }
  }

  public processLandmarks(landmarks: Point3D[], timestampMs: number) {
    // Pick side (Right vs Left).
    const config = this.config
    let [aIdx, bIdx, cIdx] = config.landmarks_used
    
    // Check if left side is more visible
    const rightVisibility = (landmarks[aIdx]?.visibility || 0) + (landmarks[bIdx]?.visibility || 0) + (landmarks[cIdx]?.visibility || 0)
    const leftVisibility = (landmarks[aIdx - 1]?.visibility || 0) + (landmarks[bIdx - 1]?.visibility || 0) + (landmarks[cIdx - 1]?.visibility || 0)
    
    let isLeftSide = false
    if (leftVisibility > rightVisibility) {
      aIdx -= 1
      bIdx -= 1
      cIdx -= 1
      isLeftSide = true
    }

    const a = landmarks[aIdx]
    const b = landmarks[bIdx]
    const c = landmarks[cIdx]
    
    // Compensation check (opposite shoulder tilt)
    const oppositeShoulderIdx = isLeftSide ? 12 : 11 // 12=Right, 11=Left
    const oppositeShoulder = landmarks[oppositeShoulderIdx]

    if (!a || !b || !c || (a.visibility && a.visibility < 0.5) || (b.visibility && b.visibility < 0.5)) {
      this.state.formWarning = "Tracking lost — make sure your full body is in frame."
      this.state.formSignal = "poor"
      this.repLostTracking = true
      return this.state
    }

    // Capture initial opposite shoulder position for compensation checking
    if (this.state.phase === "setup" && oppositeShoulder && (oppositeShoulder.visibility || 0) > 0.5) {
      this.oppositeShoulderInitialY = oppositeShoulder.y
    }

    // Use 2D angle for more stability in single-camera setups
    let rawAngle = calculateAngle2D(a, b, c)

    let computedAngle = 0
    if (this.type === "KneeFlexion") {
      computedAngle = Math.abs(180 - rawAngle)
    } else if (this.type === "ShoulderAbduction") {
      computedAngle = rawAngle
    }

    this.state.currentAngle = Math.round(computedAngle)
    
    // Check for compensation during rep
    if (this.state.phase !== "setup" && this.oppositeShoulderInitialY !== null && oppositeShoulder && (oppositeShoulder.visibility || 0) > 0.5) {
       // if opposite shoulder moves vertically more than a threshold (e.g., 0.05 normalized screen height)
       if (Math.abs(oppositeShoulder.y - this.oppositeShoulderInitialY) > 0.08) {
          if (!this.state.formFlags.includes("Asymmetric compensation (shoulder tilt)")) {
            this.state.formFlags.push("Asymmetric compensation (shoulder tilt)")
          }
          this.state.formSignal = "poor"
          this.state.formWarning = "Keep your opposite shoulder still."
       }
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
    if (this.state.formWarning === "Tracking lost — make sure your full body is in frame." || this.state.formWarning === "Angle out of plausible bounds.") {
       this.state.formWarning = null
       this.state.formSignal = "good"
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
      }
    } else if (this.state.phase === "concentric") {
      // Check jerkiness (angle dropping significantly during concentric phase)
      if (angle < this.lastAngle - 5) {
         this.monotonicFails += 1
         if (this.monotonicFails > 3) {
            this.state.formSignal = "poor"
            if (!this.state.formFlags.includes("Jerky movement")) {
               this.state.formFlags.push("Jerky movement")
            }
         }
      }

      if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
      }
      
      // Switch to eccentric if we drop by 15 deg from max
      if (this.state.maxAngleThisRep - angle > 15) {
        this.state.phase = "eccentric"
        this.monotonicFails = 0
      }
    } else if (this.state.phase === "eccentric") {
      // Check jerkiness (angle increasing significantly during eccentric phase)
      if (angle > this.lastAngle + 5) {
         this.monotonicFails += 1
         if (this.monotonicFails > 3) {
            this.state.formSignal = "poor"
         }
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
        } else {
          this.state.rejectedReps += 1
          this.state.formWarning = `Rep rejected: ${rejectReason}`
          this.state.formSignal = "poor"
          if (!this.state.formFlags.includes(`Incomplete/Rejected: ${rejectReason}`)) {
            this.state.formFlags.push(`Incomplete/Rejected: ${rejectReason}`)
          }
        }
        
        // Reset for next rep
        this.state.phase = "setup"
        this.state.maxAngleThisRep = 0
        this.repStartTimeMs = 0
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
