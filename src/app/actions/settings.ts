"use server"

import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function updateSettings(formData: FormData) {
  const language = formData.get("language") as string
  const largeText = formData.get("largeText") === "true"

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const cookieStore = await cookies()

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { language, largeText }
    })
  }

  // Update cookies so the root layout and server components can read them immediately
  cookieStore.set("NEXT_LOCALE", language, { path: '/' })
  cookieStore.set("LARGE_TEXT", largeText ? "true" : "false", { path: '/' })

  revalidatePath("/", "layout")
}
