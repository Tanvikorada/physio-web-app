import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "missing",
})

export async function POST(req: Request) {
  try {
    const { exerciseName, targetROM, sessions } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "API key not configured" },
        { status: 500 }
      )
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ summary: "Complete your first session to start tracking your trend." })
    }

    // Format historical data for prompt
    const historyText = sessions.map((s: any) => {
      const flags = (s.formQualityFlags && s.formQualityFlags.length > 0) ? s.formQualityFlags.join(", ") : "None"
      return `Date: ${new Date(s.date).toLocaleDateString()}, Achieved ROM: ${s.romAchieved || 0} degrees, Form Issues: ${flags}`
    }).join("\n")

    const prompt = `You are providing a single-sentence trend summary for a physiotherapy dashboard.
Exercise: ${exerciseName}
Clinical Target Range of Motion (ROM): ${targetROM} degrees

Recent Session History (oldest to newest):
${historyText}

Rule 1: Generate EXACTLY ONE sentence.
Rule 2: Plain-language, factual statement on the trend direction of ROM and/or form consistency.
Rule 3: NO diagnosis, NO medical claims.
Rule 4: If stagnant, declining, or showing consistent form issues, state it plainly. DO NOT soften a lack of progress.
Rule 5: Output ONLY the sentence, no prefixes.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 60,
    })

    const summary = completion.choices[0]?.message?.content?.trim() || "Trend data unavailable."

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { message: "Failed to generate trend summary" },
      { status: 500 }
    )
  }
}
