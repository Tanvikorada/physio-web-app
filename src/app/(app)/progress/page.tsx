import { ArcIndicator } from "@/components/ui/ArcIndicator"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { ExportModal } from "@/components/dashboard/ExportModal"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
    // Cookie is invalid or user was deleted
    redirect("/")
  }

  // Fetch exercises and their historical sessions
  const exercises = await prisma.exercise.findMany({
    include: {
      sessions: {
        where: { userId: user.id },
        orderBy: { date: "asc" },
      },
    },
  })

  // We'll call the groq trend-summary route internally or just import groq here.
  // Actually, since this is a server component, we can just fetch our own API route or do it directly.
  // To avoid hitting our own route via absolute URL in Next.js Server Components, we can just fetch it with absolute URL or extract the logic.
  // Let's use an absolute URL if NEXT_PUBLIC_BASE_URL is set, otherwise default to localhost:3000
  
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

  const summaries = await Promise.all(
    exercises.map(async (ex) => {
      if (ex.sessions.length === 0) return "Complete a session to start tracking."
      try {
        const res = await fetch(`${baseUrl}/api/trend-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseName: ex.name,
            targetROM: ex.targetROM,
            sessions: ex.sessions,
          }),
          cache: "no-store",
        })
        const data = await res.json()
        return data.summary || "Trend unavailable."
      } catch (e) {
        return "Trend unavailable."
      }
    })
  )

  return (
    <main className="min-h-screen bg-paper px-6 py-12 md:px-12 max-w-2xl mx-auto space-y-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink font-medium tracking-tight">Recovery Dashboard</h1>
          <p className="font-sans text-ink/70 mt-2">Welcome back, {user.name}.</p>
        </div>
        <ExportModal />
      </header>

      <div className="space-y-16">
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
            <section key={exercise.id} className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl text-ink">{exercise.name}</h2>
                <span className="font-sans text-xs text-ink/40 uppercase tracking-wide">
                  {completedSessions.length} session{completedSessions.length !== 1 ? "s" : ""}
                </span>
              </div>
              
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed border-line/50 bg-white/50 text-center space-y-4">
                  <div className="text-4xl">🎯</div>
                  <h3 className="font-serif text-xl font-medium text-ink">Ready to begin?</h3>
                  <p className="text-ink/70 font-sans max-w-sm">
                    You haven&apos;t tracked any sessions for {exercise.name} yet. Start your first session to unlock live AI tracking and insights.
                  </p>
                  <Link
                    href={`/session?exercise=${encodeURIComponent(exercise.name)}`}
                    className="mt-4 inline-block bg-recovery text-white px-8 py-3 rounded-full font-sans font-medium hover:opacity-90 transition-opacity"
                  >
                    Start First Session
                  </Link>
                </div>
              ) : (
                <>
                  {/* Escalation Banner */}
                  {exercise.escalationFlag && exercise.escalationNote && (
                    <div className="rounded-xl bg-signal/10 p-5 border-l-4 border-signal shadow-sm flex flex-col gap-2">
                      <h3 className="font-sans font-semibold text-signal flex items-center gap-2">
                        <span className="text-lg">🚨</span> Needs Attention
                      </h3>
                      <p className="font-sans text-ink text-sm leading-relaxed">
                        {exercise.escalationNote}
                      </p>
                    </div>
                  )}

                  {/* Arc + rep stats */}
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                    <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-4">Latest Session</p>
                    <div className="flex flex-col items-center gap-4">
                      <ArcIndicator currentValue={currentROM} targetValue={targetROM} />
                      <p className="font-sans font-medium text-ink/80 text-sm text-center">
                        {percentage}% toward clinical target ({Math.round(currentROM)}° of {targetROM}°)
                      </p>
                    </div>

                    {latestSession && (
                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line/40 pt-5">
                        <div className="flex flex-col items-center rounded-xl bg-recovery/8 py-4">
                          <span className="font-serif text-3xl text-recovery">{validReps}</span>
                          <span className="font-sans text-xs text-ink/50 uppercase tracking-wide mt-1">Valid reps</span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-signal/8 py-4">
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
                  <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                    <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-4">Range of Motion Over Time</p>
                    <TrendChart data={chartData} targetROM={targetROM} />
                    <div className="mt-5 border-t border-line/40 pt-5">
                      <p className="font-sans text-xs text-ink/40 uppercase tracking-wide mb-2">AI Trend Analysis</p>
                      <p className="font-serif text-ink text-base leading-relaxed">
                        {summary}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex justify-center pt-2">
                    <Link
                      href={`/session?exercise=${encodeURIComponent(exercise.name)}`}
                      className="bg-recovery text-white px-8 py-3 rounded-full font-sans font-medium hover:opacity-90 transition-opacity shadow-md shadow-recovery/20"
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
