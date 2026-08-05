import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { exercise, reps, maxAngle, formScore } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "API key not configured" },
        { status: 500 }
      )
    }

    const prompt = `You are providing short, factual post-session feedback for a user who just completed a physiotherapy exercise session.
Exercise: ${exercise}
Repetitions completed: ${reps}
Maximum range of motion achieved: ${maxAngle} degrees
Form flag/score note: ${formScore || "None, form looked steady."}

Rule 1: Generate EXACTLY 2-3 sentences.
Rule 2: Plain-language, factual feedback on form and effort ONLY.
Rule 3: NO diagnosis, NO medical claims, NO prescriptive advice.
Rule 4: Be encouraging but not exaggerated.
Rule 5: Output ONLY the text feedback, no prefixes like "Here is your feedback:".`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 150,
    })

    const feedback = completion.choices[0]?.message?.content?.trim() || "Session recorded successfully."

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { message: "Failed to generate feedback" },
      { status: 500 }
    )
  }
}
