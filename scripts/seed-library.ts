import prisma from "../src/lib/prisma"

interface ExerciseSeedData {
  name: string
  categories: string[]
  trackingMode: string
  instructionsShort: string
  instructionsFull: string
  targetHoldSeconds?: number
  landmarkConfig?: any
  isActive?: boolean
}

const ACTIVE_EXERCISES = new Set([
  "Shoulder Abduction",
  "Knee Flexion",
  "Neck Side Bend"
])

// Helper to define landmark configs for Mode A
const getLandmarkConfig = (type: string, primaryJoint: string, landmarks: [number, number, number], range: [number, number], start: number, top: number) => ({
  exercise_id: type,
  primary_joint: primaryJoint,
  landmarks_used: landmarks,
  angle_range_valid: range,
  rep_start_angle: start,
  rep_top_angle: top,
  min_rep_duration_ms: 800,
  max_rep_duration_ms: 8000,
})

const seedData: Record<string, ExerciseSeedData> = {}

function addExercise(name: string, category: string, mode: string, short: string, full: string, lm?: any, hold?: number) {
  if (seedData[name]) {
    if (!seedData[name].categories.includes(category)) {
      seedData[name].categories.push(category)
    }
  } else {
    seedData[name] = {
      name,
      categories: [category],
      trackingMode: mode,
      instructionsShort: short,
      instructionsFull: full,
      landmarkConfig: lm,
      targetHoldSeconds: hold,
      isActive: ACTIVE_EXERCISES.has(name)
    }
  }
}

// ── GOLD SET: ONLY THESE 3 EXERCISES WILL BE SEEDED ──

addExercise(
  "Shoulder Abduction",
  "Shoulder Exercises",
  "A", // Mode A = Reps
  "Improves lifting to the side.",
  "Raise your arm straight out to the side until it's parallel with the floor.",
  getLandmarkConfig("shoulder_abduction", "shoulder", [24, 12, 14], [0, 180], 25, 90)
)

addExercise(
  "Knee Flexion",
  "Knee Exercises",
  "A", // Mode A = Reps
  "Bending the knee joint.",
  "Stand straight and bend your knee as far back as you can, bringing your heel toward your glutes.",
  // Hip(24) - Knee(26) - Ankle(28)
  getLandmarkConfig("knee_flexion", "knee", [24, 26, 28], [0, 180], 160, 90)
)

addExercise(
  "Neck Side Bend",
  "Neck Exercises",
  "B", // Mode B = Hold
  "Stretches the side of the neck.",
  "Tilt your ear toward your shoulder without lifting the shoulder, and hold.",
  // Ear(7) - Shoulder(11) - Hip(23) -> Straight = 170°, Bent = 135°
  getLandmarkConfig("neck_side_bend", "neck", [7, 11, 23], [90, 180], 170, 135),
  10 // 10 second hold
)

async function main() {
  console.log("Seeding exercises...")
  
  for (const key of Object.keys(seedData)) {
    const data = seedData[key]
    
    await prisma.exercise.upsert({
      where: { id: key }, // Wait, id is a cuid, we can't search by it reliably if not set. We must search by name.
      update: {
        categories: data.categories,
        trackingMode: data.trackingMode,
        instructionsShort: data.instructionsShort,
        instructionsFull: data.instructionsFull,
        targetHoldSeconds: data.targetHoldSeconds,
        landmarkConfig: data.landmarkConfig || undefined
      },
      create: {
        name: data.name,
        description: data.instructionsShort,
        categories: data.categories,
        trackingMode: data.trackingMode,
        instructionsShort: data.instructionsShort,
        instructionsFull: data.instructionsFull,
        targetHoldSeconds: data.targetHoldSeconds,
        landmarkConfig: data.landmarkConfig || undefined
      }
    })
  }

  console.log(`Seeded ${Object.keys(seedData).length} unique exercises!`)
}

// We need to use prisma.exercise.findFirst to find by name, then update, or create if missing, since name is not @unique.
async function safeSeed() {
  console.log("Safe seeding exercises...")
  let count = 0
  for (const key of Object.keys(seedData)) {
    const data = seedData[key]
    const existing = await prisma.exercise.findFirst({ where: { name: data.name } })
    
    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          categories: data.categories,
          trackingMode: data.trackingMode,
          instructionsShort: data.instructionsShort,
          instructionsFull: data.instructionsFull,
          targetHoldSeconds: data.targetHoldSeconds,
          landmarkConfig: data.landmarkConfig || undefined,
          targetROM: data.landmarkConfig?.rep_top_angle || existing.targetROM,
          isActive: data.isActive
        }
      })
    } else {
      await prisma.exercise.create({
        data: {
          name: data.name,
          description: data.instructionsShort,
          categories: data.categories,
          trackingMode: data.trackingMode,
          instructionsShort: data.instructionsShort,
          instructionsFull: data.instructionsFull,
          targetHoldSeconds: data.targetHoldSeconds,
          landmarkConfig: data.landmarkConfig || undefined,
          targetROM: data.landmarkConfig?.rep_top_angle || null,
          isActive: data.isActive
        }
      })
    }
    count++
  }
  console.log(`Seeded ${count} exercises successfully!`)
}

safeSeed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
