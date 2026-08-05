import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "missing",
})

export async function POST(req: Request) {
  try {
    const { exercisesData } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { message: "API key not configured" },
        { status: 500 }
      )
    }

    if (!exercisesData || exercisesData.length === 0) {
      return NextResponse.json({ summary: "No data available in the selected date range." })
    }

    // Prepare data for the prompt
    let promptData = ""
    for (const ex of exercisesData) {
      promptData += `\nExercise: ${ex.name}\n`
      promptData += `Total Sessions in Range: ${ex.sessionsCount}\n`
      promptData += `Completed: ${ex.completedCount}, Blocked: ${ex.blockedCount}\n`
      if (ex.escalationNote) {
        promptData += `Active Escalation Flag: ${ex.escalationNote}\n`
      }
      if (ex.sessionsData && ex.sessionsData.length > 0) {
        promptData += `Session History (Oldest to Newest):\n`
        for (const s of ex.sessionsData) {
          promptData += `  - Date: ${new Date(s.date).toLocaleDateString()}, Status: ${s.status}, ROM: ${s.romAchieved}, Pre-Pain: ${s.painScorePre || 'N/A'}, Post-Pain: ${s.painScorePost || 'N/A'}, Block Reason: ${s.blockedReason || 'None'}\n`
        }
      }
    }

    const prompt = `You are a clinical reporting assistant generating a factual summary of a patient's physiotherapy self-tracking data.

Data:
${promptData}

Instructions:
1. Write a factual observation summary that a physiotherapist would want to read before an appointment.
2. The summary must be a single paragraph of 3-5 sentences.
3. Report patterns ONLY in Range of Motion (ROM), pain scores, and adherence/blocked sessions.
4. CRITICAL: Do NOT diagnose the patient.
5. CRITICAL: Do NOT recommend treatment changes.
6. CRITICAL: Do NOT interpret clinical significance (e.g., do not say "this is concerning" or "this indicates improvement"). Only state the facts (e.g., "ROM increased from X to Y", "Pain spiked on [Date]").
7. Return ONLY the paragraph. No prefixes, no titles.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 300,
    })

    const summary = completion.choices[0]?.message?.content?.trim() || "Summary unavailable."

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { message: "Failed to generate report summary" },
      { status: 500 }
    )
  }
}
