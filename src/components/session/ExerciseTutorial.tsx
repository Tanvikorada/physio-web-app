"use client"

import * as React from "react"
import { useState } from "react"
import { ExerciseType } from "@/lib/exercises/engine"
import { Button } from "@/components/ui/button"

interface ExerciseTutorialProps {
  exerciseType: string
  onReady: () => void
  initialExerciseData?: { id: string, name: string, trackingMode: string, landmarkConfig: any } | null 
}

const EXERCISE_DATA: Record<string, any> = {
  ShoulderAbduction: {
    name: "Shoulder Abduction",
    clinicalTarget: "180°",
    repTarget: "90° minimum",
    tagline: "Raise your arm out to the side",
    cameraPosition: "Face the camera straight on",
    cameraIcon: "👤",
    steps: [
      { icon: "1️⃣", text: "Stand facing the camera. Make sure your whole upper body is visible." },
      { icon: "2️⃣", text: "Let your arm hang naturally at your side. This is your starting position." },
      { icon: "3️⃣", text: "Slowly raise your arm straight out to the side — like making a T shape with your body." },
      { icon: "4️⃣", text: "Keep your arm straight (elbow not bent). Raise until it points upward if you can." },
      { icon: "5️⃣", text: "Slowly lower back to your side. That's one rep." },
    ],
    commonErrors: [
      "Bending the elbow — keep arm straight",
      "Raising forward instead of to the side",
      "Shrugging your shoulder — keep it down",
    ],
    whatAppMeasures: "The angle at your shoulder between your arm and your torso",
    colorKey: {
      green: "Good form — keep going",
      orange: "Form issue detected — check your position",
    },
    tip: "The app tracks your right or left arm automatically based on which side is more visible.",
  },
  KneeFlexion: {
    name: "Knee Flexion",
    clinicalTarget: "135°",
    repTarget: "90° minimum",
    tagline: "Bend and straighten your knee",
    cameraPosition: "Stand sideways to the camera",
    cameraIcon: "↩️",
    steps: [
      { icon: "1️⃣", text: "Stand sideways to the camera so your knee is visible in profile. Hold a chair or wall for balance." },
      { icon: "2️⃣", text: "Start with your leg straight. This is your starting position." },
      { icon: "3️⃣", text: "Slowly bend your knee, lifting your heel up toward the back of your thigh." },
      { icon: "4️⃣", text: "Bend as far as comfortable — aim for at least 90° (right angle)." },
      { icon: "5️⃣", text: "Slowly straighten your leg back to the starting position. That's one rep." },
    ],
    commonErrors: [
      "Facing the camera — you must be sideways",
      "Moving your hip or leaning — keep your thigh still",
      "Going too fast — slow and controlled counts",
    ],
    whatAppMeasures: "The angle at your knee between your thigh and your lower leg",
    colorKey: {
      green: "Good form — keep going",
      orange: "Form issue detected — check position",
    },
    tip: "The app measures knee bend from your hip, knee and ankle landmarks.",
  },
}

