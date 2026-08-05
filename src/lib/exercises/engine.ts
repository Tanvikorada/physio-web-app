import { Point3D, calculateAngle2D } from "./angles"

export type ExerciseType = "KneeFlexion" | "ShoulderAbduction"

export interface ExerciseState {
  reps: number
  currentAngle: number
  maxAngleThisRep: number
  phase: "setup" | "concentric" | "eccentric" // setup=rest, concentric=moving to target, eccentric=returning
  formWarning: string | null
}

const CONFIG = {
  KneeFlexion: {
    targetAngle: 120, // Degrees of flexion (0 = straight leg, 120 = fully bent)
    startThreshold: 20, // Must return below 20 deg to finish rep
    activeThreshold: 30, // Start counting a rep if we pass 30 deg
    landmarkIndices: [24, 26, 28], // Right hip, knee, ankle (MediaPipe indices)
    // For left side it would be 23, 25, 27. We can just pick the most visible side.
  },
  ShoulderAbduction: {
    targetAngle: 120, 
    startThreshold: 20,
    activeThreshold: 30,
    landmarkIndices: [24, 12, 14], // Right hip, shoulder, elbow
  }
}

export class ExerciseEngine {
  public type: ExerciseType
  public state: ExerciseState

  private repThresholdMet: boolean = false
  private minAngleThisRep: number = 999

  constructor(type: ExerciseType) {
    this.type = type
    this.state = {
      reps: 0,
      currentAngle: 0,
      maxAngleThisRep: 0,
      phase: "setup",
      formWarning: null,
    }
  }

  public processLandmarks(landmarks: Point3D[]) {
    // Pick side (Right vs Left). For simplicity, we just check visibility or default to Right.
    // Right side indices:
    let [aIdx, bIdx, cIdx] = CONFIG[this.type].landmarkIndices
    
    // Check if left side is more visible
    const rightVisibility = (landmarks[aIdx]?.visibility || 0) + (landmarks[bIdx]?.visibility || 0) + (landmarks[cIdx]?.visibility || 0)
    const leftVisibility = (landmarks[aIdx - 1]?.visibility || 0) + (landmarks[bIdx - 1]?.visibility || 0) + (landmarks[cIdx - 1]?.visibility || 0)
    
    if (leftVisibility > rightVisibility) {
      aIdx -= 1
      bIdx -= 1
      cIdx -= 1
    }

    const a = landmarks[aIdx]
    const b = landmarks[bIdx]
    const c = landmarks[cIdx]

    if (!a || !b || !c || (a.visibility && a.visibility < 0.5) || (b.visibility && b.visibility < 0.5)) {
      this.state.formWarning = "Tracking lost — make sure your full body is in frame."
      return this.state
    }

    // Use 2D angle for more stability in single-camera setups
    let rawAngle = calculateAngle2D(a, b, c)

    let computedAngle = 0
    if (this.type === "KneeFlexion") {
      // 180 is straight leg, so flexion is 180 - angle
      computedAngle = Math.abs(180 - rawAngle)
    } else if (this.type === "ShoulderAbduction") {
      // Arm by side is small angle, raised is larger.
      computedAngle = rawAngle
    }

    // Smooth slightly (simple low-pass filter can be applied outside, but we keep it raw here for snappiness)
    this.state.currentAngle = Math.round(computedAngle)
    
    this.updateState()
    return this.state
  }

  private updateState() {
    const angle = this.state.currentAngle
    const config = CONFIG[this.type]

    // Form warning: check erratic tracking
    if (angle > 180 || angle < 0) {
      this.state.formWarning = "Erratic tracking detected."
    } else {
      this.state.formWarning = null
    }

    if (this.state.phase === "setup") {
      if (angle > config.activeThreshold) {
        this.state.phase = "concentric"
        this.state.maxAngleThisRep = angle
        this.repThresholdMet = false
      }
    } else if (this.state.phase === "concentric") {
      if (angle > this.state.maxAngleThisRep) {
        this.state.maxAngleThisRep = angle
      }
      
      // If we start moving back down significantly (e.g. by 15 degrees), we switch to eccentric
      if (this.state.maxAngleThisRep - angle > 15) {
        this.state.phase = "eccentric"
        
        // Form check: range too small?
        if (this.state.maxAngleThisRep < config.targetAngle * 0.5) {
          this.state.formWarning = "Range too small — try to push further if comfortable."
        }
      }
    } else if (this.state.phase === "eccentric") {
      if (angle <= config.startThreshold) {
        // Evaluate if it was a valid rep
        const validRep = this.state.maxAngleThisRep >= config.targetAngle * 0.4
        
        if (validRep) {
          this.state.reps += 1
          this.state.formWarning = null // clear warning on valid rep
        } else {
          this.state.formWarning = "Rep too shallow to count."
        }
        
        // Reset for next rep
        this.state.phase = "setup"
        this.state.maxAngleThisRep = 0
      } else if (angle > this.state.maxAngleThisRep) {
        // Wait, they started going back up without finishing the rep
        this.state.maxAngleThisRep = angle
        this.state.phase = "concentric"
      }
    }
  }
}
