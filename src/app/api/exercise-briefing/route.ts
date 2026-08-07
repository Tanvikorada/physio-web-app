import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { createHash } from "crypto"

const BRIEFING_SYSTEM_PROMPT = `You are explaining a physiotherapy exercise to a patient in simple, encouraging, plain language before they begin. Given the exercise name and its clinical instructions, explain in 3-4 sentences: what movement they'll do, roughly how it should feel, and one common mistake to avoid. No medical jargon, no diagnosis language. Be warm and encouraging.`

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get("exerciseId")

    if (!exerciseId) {
      return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 })
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        name: true,
        trackingMode: true,
        instructionsFull: true,
        aiBriefing: true,
        aiBriefingHash: true,
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 })
    }

    const sourceText = exercise.instructionsFull || exercise.name
    const currentHash = hashText(sourceText)

    // Return cached briefing if it's still fresh (hash matches)
    if (exercise.aiBriefing && exercise.aiBriefingHash === currentHash) {
      return NextResponse.json({ briefing: exercise.aiBriefing, cached: true })
    }

    // Generate fresh briefing via Groq
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ briefing: null, error: "No Groq API key configured" }, { status: 200 })
    }

    try {
      const Groq = (await import("groq-sdk")).default
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

      const isGuided = exercise.trackingMode === "D"
      const guidedNote = isGuided
        ? " At the end, add one sentence clarifying that this is a guided (instructional-only) session and not AI-tracked."
        : ""

      const userMessage = `Exercise name: ${exercise.name}\n\nClinical instructions: ${sourceText}${guidedNote}`

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: BRIEFING_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 180,
      })

      const briefing = completion.choices[0]?.message?.content?.trim() || null

      if (briefing) {
        // Cache it on the exercise record
        await prisma.exercise.update({
          where: { id: exerciseId },
          data: { aiBriefing: briefing, aiBriefingHash: currentHash },
        })
        return NextResponse.json({ briefing, cached: false })
      } else {
        return NextResponse.json({ briefing: null, error: "Groq returned empty response" })
      }
    } catch (groqErr) {
      console.error("Groq briefing error:", groqErr)
      return NextResponse.json({ briefing: null, error: "Groq API call failed" }, { status: 200 })
    }
  } catch (error) {
    console.error("Exercise briefing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
