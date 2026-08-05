import prisma from "@/lib/prisma"
import { ReportClient } from "@/components/report/ReportClient"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReportPage({ searchParams }: { searchParams: { range?: string } }) {
  const range = searchParams.range || "all"
  
  const cookieStore = await cookies()
  const userId = cookieStore.get("userId")?.value

  if (!userId) {
    redirect("/")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    redirect("/")
  }

  // Determine date filter
  const dateFilter = new Date()
  if (range === "30days") {
    dateFilter.setDate(dateFilter.getDate() - 30)
  } else {
    dateFilter.setFullYear(2000) // All time essentially
  }

  const exercises = await prisma.exercise.findMany({
    include: {
      sessions: {
        where: { 
          userId: user.id,
          date: { gte: dateFilter }
        },
        orderBy: { date: "asc" },
      },
    },
  })

  // Format data for the report and the Groq summary
  const exercisesData = exercises.map(ex => {
    const sessions = ex.sessions
    const completedSessions = sessions.filter(s => s.status === "completed")
    const blockedSessions = sessions.filter(s => s.status === "blocked")
    const latestSession = completedSessions[completedSessions.length - 1]
    
    return {
      name: ex.name,
      targetROM: ex.targetROM,
      currentROM: latestSession?.romAchieved || 0,
      sessionsCount: sessions.length,
      completedCount: completedSessions.length,
      blockedCount: blockedSessions.length,
      escalationFlag: ex.escalationFlag,
      escalationNote: ex.escalationNote,
      sessionsData: sessions.map(s => ({
        date: s.date.toISOString(),
        romAchieved: s.romAchieved,
        painScorePre: s.painScorePre,
        painScorePost: s.painScorePost,
        status: s.status,
        blockedReason: s.blockedReason
      }))
    }
  })

  // Fetch summary from API
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
  let summary = "Summary unavailable."
  
  try {
    const res = await fetch(`${baseUrl}/api/report-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercisesData }),
      cache: "no-store",
    })
    const data = await res.json()
    if (data.summary) {
      summary = data.summary
    }
  } catch (e) {
    console.error("Failed to fetch report summary", e)
  }

  return (
    <ReportClient 
      user={user} 
      exercises={exercisesData} 
      summary={summary} 
      dateRange={range === "30days" ? "Last 30 Days" : "Since First Session"}
    />
  )
}
