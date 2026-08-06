"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"

interface GuidedSessionTimerProps {
  exerciseName: string
  instructions: string | null
  /** Target duration in seconds. Pass null for stopwatch (open-ended) mode. */
  durationSeconds: number | null
  onComplete: () => void
}

export function GuidedSessionTimer({
  exerciseName,
  instructions,
  durationSeconds,
  onComplete,
}: GuidedSessionTimerProps) {
  const isStopwatch = durationSeconds === null

  const [elapsedMs, setElapsedMs] = useState(0)
  const [remainingMs, setRemainingMs] = useState((durationSeconds ?? 0) * 1000)
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    if (isStopwatch) {
      setElapsedMs((prev) => prev + 100)
    } else {
      setRemainingMs((prev) => {
        if (prev <= 100) {
          setIsRunning(false)
          setIsFinished(true)
          return 0
        }
        return prev - 100
      })
    }
  }, [isStopwatch])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 100)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, tick])

  // Auto-complete when countdown reaches zero
  useEffect(() => {
    if (isFinished && !isStopwatch) {
      const t = setTimeout(onComplete, 1500)
      return () => clearTimeout(t)
    }
  }, [isFinished, isStopwatch, onComplete])

  const handleStart = () => setIsRunning(true)
  const handlePause = () => setIsRunning(false)
  const handleFinish = () => {
    setIsRunning(false)
    setIsFinished(true)
    onComplete()
  }

  const formatTime = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000)
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const totalMs = (durationSeconds ?? 1) * 1000
  const progress = isStopwatch ? 0 : Math.max(0, 1 - remainingMs / totalMs)
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const isAtStart = elapsedMs === 0 && remainingMs === totalMs

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      {/* ─── Persistent disclaimer banner ─── */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-ink px-4 py-2.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4 shrink-0 text-paper/70"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="font-sans text-xs font-medium uppercase tracking-widest text-paper/70">
          Guided session — not tracked by AI
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-start gap-8 px-6 py-10">
        {/* Exercise name */}
        <div className="text-center">
          <p className="font-sans text-xs uppercase tracking-widest text-ink/40 mb-1">Guided Exercise</p>
          <h1 className="font-serif text-3xl text-ink">{exerciseName}</h1>
        </div>

        {/* Timer ring */}
        <div className="relative flex h-52 w-52 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 196 196" width="208" height="208">
            {/* Track */}
            <circle cx="98" cy="98" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="8" />
            {/* Countdown arc */}
            {!isStopwatch && (
              <circle
                cx="98"
                cy="98"
                r={radius}
                fill="none"
                stroke="var(--color-recovery)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.1s linear" }}
              />
            )}
            {/* Stopwatch rotating dot indicator */}
            {isStopwatch && isRunning && (
              <circle
                cx="98"
                cy="98"
                r={radius}
                fill="none"
                stroke="var(--color-recovery)"
                strokeWidth="8"
                strokeDasharray="28 472"
                strokeDashoffset={-(elapsedMs / 50) % circumference}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.1s linear" }}
              />
            )}
          </svg>

          <div className="text-center">
            {isFinished && !isStopwatch ? (
              <span className="font-serif text-4xl text-recovery">Done!</span>
            ) : isStopwatch ? (
              <>
                <span className="font-serif text-4xl text-ink">{formatTime(elapsedMs)}</span>
                <p className="font-sans text-xs text-ink/40 mt-1 uppercase tracking-wide">elapsed</p>
              </>
            ) : (
              <>
                <span className="font-serif text-4xl text-ink">{formatTime(remainingMs)}</span>
                <p className="font-sans text-xs text-ink/40 mt-1 uppercase tracking-wide">remaining</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        {!isFinished && (
          <div className="flex w-full gap-3">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex-1 rounded-2xl bg-recovery py-4 font-sans font-medium text-paper transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                {isStopwatch || isAtStart ? "Start" : "Resume"}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 rounded-2xl border-2 border-line bg-white py-4 font-sans font-medium text-ink transition-colors hover:border-recovery/40"
              >
                Pause
              </button>
            )}

            {/* Stopwatch always shows a Finish button */}
            {isStopwatch && (
              <button
                onClick={handleFinish}
                className="flex-1 rounded-2xl border-2 border-signal/30 bg-white py-4 font-sans font-medium text-signal transition-colors hover:border-signal"
              >
                Finish
              </button>
            )}
          </div>
        )}

        {/* Instructions card */}
        {instructions && (
          <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-ink/40">
              How to do this exercise
            </h2>
            <p className="font-sans text-sm leading-relaxed text-ink/80 whitespace-pre-line">
              {instructions}
            </p>
          </div>
        )}

        <Link
          href="/dashboard"
          className="font-sans text-sm text-ink/40 hover:text-ink/60 transition-colors"
        >
          Exit session
        </Link>
      </div>
    </div>
  )
}
