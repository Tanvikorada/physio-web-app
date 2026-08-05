import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  await prisma.painRecord.deleteMany()
  await prisma.session.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create a test user
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test Patient",
    },
  })

  // 2. Create standard exercises with AAOS clinical target ROMs
  const kneeFlexion = await prisma.exercise.create({
    data: {
      name: "Knee Flexion",
      description: "Bending the knee joint.",
      targetROM: 135,
    },
  })

  const shoulderAbduction = await prisma.exercise.create({
    data: {
      name: "Shoulder Abduction",
      description: "Raising the arm straight out to the side.",
      targetROM: 180,
    },
  })

  // 3. Seed historical sessions to test the dashboard (Knee Flexion - improving pain trend)
  const today = new Date()
  
  const kneeSessions = [
    { daysAgo: 14, rom: 85, reps: 10, prePain: 6, postPain: 7, blocked: false },
    { daysAgo: 12, rom: 88, reps: 10, prePain: 5, postPain: 6, blocked: false },
    { daysAgo: 10, rom: 95, reps: 12, prePain: 4, postPain: 4, blocked: false },
    { daysAgo: 8,  rom: 0, reps: 0, prePain: null, postPain: null, blocked: true, reason: "Sharp pain" },
    { daysAgo: 7,  rom: 92, reps: 12, prePain: 3, postPain: 4, blocked: false },
    { daysAgo: 4,  rom: 105, reps: 15, prePain: 2, postPain: 3, blocked: false },
    { daysAgo: 1,  rom: 110, reps: 15, prePain: 2, postPain: 2, blocked: false },
  ]

  for (const s of kneeSessions) {
    const sessionDate = new Date(today)
    sessionDate.setDate(sessionDate.getDate() - s.daysAgo)
    
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        exerciseId: kneeFlexion.id,
        date: sessionDate,
        status: s.blocked ? "blocked" : "completed",
        blockedReason: s.reason,
        romAchieved: s.rom,
        repCount: s.reps,
        formAccuracyScore: s.blocked ? null : 0.9,
        painScorePre: s.prePain,
        painScorePost: s.postPain,
      }
    })

    if (s.prePain !== null) {
      await prisma.painRecord.create({ data: { sessionId: session.id, exerciseId: kneeFlexion.id, painScore: s.prePain, timing: "pre", timestamp: sessionDate } })
    }
    if (s.postPain !== null) {
      await prisma.painRecord.create({ data: { sessionId: session.id, exerciseId: kneeFlexion.id, painScore: s.postPain, timing: "post", timestamp: sessionDate } })
    }
  }

  // Seed historical sessions (Shoulder Abduction - stagnant/worsening pain trend)
  const shoulderSessions = [
    { daysAgo: 14, rom: 90, reps: 10, prePain: 4, postPain: 5 },
    { daysAgo: 11, rom: 95, reps: 10, prePain: 4, postPain: 5 },
    { daysAgo: 8,  rom: 92, reps: 10, prePain: 5, postPain: 6 },
    { daysAgo: 5,  rom: 94, reps: 10, prePain: 6, postPain: 7 },
    { daysAgo: 2,  rom: 90, reps: 10, prePain: 7, postPain: 8 }, // Escalation criteria met!
  ]

  for (const s of shoulderSessions) {
    const sessionDate = new Date(today)
    sessionDate.setDate(sessionDate.getDate() - s.daysAgo)
    
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        exerciseId: shoulderAbduction.id,
        date: sessionDate,
        romAchieved: s.rom,
        repCount: s.reps,
        formAccuracyScore: 0.8,
        painScorePre: s.prePain,
        painScorePost: s.postPain,
      }
    })

    await prisma.painRecord.create({ data: { sessionId: session.id, exerciseId: shoulderAbduction.id, painScore: s.prePain, timing: "pre", timestamp: sessionDate } })
    await prisma.painRecord.create({ data: { sessionId: session.id, exerciseId: shoulderAbduction.id, painScore: s.postPain, timing: "post", timestamp: sessionDate } })
  }

  // Set the escalation flag on Shoulder Abduction to demonstrate the dashboard
  await prisma.exercise.update({
    where: { id: shoulderAbduction.id },
    data: {
      escalationFlag: true,
      escalationNote: "Your reported pain has increased to 8/10 during your recent sessions without signs of relief. Please pause this exercise and consult with your physiotherapist.",
    }
  })

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
