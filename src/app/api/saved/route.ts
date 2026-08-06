import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { exerciseId } = data

    if (!exerciseId) {
      return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 })
    }

    const sessionAuth = await getServerSession(authOptions)
    const userId = sessionAuth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const savedExercise = await prisma.savedExercise.create({
      data: {
        userId,
        exerciseId
      }
    })

    return NextResponse.json({ savedExercise })
  } catch (error: any) {
    console.error(error)
    if (error.code === 'P2002') {
       // Unique constraint failed, means it's already saved
       return NextResponse.json({ error: "Already saved" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to save exercise" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get("exerciseId")

    if (!exerciseId) {
      return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 })
    }

    const sessionAuth = await getServerSession(authOptions)
    const userId = sessionAuth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    await prisma.savedExercise.delete({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
       // Record not found
       return NextResponse.json({ success: true })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to unsave exercise" }, { status: 500 })
  }
}
