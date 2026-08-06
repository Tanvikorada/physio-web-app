import prisma from "@/lib/prisma"
import SessionClient from "./SessionClient"

export default async function SessionPage({
  searchParams
}: {
  searchParams: Promise<{ exerciseId?: string }>
}) {
  const { exerciseId } = await searchParams

  let exerciseData = null
  if (exerciseId) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    })
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

  return <SessionClient initialExerciseData={exerciseData} />
}
