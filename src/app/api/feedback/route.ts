import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import prisma from "@/lib/prisma"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "missing",
})

export async function POST(req: Request) {
  try {
    const { sessionId, exercise, reps, rejectedReps, maxAngle, formFlagsObserved } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "API key not configured" },
        { status: 500 }
      )
    }

    const formFlagsString = (formFlagsObserved && formFlagsObserved.length > 0) ? formFlagsObserved.join(", ") : "None"

    const prompt = `You are generating short plain-language feedback for a patient after a physiotherapy exercise session, based on tracked movement data.
Input: exercise name: ${exercise}, valid rep count: ${reps}, rejected rep count: ${rejectedReps}, form quality flags observed: ${formFlagsString}, max angle achieved: ${maxAngle}.
Output: 2-3 sentences. Be specific to what actually happened in this session — reference the real numbers given, don't write generic encouragement.
If compensation or incomplete-range issues were flagged, mention them plainly and suggest slowing down or reducing range next time — do not diagnose or suggest this indicates an injury.
No medical claims, no diagnosis. Plain language, direct, not falsely cheerful if the session had real issues.
Return ONLY the feedback text, nothing else.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt }
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
