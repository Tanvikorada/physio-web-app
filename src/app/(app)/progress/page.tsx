import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { ExportModal } from "@/components/dashboard/ExportModal"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateTrendSummary } from "@/lib/ai"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    redirect("/")
  }

  // ── Scope: only exercises the user has SAVED or has at least one SESSION for ──
  const [savedRecords, sessionRecords] = await Promise.all([
    prisma.savedExercise.findMany({ where: { userId }, select: { exerciseId: true } }),
    prisma.session.findMany({ where: { userId }, select: { exerciseId: true }, distinct: ["exerciseId"] }),
  ])

  const scopedIds = [
    ...new Set([
      ...savedRecords.map((s) => s.exerciseId),
      ...sessionRecords.map((s) => s.exerciseId),
    ]),
  ]

  // Empty state — user has done nothing yet
  if (scopedIds.length === 0) {
    return (
      <main className="min-h-screen bg-paper px-4 py-8 md:px-12 md:py-12 max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-serif text-3xl text-ink font-medium tracking-tight">Recovery Progress</h1>
            <p className="font-sans text-ink/70 mt-1">Welcome back, {user.name}.</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed border-line/60 bg-white text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-recovery/10 flex items-center justify-center text-recovery">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-ink">Nothing here yet</h2>
            <p className="font-sans text-sm text-ink/60 max-w-sm leading-relaxed">
              Your recovery progress will appear here once you save exercises and complete your first session. Head to the Library to find exercises prescribed by your physiotherapist.
            </p>
          </div>
          <Link
            href="/library"
            className="mt-2 px-7 py-3 bg-recovery text-white rounded-full font-sans font-medium hover:opacity-90 transition-opacity text-sm"
          >
            Browse Library
          </Link>
        </div>
      </main>
    )
  }

  // Fetch only the scoped exercises with their sessions
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: scopedIds } },
    include: {
      sessions: {
        where: { userId: user.id },
        orderBy: { date: "asc" },
      },
    },
  })

  const summaries = await Promise.all(
    exercises.map(async (ex) => {
      if (ex.sessions.length === 0) return { success: false, message: "Complete a session to start tracking." }
      return await generateTrendSummary(ex.name, ex.targetROM || 180, ex.sessions)
    })
  )

  return (
    <main className="min-h-screen bg-paper px-4 py-8 md:px-12 md:py-12 max-w-2xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink font-medium tracking-tight">Recovery Progress</h1>
          <p className="font-sans text-ink/70 mt-1">Welcome back, {user.name}.</p>
        </div>
        <ExportModal />
      </header>

      <div className="space-y-12">
        {exercises.map((exercise, idx) => {
          const sessions = exercise.sessions
          const completedSessions = sessions.filter(s => s.status === "completed")
          const latestSession = completedSessions[completedSessions.length - 1]
          const currentROM = latestSession?.romAchieved || 0
          const validReps = latestSession?.validRepCount || 0
          const rejectedReps = latestSession?.rejectedRepCount || 0
          const formFlags = latestSession?.formQualityFlags || []
          const hasCompensation = formFlags.some(flag => flag.toLowerCase().includes("compensation") || flag.toLowerCase().includes("jerky"))

          const targetROM = exercise.targetROM || 180
          const percentage = Math.min(100, Math.round((currentROM / targetROM) * 100))
          const summary = summaries[idx]

          const chartData = sessions.map(s => ({
            date: s.date,
            rom: s.romAchieved || 0,
            status: s.status
          }))

          return (
            <section key={exercise.id} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl text-ink">{exercise.name}</h2>
                <span className="font-sans text-xs text-ink/40 uppercase tracking-wide">
                  {completedSessions.length} session{completedSessions.length !== 1 ? "s" : ""}
                </span>
              </div>
              
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl border-2 border-dashed border-line/50 bg-white/50 text-center space-y-4">
                  <div className="text-3xl">🎯</div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-medium text-ink">Ready to begin?</h3>
                    <p className="text-ink/70 font-sans text-sm max-w-sm">
                      You haven&apos;t tracked any sessions for {exercise.name} yet.
                    </p>
                  </div>
                  <Link
                    href={`/session?exerciseId=${exercise.id}`}
                    className="mt-2 inline-block bg-recovery text-white px-6 py-2.5 rounded-full font-sans font-medium hover:opacity-90 transition-opacity text-sm"
                  >
                    Start First Session
                  </Link>
                </div>
              ) : (
                <>
                  {/* Escalation Banner */}
                  {exercise.escalationFlag && exercise.escalationNote && (
                    <div className="rounded-xl bg-signal/10 p-4 border-l-4 border-signal shadow-sm flex flex-col gap-2">
                      <h3 className="font-sans font-semibold text-signal flex items-center gap-2 text-sm">
                        <span className="text-base">🚨</span> Needs Attention
                      </h3>
                      <p className="font-sans text-ink text-sm leading-relaxed">
                        {exercise.escalationNote}
                      </p>
                    </div>
                  )}

                  {/* Arc + rep stats */}
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-4">Latest Session</p>
                    <div className="flex flex-col items-center gap-3">
                      <ArcIndicator currentValue={currentROM} targetValue={targetROM} />
                      <p className="font-sans font-medium text-ink/80 text-sm text-center">
                        {percentage}% toward clinical target ({Math.round(currentROM)}° of {targetROM}°)
                      </p>
                    </div>

                    {latestSession && (
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/40 pt-4">
                        <div className="flex flex-col items-center rounded-xl bg-recovery/8 py-3">
                          <span className="font-serif text-3xl text-recovery">{validReps}</span>
                          <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">Valid reps</span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-signal/8 py-3">
                          <span className={`font-serif text-3xl ${rejectedReps > 0 ? "text-signal" : "text-ink/30"}`}>
                            {rejectedReps}
                          </span>
                          <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">Not counted</span>
                        </div>
                      </div>
                    )}

                    {hasCompensation && (
                      <p className="font-sans text-xs text-signal font-medium mt-3 text-center">
                        ⚠ Compensation or form issues detected in last session
                      </p>
                    )}
                  </div>

                  {/* Trend Chart */}
                  <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-4">Range of Motion Over Time</p>
                    <TrendChart data={chartData} targetROM={targetROM} />
                    {summary.error ? (
                      <div className="mt-4 rounded-xl bg-signal/10 p-4 border border-signal/20 flex items-start gap-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-signal shrink-0 mt-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <div>
                          <p className="font-sans text-sm font-semibold text-signal">AI trend unavailable</p>
                          <p className="font-sans text-sm text-ink/70 mt-1">{summary.message}</p>
                        </div>
                      </div>
                    ) : summary.success ? (
                      <div className="mt-4 rounded-xl bg-recovery/10 p-4 border border-recovery/20">
                        <p className="font-sans text-sm text-ink/80 leading-relaxed">
                          <span className="font-semibold text-recovery">AI Trend Analysis:</span> {summary.message}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* CTA */}
                  <div className="flex justify-center pt-1">
                    <Link
                      href={`/session?exerciseId=${exercise.id}`}
                      className="bg-recovery text-white px-8 py-3 rounded-full font-sans font-medium hover:opacity-90 transition-opacity shadow-md shadow-recovery/20 text-sm"
                    >
                      Start Today&apos;s Session
                    </Link>
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>
    </main>
  )
}
