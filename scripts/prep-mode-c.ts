import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Preparing DB for Mode C test...")

  // Find Wrist & Hand exercises
  const handExercises = await prisma.exercise.findMany({
    where: {
      categories: {
        has: "Wrist & Hand Exercises"
      }
    }
  })

  // Update Finger Flexion and Finger Spreading to Mode C
  // Update all others to Mode D
  for (const exercise of handExercises) {
    let mode = "D"
    if (exercise.name === "Finger Flexion" || exercise.name === "Finger Spreading") {
      mode = "C"
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { trackingMode: mode }
    })
    console.log(`Updated ${exercise.name} to Mode ${mode}`)
  }

  console.log("Mode C prep complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
