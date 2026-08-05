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
  await prisma.exercise.create({
    data: {
      name: "Knee Flexion",
      description: "Bending the knee joint.",
      targetROM: 135,
    },
  })

  await prisma.exercise.create({
    data: {
      name: "Shoulder Abduction",
      description: "Raising the arm straight out to the side.",
      targetROM: 180,
    },
  })

  console.log("Seeding complete - Exercises only for production.")
}



main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
