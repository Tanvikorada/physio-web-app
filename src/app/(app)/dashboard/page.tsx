import Link from "next/link"
import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function DashboardHome() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect("/login")
  }

  const cookieStore = await cookies()

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    redirect("/")
  }

  // Fetch saved exercises to show as "Today's Plan"
  const savedRecords = await prisma.savedExercise.findMany({
    where: { userId },
    include: {
      exercise: true
    },
    orderBy: { savedAt: "desc" }
  })
  
  const plannedExercises = savedRecords.map(r => r.exercise)

  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const { t } = getDictionary(locale)

  return (
    <div className="px-4 py-6 md:px-12 md:py-12 max-w-4xl mx-auto space-y-8 md:space-y-12">
      <header>
        <h1 className="font-serif text-2xl md:text-3xl text-ink font-medium tracking-tight">{t("Welcome back")}, {user.name}</h1>
        <p className="font-sans text-ink/70 mt-1 text-sm md:text-base">{t("Here is your daily recovery plan.")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl md:text-2xl text-ink">{t("Today's Plan")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plannedExercises.length === 0 ? (
            <div className="col-span-1 md:col-span-2 p-6 rounded-2xl bg-white border border-line shadow-sm flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-recovery/10 flex items-center justify-center text-recovery mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <h3 className="font-serif text-lg text-ink">{t("No exercises planned for today")}</h3>
              <p className="font-sans text-sm text-ink/70 max-w-sm">
                {t("Your daily plan is built from your saved routines. Head over to the library to find and save exercises prescribed by your physiotherapist.")}
              </p>
              <Link 
                href="/library"
                className="mt-1 px-5 py-2.5 bg-signal text-white rounded-full font-sans font-medium hover:opacity-90 transition-opacity text-sm"
              >
                {t("Browse Library")}
              </Link>
            </div>
          ) : (
            plannedExercises.map((exercise) => (
              <div key={exercise.id} className="p-4 rounded-2xl bg-white border border-line shadow-sm flex flex-col gap-3">
                <div>
                  <h3 className="font-serif text-lg text-ink">{t(exercise.name)}</h3>
                  <p className="font-sans text-sm text-ink/60 mt-0.5">
                    {exercise.targetHoldSeconds ? `${exercise.targetHoldSeconds}s ${t("hold")}` : (exercise.targetROM ? `${t("Target:")} ${exercise.targetROM}° ${t("ROM")}` : `${t("Mode")} ${exercise.trackingMode}`)}
                  </p>
                </div>
                <Link 
                  href={`/session?exerciseId=${exercise.id}`}
                  className="mt-auto w-full text-center bg-recovery text-white py-2.5 rounded-xl font-sans font-medium hover:opacity-90 transition-opacity text-sm min-h-[44px] flex items-center justify-center"
                >
                  {t("Start Session")}
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">{t("Recent Progress")}</h2>
          <Link href="/progress" className="font-sans text-sm text-recovery hover:underline">
            {t("View full dashboard")} &rarr;
          </Link>
        </div>
        <div className="p-6 rounded-2xl bg-recovery/5 border border-recovery/20 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-recovery/20 flex items-center justify-center text-recovery">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <div>
            <h3 className="font-serif text-lg text-ink">{t("You're making progress")}</h3>
            <p className="font-sans text-sm text-ink/70 mt-1 max-w-md">
              {t("Your range of motion has been steadily improving over your last 3 sessions. Check out your detailed trend analysis.")}
            </p>
          </div>
          <Link 
            href="/progress"
            className="md:ml-auto px-6 py-2 bg-white text-ink border border-line rounded-full font-medium hover:bg-paper transition-colors"
          >
            {t("Review Stats")}
          </Link>
        </div>
      </section>
    </div>
  )
}
