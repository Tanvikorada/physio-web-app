import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  await prisma.painRecord.deleteMany()
  await prisma.session.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create standard exercises with APTA clinical target ROMs
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

  // 2. Create Test User
  const testUser = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
    },
  })

  // 3. Seed 5 test sessions for Shoulder Abduction (mix of clean and compensated reps)
  const today = new Date()
  
  await prisma.session.create({
    data: {
      userId: testUser.id,
      exerciseId: shoulderAbduction.id,
      date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      status: "completed",
      romAchieved: 140,
      validRepCount: 8,
      rejectedRepCount: 4,
      formQualityFlags: ["Jerky movement", "Asymmetric compensation (shoulder tilt)"],
      groqSessionFeedback: "You completed 8 valid reps with a max range of 140 degrees, but 4 reps were rejected. Try to keep your opposite shoulder still to avoid compensation next time.",
      formAccuracyScore: 8 / 12,
      painScorePre: 3,
      painScorePost: 4,
    }
  })

  await prisma.session.create({
    data: {
      userId: testUser.id,
      exerciseId: shoulderAbduction.id,
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: "completed",
      romAchieved: 145,
      validRepCount: 10,
      rejectedRepCount: 2,
      formQualityFlags: ["Jerky movement"],
      groqSessionFeedback: "Good effort today hitting 145 degrees over 10 valid reps. Your form is improving, but continue to focus on smooth, controlled movements.",
      formAccuracyScore: 10 / 12,
      painScorePre: 2,
      painScorePost: 3,
    }
  })

  await prisma.session.create({
    data: {
      userId: testUser.id,
      exerciseId: shoulderAbduction.id,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: "completed",
      romAchieved: 155,
      validRepCount: 12,
      rejectedRepCount: 1,
      formQualityFlags: [],
      groqSessionFeedback: "Excellent session. You reached 155 degrees and completed 12 clean reps with steady form.",
      formAccuracyScore: 12 / 13,
      painScorePre: 1,
      painScorePost: 2,
    }
  })

  await prisma.session.create({
    data: {
      userId: testUser.id,
      exerciseId: shoulderAbduction.id,
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: "completed",
      romAchieved: 160,
      validRepCount: 12,
      rejectedRepCount: 0,
      formQualityFlags: [],
      groqSessionFeedback: "Great consistency! 12 valid reps and a new max of 160 degrees with perfect form. Keep it up.",
      formAccuracyScore: 1.0,
      painScorePre: 1,
      painScorePost: 1,
    }
  })

  await prisma.session.create({
    data: {
      userId: testUser.id,
      exerciseId: shoulderAbduction.id,
      date: today, // today
      status: "completed",
      romAchieved: 150,
      validRepCount: 9,
      rejectedRepCount: 3,
      formQualityFlags: ["Asymmetric compensation (shoulder tilt)"],
      groqSessionFeedback: "You completed 9 valid reps today but had 3 rejected due to form issues. Noticeable shoulder tilt was detected; remember to stay aligned.",
      formAccuracyScore: 9 / 12,
      painScorePre: 2,
      painScorePost: 4,
    }
  })

  console.log("Seeding complete - Test data and exercises generated.")
}



main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
