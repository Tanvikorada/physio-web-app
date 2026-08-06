import prisma from "../src/lib/prisma"

async function main() {
  console.log("Cleaning demo data...")

  // Delete everything
  await prisma.painRecord.deleteMany({})
  console.log("Deleted all PainRecords")
  
  await prisma.session.deleteMany({})
  console.log("Deleted all Sessions")
  
  await prisma.savedExercise.deleteMany({})
  console.log("Deleted all SavedExercises")
  
  await prisma.user.deleteMany({})
  console.log("Deleted all Users")

  console.log("Database wiped. You can now register a real user and start fresh.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
