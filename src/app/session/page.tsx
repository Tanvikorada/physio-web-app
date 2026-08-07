import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import SessionClient from "./SessionClient"

export default async function SessionPage({
  searchParams
}: {
  searchParams: Promise<{ exerciseId?: string }>
}) {
  // Auth guard — unauthenticated users go to login
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { exerciseId } = await searchParams

  if (!exerciseId) {
    redirect("/library")
  }

  let exerciseData = null
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId }
  })
  
  if (!exercise) {
    redirect("/library")
  }

  if (exercise) {
      exerciseData = {
        id: exercise.id,
        name: exercise.name,
        trackingMode: exercise.trackingMode,
        targetHoldSeconds: exercise.targetHoldSeconds,
        instructionsFull: exercise.instructionsFull ?? null,
        description: exercise.description ?? null,
        landmarkConfig: exercise.landmarkConfig ? JSON.parse(JSON.stringify(exercise.landmarkConfig)) : null
      }
    }
  }

  // Pass locale to client so session components can translate
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"

  return <SessionClient initialExerciseData={exerciseData} locale={locale} />
}
