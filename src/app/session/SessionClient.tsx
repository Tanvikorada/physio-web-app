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
import { ExerciseTutorial } from "@/components/session/ExerciseTutorial"
import { GuidedSessionTimer } from "@/components/session/GuidedSessionTimer"
import { DictionaryProvider } from "@/components/DictionaryProvider"
import Link from "next/link"
import { Suspense } from "react"

type SessionState =
  | "setup"
  | "screening"
  | "blocked"
  | "pre-pain"
  | "tutorial"
  | "active"
  | "guided"
  | "guided-complete"
  | "post-pain"
  | "summary"

export default function SessionClient({ 
  initialExerciseData,
  locale = "en",
}: { 
  initialExerciseData?: { id: string, name: string, trackingMode: string, targetHoldSeconds: number | null, instructionsFull: string | null, description: string | null, landmarkConfig: any } | null
  locale?: string
}) {
  return (
    <DictionaryProvider initialLanguage={locale}>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-recovery" />
            <p className="font-sans text-sm text-ink/60">Loading session...</p>
          </div>
        </div>
      }>
        <SessionPageContent initialExerciseData={initialExerciseData} locale={locale} />
      </Suspense>
    </DictionaryProvider>
  )
}

function SessionPageContent({ 
  initialExerciseData,
  locale = "en",
}: { 
  initialExerciseData?: { id: string, name: string, trackingMode: string, targetHoldSeconds: number | null, instructionsFull: string | null, description: string | null, landmarkConfig: any } | null
  locale?: string
}) {
  const { t } = useTranslation()
  // ALL modes (A, B, C, D) go through screening first — Mode D is instructional but still needs safety check.
  const [sessionState, setSessionState] = useState<SessionState>(
    initialExerciseData ? "screening" : "setup"
  )
  const searchParams = useSearchParams()
  const defaultEx = searchParams.get("exercise") === "Shoulder Abduction" ? "ShoulderAbduction" : "KneeFlexion"
  
  // Use exercise_id from landmarkConfig if present, otherwise fall back to exercise name
  const [exercise, setExercise] = useState<string>(
    initialExerciseData
      ? (initialExerciseData.landmarkConfig?.exercise_id || initialExerciseData.name)
      : defaultEx
  )


  // Pain check-ins
  const [prePain, setPrePain] = useState<number | undefined>(undefined)
  const [postPain, setPostPain] = useState<number | undefined>(undefined)
  const [targetModifier, setTargetModifier] = useState<{
    message: string
    repModifier: number
    romModifier: number
  } | null>(null)

  // Results
  const [finalReps, setFinalReps] = useState(0)
  const [rejectedReps, setRejectedReps] = useState(0)
  const [maxAngle, setMaxAngle] = useState(0)
  const [formWarning, setFormWarning] = useState<string | null>(null)
  const [formFlags, setFormFlags] = useState<string[]>([])
  const [holdTimeMs, setHoldTimeMs] = useState<number | undefined>(undefined)
  const [targetHoldMs, setTargetHoldMs] = useState<number | undefined>(undefined)

  // LLM Feedback
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState(false)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleStartSetup = () => {
    setSessionState("screening")
  }

  const handleScreeningClear = () => {
    // Always show pre-pain slider — never skip it
    setSessionState("pre-pain")
  }

  const handleScreeningBlock = async (flags: string[]) => {
    setSessionState("blocked")
    const exName = initialExerciseData?.name || (exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction")
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exName,
          status: "blocked",
          blockedReason: `Red flag screening triggered: ${flags.join(", ")}`,
        }),
      })
    } catch (e) {
      console.error("Failed to save blocked session", e)
    }
  }

  const handlePrePainSubmit = async (score: number) => {
    setPrePain(score)
    const exName = initialExerciseData?.name || (exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction")

    // Hard block if score ≥ 7 (Red Light)
    if (score >= 7) {
      setSessionState("blocked")
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName: exName,
            status: "blocked",
            blockedReason: `Pre-session pain score ${score}/10 — Red Light zone. Prevented to avoid tissue damage.`,
            painScorePre: score,
          }),
        })
      } catch (e) {
        console.error("Failed to save blocked session", e)
      }
      return
    }

    // Adaptive: reduce ROM target if moderate pain (4–6)
    if (score >= 4) {
      setTargetModifier({
        message: `Pain reported is moderate (${score}/10) — your target Range of Motion has been reduced by 20%.`,
        repModifier: 1.0,
        romModifier: 0.8,
      })
    } else {
      setTargetModifier(null)
    }

    // Mode D: skip tutorial & camera — go straight to guided timer
    if (initialExerciseData?.trackingMode === "D") {
      setSessionState("guided")
      return
    }

    // All other modes: show tutorial before camera opens
    setSessionState("tutorial")
  }

  const handleActiveSessionComplete = (state: { reps: number; rejectedReps: number; maxAngle: number; formWarning: string | null; formFlags: string[]; holdTimeMs?: number; targetHoldMs?: number }) => {
    setFinalReps(state.reps)
    setRejectedReps(state.rejectedReps)
    setMaxAngle(state.maxAngle)
    setFormWarning(state.formWarning)
    setFormFlags(state.formFlags)
    if (state.holdTimeMs !== undefined) setHoldTimeMs(state.holdTimeMs)
    if (state.targetHoldMs !== undefined) setTargetHoldMs(state.targetHoldMs)
    setSessionState("post-pain")
  }

  const handlePostPainSubmit = async (score: number) => {
    setPostPain(score)
    setSessionState("summary")
    const exName = initialExerciseData?.name || (exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction")

    let createdSessionId: string | undefined = undefined

    // Save session to DB
    try {
      const formAccuracyScore =
        finalReps + rejectedReps > 0 ? finalReps / (finalReps + rejectedReps) : 1.0

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exName,
          status: "completed",
          romAchieved: maxAngle,
          validRepCount: finalReps,
          rejectedRepCount: rejectedReps,
          formQualityFlags: formFlags,
          formAccuracyScore,
          painScorePre: prePain,
          painScorePost: score,
        }),
      })

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        createdSessionId = sessionData.session?.id
      }
    } catch (e) {
      console.error("Failed to save session", e)
    }

    // Generate Groq feedback
    setIsGeneratingFeedback(true)
    setFeedbackError(false)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: createdSessionId,
          exercise: exName,
          reps: finalReps,
          rejectedReps,
          maxAngle,
          formFlagsObserved: formFlags,
          formWarning: formWarning,
          trackingMode: initialExerciseData?.trackingMode,
          holdTimeMs: holdTimeMs,
          targetHoldMs: targetHoldMs,
        }),
      })

      if (!res.ok) throw new Error(`Feedback API error: ${res.status}`)

      const data = await res.json()
      if (data.feedback) {
        setFeedback(data.feedback)
      } else {
        throw new Error("No feedback in response")
      }
    } catch (err) {
      console.error("Groq feedback failed:", err)
      setFeedbackError(true)
      setFeedback(null)
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  // SETUP — exercise picker
  if (sessionState === "setup") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="w-full space-y-8">
          <div className="space-y-2">
            <p className="font-sans text-xs uppercase tracking-widest text-ink/40">New Session</p>
            <h1 className="font-serif text-3xl text-ink">Choose exercise</h1>
          </div>

          <div className="flex w-full flex-col gap-4">
            <button
              onClick={() => setExercise("Isometric Neck Flexion")}
              className={`w-full rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                exercise === "Isometric Neck Flexion"
                  ? "border-recovery bg-recovery/10 shadow-md"
                  : "border-line bg-white hover:border-recovery/40"
              }`}
            >
              <div className="font-serif text-xl text-ink">Isometric Neck Flexion (Mode B)</div>
              <div className="mt-1 font-sans text-sm text-ink/60">
                Press forehead into hand · Target: 10s Hold
              </div>
            </button>

            <button
              onClick={() => setExercise("ShoulderAbduction")}
              className={`w-full rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
                exercise === "ShoulderAbduction"
                  ? "border-recovery bg-recovery/10 shadow-md"
                  : "border-line bg-white hover:border-recovery/40"
              }`}
            >
              <div className="font-serif text-xl text-ink">Shoulder Abduction</div>
              <div className="mt-1 font-sans text-sm text-ink/60">
                Raising arm out to the side · Target: 180°
              </div>
            </button>
          </div>

          <Button onClick={handleStartSetup} size="lg" className="w-full h-14 text-base">
            Continue →
          </Button>
        </div>
      </div>
    )
  }

  // SCREENING
  if (sessionState === "screening") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-8">
        <RedFlagScreening onClear={handleScreeningClear} onBlock={handleScreeningBlock} />
      </div>
    )
  }

  // BLOCKED
  if (sessionState === "blocked") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-signal/10 flex items-center justify-center text-signal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl text-ink">Session Paused</h1>
          <p className="font-sans text-base text-ink/70 leading-relaxed">
            {prePain !== undefined && prePain >= 7
              ? `You reported a pain score of ${prePain}/10 — this is in the Red Light zone. To prevent potential tissue damage, this exercise has been paused.`
              : "A safety concern was detected during screening. Please consult your physiotherapist before continuing."}
          </p>
          <p className="font-sans text-sm text-ink/50 mt-2">
            We strongly recommend checking in with your physiotherapist before your next session.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-3 w-full">
          <Link
            href="/dashboard"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-recovery text-white font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Return to Dashboard
          </Link>
          <button
            onClick={() => { setPrePain(undefined); setSessionState("setup") }}
            className="font-sans text-sm text-ink/50 hover:text-ink/70 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  // PRE-PAIN — always shown before camera opens
  if (sessionState === "pre-pain") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-recovery" />
              <div className="h-0.5 w-8 bg-recovery" />
              <div className="h-2 w-2 rounded-full bg-recovery ring-2 ring-recovery/30" />
              <div className="h-0.5 w-8 bg-line" />
              <div className="h-2 w-2 rounded-full bg-line" />
            </div>
            <span className="ml-2 font-sans text-xs text-ink/40 uppercase tracking-wide">Step 2 of 3 — Pre-session check</span>
          </div>

          <PainSlider
            label="Rate your pain right now, before we begin"
            onSubmit={handlePrePainSubmit}
          />
        </div>
      </div>
    )
  }

  // TUTORIAL — exercise guide before camera opens
  if (sessionState === "tutorial") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-start min-h-screen p-6 py-10">
        <ExerciseTutorial
          exerciseType={exercise}
          onReady={() => setSessionState("active")}
          initialExerciseData={initialExerciseData}
        />
      </div>
    )
  }

  // ACTIVE — full-screen camera tracking
  if (sessionState === "active") {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-ink">
        <LiveCamera
          exerciseType={exercise}
          onSessionComplete={handleActiveSessionComplete}
          targetModifier={targetModifier}
          dynamicConfig={initialExerciseData?.landmarkConfig}
          trackingMode={initialExerciseData?.trackingMode}
          targetHoldSeconds={initialExerciseData?.targetHoldSeconds}
        />
      </div>
    )
  }

  // GUIDED — Mode D: instructional + timer only, no camera
  if (sessionState === "guided") {
    // Breathing / relaxation → 2-minute countdown; gait/walking → stopwatch; default 90s
    const decideDuration = (): number | null => {
      const nm = (initialExerciseData?.name ?? "").toLowerCase()
      if (nm.includes("walk") || nm.includes("gait") || nm.includes("stair") || nm.includes("step")) {
        return null // stopwatch
      }
      return initialExerciseData?.targetHoldSeconds ?? 90
    }

    return (
      <GuidedSessionTimer
        exerciseName={initialExerciseData?.name ?? exercise}
        instructions={
          initialExerciseData?.instructionsFull ||
          initialExerciseData?.description ||
          null
        }
        durationSeconds={decideDuration()}
        onComplete={() => setSessionState("guided-complete")}
      />
    )
  }

  // GUIDED-COMPLETE — Mode D: simple completion confirmation, no Groq
  if (sessionState === "guided-complete") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-8 text-center gap-8">
        {/* Checkmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-recovery/10 text-recovery">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-ink">Well done!</h1>
          <p className="font-sans text-base text-ink/60 leading-relaxed max-w-xs">
            You completed <span className="font-medium text-ink">{initialExerciseData?.name ?? exercise}</span>.
            This was a guided session and was not tracked by AI.
          </p>
        </div>

        {/* Pain check nudge */}
        <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-sm text-left">
          <p className="font-sans text-sm text-ink/70 leading-relaxed">
            💬 <span className="font-medium">Note any pain changes.</span> If your pain increased during this exercise, log it in your dashboard and consider speaking with your physiotherapist.
          </p>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-recovery font-sans font-medium text-paper hover:opacity-90 transition-opacity"
          >
            View Dashboard
          </Link>
          <button
            onClick={() => setSessionState("setup")}
            className="font-sans text-sm text-ink/50 hover:text-ink/70 transition-colors"
          >
            Start another session
          </button>
        </div>
      </div>
    )
  }

  // POST-PAIN — always shown after session ends, before summary
  if (sessionState === "post-pain") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-recovery" />
              <div className="h-0.5 w-8 bg-recovery" />
              <div className="h-2 w-2 rounded-full bg-recovery" />
              <div className="h-0.5 w-8 bg-recovery" />
              <div className="h-2 w-2 rounded-full bg-recovery ring-2 ring-recovery/30" />
            </div>
            <span className="ml-2 font-sans text-xs text-ink/40 uppercase tracking-wide">Step 3 of 3 — Post-session check</span>
          </div>

          <PainSlider
            label="Rate your pain now that the session is complete"
            onSubmit={handlePostPainSubmit}
          />

          {/* Quick rep summary so user has context */}
          <div className="rounded-xl border border-line bg-white/70 p-4 text-center">
            <p className="font-sans text-sm text-ink/60">
              Session complete —{" "}
              <span className="font-semibold text-recovery">{finalReps} valid rep{finalReps !== 1 ? "s" : ""}</span>
              {rejectedReps > 0 && (
                <span className="text-signal"> · {rejectedReps} not counted</span>
              )}
              {maxAngle > 0 && (
                <span className="text-ink/60"> · max {Math.round(maxAngle)}°</span>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // SUMMARY
  const exDisplayName = initialExerciseData?.name || (exercise === "KneeFlexion" ? "Knee Flexion" : "Shoulder Abduction")
  const baseTargetAngle = exercise === "KneeFlexion" ? 135 : 180
  const percentage = Math.min(100, Math.round((maxAngle / baseTargetAngle) * 100))
  const painDelta =
    prePain !== undefined && postPain !== undefined ? postPain - prePain : null

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-start min-h-screen p-8 pt-12">
      {/* Header */}
      <div className="w-full text-center mb-10">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-recovery/10 text-recovery mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-ink">{t("Session Complete")}</h1>
        <p className="font-sans text-sm text-ink/50 mt-1">{t(exDisplayName)}</p>
      </div>

      {/* Stat grid */}
      <div className="w-full grid grid-cols-2 gap-4 mb-8">
        {/* Arc */}
        <div className="col-span-2 flex flex-col items-center rounded-2xl border border-line bg-white p-6 shadow-sm">
          <ArcIndicator currentValue={maxAngle} targetValue={baseTargetAngle} />
          <p className="mt-3 font-sans text-sm text-ink/60 text-center">
            {percentage}% {t("of clinical target reached")}
          </p>
        </div>

        {/* Valid reps / Hold time */}
        {initialExerciseData?.trackingMode === "B" ? (
          <div className="flex flex-col items-center rounded-2xl border border-line bg-white p-5 shadow-sm">
            <span className="font-serif text-4xl text-recovery">{holdTimeMs ? Math.floor(holdTimeMs / 1000) : 0}</span>
            <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">{t("Seconds Held")}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-line bg-white p-5 shadow-sm">
            <span className="font-serif text-4xl text-recovery">{finalReps}</span>
            <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">{t("Valid reps")}</span>
          </div>
        )}

        {/* Not counted */}
        <div className="flex flex-col items-center rounded-2xl border border-line bg-white p-5 shadow-sm">
          <span className={`font-serif text-4xl ${rejectedReps > 0 ? "text-signal" : "text-ink/30"}`}>
            {rejectedReps}
          </span>
          <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">{t("Not counted")}</span>
        </div>

        {/* Pain delta */}
        {painDelta !== null && (
          <div className="col-span-2 flex flex-col items-center rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="font-serif text-2xl text-ink">{prePain}</span>
                <span className="font-sans text-[10px] text-ink/40 uppercase tracking-wide">{t("Before")}</span>
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={`font-serif text-lg ${
                    painDelta < 0 ? "text-recovery" : painDelta > 0 ? "text-signal" : "text-ink/50"
                  }`}
                >
                  {painDelta > 0 ? `+${painDelta}` : painDelta}
                </span>
                <span className="font-sans text-[10px] text-ink/40 uppercase tracking-wide">{t("Change")}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-serif text-2xl text-ink">{postPain}</span>
                <span className="font-sans text-[10px] text-ink/40 uppercase tracking-wide">{t("After")}</span>
              </div>
            </div>
            <p className="font-sans text-xs text-ink/50 mt-2">{t("Pain score (0–10)")}</p>
          </div>
        )}
      </div>

      {/* AI Feedback */}
      <div className="w-full rounded-2xl border border-line bg-white p-6 shadow-sm mb-8">
        <h2 className="font-serif text-xl text-ink mb-3">{t("AI Feedback")}</h2>
        {isGeneratingFeedback ? (
          <div className="flex items-center gap-3 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-recovery" />
            <p className="font-sans text-sm text-ink/60 animate-pulse">{t("Analyzing your session...")}</p>
          </div>
        ) : feedbackError ? (
          <div className="flex items-start gap-3 rounded-lg bg-signal/10 border border-signal/20 p-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-signal shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="font-sans text-sm font-semibold text-signal">{t("AI feedback unavailable")}</p>
              <p className="font-sans text-sm text-ink/70 mt-1">{t("The AI analysis could not be generated for this session. Your session data has been saved. Try again after your next session.")}</p>
            </div>
          </div>
        ) : (
          <p className="font-sans text-base text-ink leading-relaxed">{feedback}</p>
        )}

        {formFlags.length > 0 && (
          <div className="mt-4 border-t border-line/50 pt-4">
            <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-2">Form notes</p>
            <ul className="space-y-1">
              {formFlags.map((flag, i) => (
                <li key={i} className="font-sans text-sm text-signal/80 flex items-start gap-2">
                  <span className="mt-0.5 text-signal">·</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-recovery text-white font-sans font-medium hover:opacity-90 transition-opacity"
        >
          View Dashboard
        </Link>
        <button
          onClick={() => {
            setSessionState("setup")
            setPrePain(undefined)
            setPostPain(undefined)
            setFinalReps(0)
            setRejectedReps(0)
            setMaxAngle(0)
            setFormFlags([])
            setFeedback(null)
          }}
          className="font-sans text-sm text-ink/50 hover:text-ink/70 transition-colors"
        >
          Start another session
        </button>
      </div>
    </div>
  )
}
