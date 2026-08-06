"use client"

import * as React from "react"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ExerciseType } from "@/lib/exercises/engine"
import { LiveCamera } from "@/components/session/LiveCamera"
import { Button } from "@/components/ui/button"
import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { PainSlider } from "@/components/session/PainSlider"
import { RedFlagScreening } from "@/components/session/RedFlagScreening"
import Link from "next/link"

type SessionState = "setup" | "screening" | "blocked" | "pre-pain" | "active" | "post-pain" | "summary"

import { Suspense } from "react"

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading session...</div>}>
      <SessionPageContent />
    </Suspense>
  )
}

function SessionPageContent() {
  const [sessionState, setSessionState] = useState<SessionState>("setup")
  const searchParams = useSearchParams()
  const defaultEx = searchParams.get("exercise") === "Shoulder Abduction" ? "ShoulderAbduction" : "KneeFlexion"
  const [exercise, setExercise] = useState<ExerciseType>(defaultEx as ExerciseType)
  
  // Pain check-ins
  const [prePain, setPrePain] = useState<number | undefined>(undefined)
  const [postPain, setPostPain] = useState<number | undefined>(undefined)
  const [targetModifier, setTargetModifier] = useState<{ message: string, repModifier: number, romModifier: number } | null>(null)

  // Results
  const [finalReps, setFinalReps] = useState(0)
  const [rejectedReps, setRejectedReps] = useState(0)
  const [maxAngle, setMaxAngle] = useState(0)
  const [formWarning, setFormWarning] = useState<string | null>(null)
  const [formFlags, setFormFlags] = useState<string[]>([])
  
  // LLM Feedback
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)

  const handleStartSetup = () => {
    setSessionState("screening")
  }

  const handleScreeningClear = () => {
    setSessionState("pre-pain")
  }

  const handleScreeningBlock = async (flags: string[]) => {
    setSessionState("blocked")
    // Save blocked session to Database
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction",
          status: "blocked",
          blockedReason: `Flags triggered: ${flags.join(", ")}`,
        })
      })
    } catch (e) {
      console.error("Failed to save blocked session", e)
    }
  }

  const handlePrePainSubmit = async (score: number) => {
    setPrePain(score)
    
    // Phase 3 Adaptive Logic: Hard block if score >= 7 (Red Light)
    if (score >= 7) {
      setSessionState("blocked")
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName: exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction",
            status: "blocked",
            blockedReason: "Pre-session pain score >= 7 (Red Light zone). Prevented to avoid tissue damage.",
            painScorePre: score
          })
        })
      } catch (e) {
        console.error("Failed to save blocked session", e)
      }
      return
    } 
    
    // Adaptive Logic: Modify target if score >= 4 (Yellow Light)
    if (score >= 4) {
      setTargetModifier({ message: "Pain reported is moderate — your target Range of Motion has been reduced by 20%.", repModifier: 1.0, romModifier: 0.8 })
    } else {
      setTargetModifier(null)
    }
    setSessionState("active")
  }

  const handleActiveSessionComplete = (finalData: { reps: number; rejectedReps: number; maxAngle: number; formWarning: string | null; formFlags: string[] }) => {
    setFinalReps(finalData.reps)
    setRejectedReps(finalData.rejectedReps)
    setMaxAngle(finalData.maxAngle)
    setFormWarning(finalData.formWarning)
    setFormFlags(finalData.formFlags)
    setSessionState("post-pain")
  }

  const handlePostPainSubmit = async (score: number) => {
    setPostPain(score)
    setSessionState("summary")
    
    let createdSessionId: string | undefined = undefined;
    
    // Save to Database
    try {
      const formAccuracyScore = (finalReps + rejectedReps > 0) ? (finalReps / (finalReps + rejectedReps)) : 1.0;
      
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction",
          status: "completed",
          romAchieved: maxAngle,
          validRepCount: finalReps,
          rejectedRepCount: rejectedReps,
          formQualityFlags: formFlags,
          formAccuracyScore: formAccuracyScore,
          painScorePre: prePain,
          painScorePost: score,
        })
      })
      
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        createdSessionId = sessionData.session?.id
      }
    } catch (e) {
      console.error("Failed to save session", e)
    }

    // Call Groq AI Feedback
    setIsGeneratingFeedback(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: createdSessionId,
          exercise,
          reps: finalReps,
          rejectedReps: rejectedReps,
          maxAngle: maxAngle,
          formFlagsObserved: formFlags,
        })
      })
      
      if (!res.ok) {
        throw new Error("API responded with failure")
      }
      
      const data = await res.json()
      if (data.feedback) {
        setFeedback(data.feedback)
      } else {
        throw new Error("No feedback in response")
      }
    } catch (err) {
      console.error(err)
      setFeedback("AI feedback is currently unavailable. Great job completing your session!")
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  if (sessionState === "setup") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center p-8 pt-24 text-center">
        <h1 className="mb-8 font-serif text-3xl text-ink">New Session</h1>
        <div className="mb-12 flex w-full flex-col gap-4">
          <Button 
            variant={exercise === "KneeFlexion" ? "default" : "outline"}
            onClick={() => setExercise("KneeFlexion")}
            size="lg"
          >
            Knee Flexion
          </Button>
          <Button 
            variant={exercise === "ShoulderAbduction" ? "default" : "outline"}
            onClick={() => setExercise("ShoulderAbduction")}
            size="lg"
          >
            Shoulder Abduction
          </Button>
        </div>
        <Button onClick={handleStartSetup} size="lg" className="w-full">
          Continue
        </Button>
      </div>
    )
  }

  if (sessionState === "screening") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center p-8 pt-12">
        <RedFlagScreening onClear={handleScreeningClear} onBlock={handleScreeningBlock} />
      </div>
    )
  }

  if (sessionState === "blocked") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center p-8 pt-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-signal/10 flex items-center justify-center mb-4 text-signal text-3xl font-serif">!</div>
        <h1 className="font-serif text-3xl text-ink">Session Paused</h1>
        <p className="font-sans text-lg text-ink/80 leading-relaxed">
          You reported a pain score in the "Red Light" zone (7-10). To prevent potential tissue damage, this exercise has been paused. We strongly recommend checking in with your physiotherapist before continuing.
        </p>
        <div className="pt-8">
          <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (sessionState === "pre-pain") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center p-8 pt-24">
        <PainSlider 
          label="What is your pain level before starting?"
          onSubmit={handlePrePainSubmit}
        />
      </div>
    )
  }

  if (sessionState === "active") {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-ink">
        <LiveCamera 
          exerciseType={exercise} 
          onSessionComplete={handleActiveSessionComplete} 
          targetModifier={targetModifier}
        />
      </div>
    )
  }

  if (sessionState === "post-pain") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center p-8 pt-24">
        <PainSlider 
          label="What is your pain level right now?"
          onSubmit={handlePostPainSubmit}
        />
      </div>
    )
  }

  // Summary State
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-8 pt-16 text-center">
      <h1 className="mb-12 font-serif text-3xl text-ink">Session Complete</h1>
      
      <div className="mb-12 flex w-full justify-center gap-16">
        <div className="flex flex-col items-center">
          <span className="mb-2 font-sans text-sm text-ink/60 uppercase tracking-wide">Reps</span>
          <span className="font-serif text-2xl text-ink">{finalReps}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="mb-2 font-sans text-sm text-ink/60 uppercase tracking-wide">Max Angle</span>
          <span className="font-serif text-2xl text-ink">{Math.round(maxAngle)}&deg;</span>
        </div>
      </div>

      <div className="mb-16 w-full rounded-xl border border-line bg-white p-8 shadow-sm">
        <h2 className="mb-4 font-serif text-xl text-ink">Feedback</h2>
        {isGeneratingFeedback ? (
          <p className="animate-pulse font-sans text-base text-ink/60">Analyzing your session...</p>
        ) : (
          <p className="font-sans text-lg text-ink leading-relaxed">{feedback}</p>
        )}
      </div>

      <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        Done
      </Link>
    </div>
  )
}
