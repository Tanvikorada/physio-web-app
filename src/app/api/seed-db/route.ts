import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Copy of the seedData logic to run on the server
export async function GET() {
  try {
    const ACTIVE_EXERCISES = new Set([
      "Neck Rotation", "Neck Side Bending", "Neck Flexion", "Isometric Neck Flexion", "Levator Scapulae Stretch",
      "Pendulum Exercise", "Shoulder Flexion", "Shoulder Abduction", "Internal Rotation", "Cross-Body Stretch",
      "Pelvic Tilt", "Cat-Camel Stretch", "Bird Dog", "Child's Pose Stretch", "Seated Trunk Rotation",
      "Straight Leg Raise", "Hip Abduction", "Hip Extension", "Clamshell Exercise", "Glute Bridge",
      "Heel Slides", "Short Arc Quad", "Hamstring Curl", "Mini Squats", "Knee Flexion",
      "Ankle Pumps", "Heel Raises", "Toe Raises", "Calf Stretch", "Single-Leg Stand",
      "Wrist Flexion", "Wrist Extension", "Wrist Pronation", "Finger Flexion", "Grip Strengthening",
      "Weight Shifting", "Marching in Place", "Reaching Exercises", "Tandem Standing", "Side Stepping",
      "Sit-to-Stand Practice", "Stair Climbing", "Backward Walking", "Step Length Training", "Assisted Walking",
      "Hamstring Stretch", "Quadriceps Stretch", "Hip Flexor Stretch", "Chest Stretch", "Lower Back Stretch",
      "Squats", "Lunges", "Wall Push-Ups", "Resistance Band Row", "Bridge Exercise",
      "Shoulder ROM", "Elbow ROM", "Hip ROM", "Knee ROM", "Ankle ROM",
      "Chin Tucks", "Scapular Retraction", "Wall Angels", "Thoracic Extension", "Seated Posture Training",
      "Diaphragmatic Breathing", "Pursed-Lip Breathing", "Deep Breathing Exercise", "Controlled Coughing", "Box Breathing"
    ])
    
    // We update all exercises in the DB. If it's in ACTIVE_EXERCISES, isActive=true, else false.
    const allExercises = await prisma.exercise.findMany()
    let updatedCount = 0
    for (const ex of allExercises) {
      const isActive = ACTIVE_EXERCISES.has(ex.name)
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { isActive }
      })
      updatedCount++
    }
    
    return NextResponse.json({ success: true, message: `Updated ${updatedCount} exercises.` })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
