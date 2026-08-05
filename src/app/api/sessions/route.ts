import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { cookies } from "next/headers"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get("exerciseId")

    if (!exerciseId) {
      return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const sessions = await prisma.session.findMany({
      where: {
        exerciseId,
        userId: userId,
      },
      orderBy: {
        date: "asc"
      }
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { exerciseName, romAchieved, repCount, formAccuracyScore, painScorePre, painScorePost, status, blockedReason } = data

    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 })

    const exercise = await prisma.exercise.findFirst({
      where: { name: exerciseName }
    })
    
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 })
    }

    // 1. Create Session
    const sessionDate = new Date()
    const session = await prisma.session.create({
      data: {
        userId: userId,
        exerciseId: exercise.id,
        date: sessionDate,
        status: status || "completed",
        blockedReason: blockedReason || null,
        romAchieved: romAchieved || 0,
        repCount: repCount || 0,
        formAccuracyScore,
        painScorePre,
        painScorePost,
      }
    })

    // 2. Create Pain Records if provided
    if (painScorePre !== undefined) {
      await prisma.painRecord.create({
        data: { sessionId: session.id, exerciseId: exercise.id, painScore: painScorePre, timing: "pre", timestamp: sessionDate }
      })
    }
    
    if (painScorePost !== undefined) {
      await prisma.painRecord.create({
        data: { sessionId: session.id, exerciseId: exercise.id, painScore: painScorePost, timing: "post", timestamp: sessionDate }
      })
    }

    // 3. Escalation Logic
    // Compare the current post_pain to the pain trend from the last 3 sessions for that exercise (excluding this one).
    const recentSessions = await prisma.session.findMany({
      where: { exerciseId: exercise.id, userId: userId },
      orderBy: { date: "desc" },
      take: 4 // The current one + last 3
    })

    let escalated = false
    let escalationNote = null

    if (recentSessions.length >= 4 && painScorePost !== undefined) {
      const currentPain = painScorePost
      const lastSessionPain = recentSessions[1]?.painScorePost ?? 0
      
      const p1 = recentSessions[1]?.painScorePost ?? 0
      const p2 = recentSessions[2]?.painScorePost ?? 0
      const p3 = recentSessions[3]?.painScorePost ?? 0

      // If pain has not decreased across those 3 sessions (p1 >= p2 >= p3) 
      // OR increased by 2+ points from previous session (currentPain - lastSessionPain >= 2)
      const notDecreased = p1 >= p2 && p2 >= p3
      const spiked = currentPain - lastSessionPain >= 2

      if (notDecreased || spiked) {
        escalated = true
        
        // Generate Note
        try {
          const Groq = (await import("groq-sdk")).default
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
          
          const prompt = `You are a factual clinical assistant. The user's pain scores for ${exerciseName} over the last 4 sessions were: ${p3}, ${p2}, ${p1}, and today is ${currentPain} (out of 10).
          
Write 1-2 plain-language sentences stating the pattern observed and recommending the user check in with their physiotherapist. 
Rule: NEVER suggest continuing, stopping, or modifying the exercise — only recommend human consultation.
Rule: Return ONLY the text.`

          const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 100,
          })

          escalationNote = completion.choices[0]?.message?.content?.trim() || "Pain patterns suggest it may be time to consult your physiotherapist."
        } catch (groqErr) {
          console.error("Groq escalation error:", groqErr)
          escalationNote = "Your reported pain indicates a worsening trend. Please consult your physiotherapist."
        }
      }
    }

    if (escalated) {
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { escalationFlag: true, escalationNote }
      })
    }

    return NextResponse.json({ session, escalated, escalationNote })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 })
  }
}
