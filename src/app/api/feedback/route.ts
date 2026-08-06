import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import Groq from "groq-sdk"
import prisma from "@/lib/prisma"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "missing",
})

export async function POST(req: Request) {
  try {
    const { sessionId, exercise, reps, rejectedReps, maxAngle, formFlagsObserved, formWarning, trackingMode, holdTimeMs, targetHoldMs } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "API key not configured" },
        { status: 500 }
      )
    }

    // Build context string based on tracking mode
    let metricsContext = ""
    if (trackingMode === "B") {
      const holdSeconds = holdTimeMs ? Math.floor(holdTimeMs / 1000) : 0
      const targetSeconds = targetHoldMs ? Math.floor(targetHoldMs / 1000) : 0
      const breaks = (formFlagsObserved || []).filter((f: string) => f === "Lost hold position").length
      metricsContext = `They successfully held the target position for ${holdSeconds} seconds out of a target of ${targetSeconds} seconds. They had ${breaks} brief breaks where they lost position.`
    } else {
      metricsContext = `They completed ${reps} valid reps (and had ${rejectedReps} rejected reps due to form/range).`
    }

    const cookieStore = await cookies()
    const localeCode = cookieStore.get("NEXT_LOCALE")?.value || "en"
    let languageName = "English"
    if (localeCode === "hi") languageName = "Hindi"
    if (localeCode === "te") languageName = "Telugu"

    const systemPrompt = `
You are an empathetic, professional physical therapy AI assistant.
Your goal is to provide a short (2-3 sentences max) summary of the user's exercise session.
Be encouraging but clinical. Do not use emojis. Do not use exclamation marks heavily.
Address the user directly (e.g. "You achieved...").

IMPORTANT: You MUST provide the feedback exactly and only in ${languageName}.

Session data:
- Exercise: ${exercise}
- Metrics: ${metricsContext}
- Max Range of Motion achieved: ${maxAngle} degrees
- Form warnings generated: ${formWarning || "None"}
- Specific form flags: ${(formFlagsObserved && formFlagsObserved.length > 0) ? formFlagsObserved.join(", ") : "None"}

If there are form warnings, politely remind them of the correct form.
If they did well, validate their effort.
Do not hallucinate advice outside of this data.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 150,
    })

    const feedback = completion.choices[0]?.message?.content?.trim() || "Session recorded successfully."

    if (sessionId) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { groqSessionFeedback: feedback }
      })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { message: "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
