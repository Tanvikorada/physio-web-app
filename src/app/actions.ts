"use server"

import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function startOnboarding() {
  const cookieStore = await cookies()
  
  // Always log them into the seeded test user account so they see the mock data
  const testUser = await prisma.user.findUnique({
    where: { id: 'test-user-id' }
  })

  let targetUserId = 'test-user-id'

  if (!testUser) {
    // Fallback just in case the DB wasn't seeded correctly
    const newUser = await prisma.user.create({
      data: {
        id: 'test-user-id',
        name: "Test User",
        email: "test@example.com"
      }
    })
    targetUserId = newUser.id
  }

  // Securely set the cookie for 1 year
  cookieStore.set("userId", targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  })

  // Ensure standard exercises exist in the database (they might already exist globally, 
  // but let's check and create them if not). Exercises are global in our current schema, 
  // not per-user, but we should make sure they exist for the app to function.
  
  const kneeFlexion = await prisma.exercise.findFirst({ where: { name: "Knee Flexion" } })
  if (!kneeFlexion) {
    await prisma.exercise.create({
      data: { name: "Knee Flexion", description: "Bending the knee joint.", targetROM: 135 }
    })
  }

  const shoulderAbduction = await prisma.exercise.findFirst({ where: { name: "Shoulder Abduction" } })
  if (!shoulderAbduction) {
    await prisma.exercise.create({
      data: { name: "Shoulder Abduction", description: "Raising the arm straight out to the side.", targetROM: 180 }
    })
  }

  redirect("/dashboard")
}