export function ExerciseTutorial({ exerciseType, onReady, initialExerciseData }: ExerciseTutorialProps) {
  const [step, setStep] = useState<"overview" | "howto" | "camera">("overview")
  
  // If we have dynamic data but it's not in our hardcoded list, we generate a fallback tutorial
  const data = EXERCISE_DATA[exerciseType] || {
    name: initialExerciseData?.name || exerciseType,
    clinicalTarget: initialExerciseData?.landmarkConfig?.rep_top_angle ? `${initialExerciseData.landmarkConfig.rep_top_angle}°` : "N/A",
    repTarget: initialExerciseData?.landmarkConfig?.rep_top_angle ? `${initialExerciseData.landmarkConfig.rep_top_angle}° minimum` : "N/A",
    tagline: "Follow on-screen instructions",
    cameraPosition: "Make sure your full body is visible",
    cameraIcon: "👤",
    steps: [
      { icon: "1️⃣", text: "Follow the clinical instructions provided for this exercise." },
      { icon: "2️⃣", text: "Ensure the camera can clearly see the joints involved." },
    ],
    commonErrors: [],
    colorKey: {
      green: "Good form — keep going",
      orange: "Form issue detected — check position",
    },
    tip: "Maintain a clear view to the camera.",
  }

  if (step === "overview") {
    return (
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="font-sans text-xs uppercase tracking-widest text-ink/40">Exercise Guide</p>
          <h1 className="font-serif text-3xl text-ink">{data.name}</h1>
          <p className="font-sans text-base text-ink/60">{data.tagline}</p>
        </div>

        {/* Key info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-white p-4 text-center space-y-1">
            <p className="font-sans text-xs text-ink/40 uppercase tracking-wide">Clinical Target</p>
            <p className="font-serif text-2xl text-recovery">{data.clinicalTarget}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 text-center space-y-1">
            <p className="font-sans text-xs text-ink/40 uppercase tracking-wide">Rep Counts If</p>
            <p className="font-serif text-2xl text-ink">&ge;{data.repTarget}</p>
          </div>
        </div>

        {/* Camera position highlight */}
        <div className="rounded-xl border-2 border-recovery/40 bg-recovery/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{data.cameraIcon}</span>
            <div>
              <p className="font-sans font-semibold text-recovery text-sm uppercase tracking-wide">Camera Position</p>
              <p className="font-serif text-xl text-ink mt-1">{data.cameraPosition}</p>
              <p className="font-sans text-sm text-ink/60 mt-1">
                {exerciseType === "KneeFlexion"
                  ? "Your knee joint must be visible in profile for accurate angle measurement."
                  : "Your full upper body facing the camera gives the best landmark detection."}
              </p>
            </div>
          </div>
        </div>

        {/* Color key */}
        <div className="rounded-xl border border-line bg-white p-4 space-y-3">
          <p className="font-sans text-xs text-ink/40 uppercase tracking-wide">What the colors mean</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-recovery" />
              <span className="font-sans text-sm text-ink">{data.colorKey.green}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-signal" />
              <span className="font-sans text-sm text-ink">{data.colorKey.orange}</span>
            </div>
          </div>
        </div>

        <Button onClick={() => setStep("howto")} size="lg" className="w-full h-14 text-base">
          How to do this exercise →
        </Button>
      </div>
    )
  }

  if (step === "howto") {
    return (
      <div className="w-full space-y-6">
        <div className="text-center space-y-1">
          <p className="font-sans text-xs uppercase tracking-widest text-ink/40">Step by step</p>
          <h2 className="font-serif text-2xl text-ink">{data.name}</h2>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {data.steps.map((s: any, i: number) => (
            <div key={i} className="flex gap-3 rounded-xl border border-line bg-white p-4">
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <p className="font-sans text-sm text-ink leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Common errors */}
        <div className="rounded-xl border border-signal/20 bg-signal/5 p-4 space-y-2">
          <p className="font-sans text-xs font-semibold text-signal uppercase tracking-wide">Avoid these common mistakes</p>
          {data.commonErrors.map((e: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-signal mt-0.5 font-bold text-sm">×</span>
              <p className="font-sans text-sm text-ink/80">{e}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("overview")}
            className="flex-1 h-12 rounded-xl border border-line font-sans text-sm text-ink/60 hover:text-ink transition-colors"
          >
            ← Back
          </button>
          <Button onClick={() => setStep("camera")} size="lg" className="flex-[2] h-12 text-base">
            Camera setup →
          </Button>
        </div>
      </div>
    )
  }

  // camera step
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-1">
        <p className="font-sans text-xs uppercase tracking-widest text-ink/40">Final check</p>
        <h2 className="font-serif text-2xl text-ink">Camera Setup</h2>
      </div>

      {/* Camera position visual */}
      <div className="rounded-2xl border-2 border-recovery bg-recovery/5 p-6 text-center space-y-4">
        <div className="text-5xl">{data.cameraIcon}</div>
        <div>
          <p className="font-serif text-xl text-ink">{data.cameraPosition}</p>
          <p className="font-sans text-sm text-ink/60 mt-2 max-w-xs mx-auto">
            {exerciseType === "KneeFlexion"
              ? "Your hip, knee, and ankle should all be visible from the side. If they are not, the angle can't be measured."
              : "Both shoulders and your arms should be fully visible. Back up a step if needed."}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-line bg-white p-4 space-y-3">
        <p className="font-sans text-xs text-ink/40 uppercase tracking-wide">Before you start</p>
        {[
          exerciseType === "KneeFlexion" ? "I'm standing sideways to the camera" : "I'm facing the camera",
          "My full body is visible and not cropped",
          "I have enough space to move freely",
          "I'll start with my arm/leg in the resting position",
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-recovery flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-recovery" />
            </div>
            <p className="font-sans text-sm text-ink">{item}</p>
          </div>
        ))}
      </div>

      <p className="font-sans text-xs text-ink/40 text-center">{data.tip}</p>

      <div className="flex gap-3">
        <button
          onClick={() => setStep("howto")}
          className="flex-1 h-12 rounded-xl border border-line font-sans text-sm text-ink/60 hover:text-ink transition-colors"
        >
          ← Back
        </button>
        <Button
          onClick={onReady}
          size="lg"
          className="flex-[2] h-12 text-base bg-recovery hover:opacity-90"
        >
          Start Tracking →
        </Button>
      </div>
    </div>
  )
}
