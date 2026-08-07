import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "missing",
})

export async function generateTrendSummary(exerciseName: string, targetROM: number, sessions: any[]) {
  if (!process.env.GROQ_API_KEY) {
    return { success: false, message: "API key not configured", error: true }
  }

  if (!sessions || sessions.length === 0) {
    return { success: false, message: "Complete your first session to start tracking your trend." }
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

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 60,
    })

    const summary = completion.choices[0]?.message?.content?.trim() || "Trend data unavailable."
    return { success: true, message: summary }
  } catch (error) {
    console.error("Groq API Error:", error)
    return { success: false, message: "Failed to generate trend summary", error: true }
  }
}
