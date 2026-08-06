import prisma from "@/lib/prisma"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Play } from "lucide-react"
import { getDictionary } from "@/lib/i18n"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function SavedPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect("/login")
  }

  const cookieStore = await cookies()

  const savedRecords = await prisma.savedExercise.findMany({
    where: { userId },
    include: {
      exercise: true
    },
    orderBy: { savedAt: "desc" }
  })

  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const { t } = getDictionary(locale)

  if (savedRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-recovery/10 flex items-center justify-center text-recovery mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-ink">{t("No Saved Routines")}</h1>
        <p className="font-sans text-ink/70 mt-3 mb-8 leading-relaxed">
          {t("Your saved exercises act as your daily plan. You haven't added any yet.")}
        </p>
        <Link 
          href="/library"
          className="px-8 py-3 rounded-full bg-signal text-paper font-sans font-medium text-lg active:scale-[0.98] transition-transform"
        >
          {t("Browse Library")}
        </Link>
      </div>
    )
  }

  // Group by category (we'll just use the first category of each exercise)
  const grouped: Record<string, typeof savedRecords> = {}
  savedRecords.forEach(record => {
    const mainCategory = record.exercise.categories[0] || "Other"
    if (!grouped[mainCategory]) {
      grouped[mainCategory] = []
    }
    grouped[mainCategory].push(record)
  })

  // Sort categories alphabetically
  const categories = Object.keys(grouped).sort()

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto space-y-10">
      <header>
        <h1 className="font-serif text-3xl text-ink">{t("Saved Routines")}</h1>
        <p className="font-sans text-ink/70 mt-2">
          {t("Your active exercises and clinical pathways.")}
        </p>
      </header>

      {categories.map(category => (
        <section key={category} className="space-y-4">
          <h2 className="font-serif text-xl text-ink border-b border-line pb-2">{t(category)}</h2>
          <div className="grid gap-3">
            {grouped[category].map(record => {
              const ex = record.exercise
              const isPlayable = ex.trackingMode === "A" || ex.trackingMode === "B" || ex.trackingMode === "D"
              
              return (
                <div key={record.id} className="p-4 rounded-2xl bg-paper border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <Link href={`/library/exercise/${ex.id}`} className="flex-1 flex flex-col gap-1 w-full">
                    <span className="font-sans font-medium text-ink">{t(ex.name)}</span>
                    <span className="text-sm text-ink/60">{t("Mode")} {ex.trackingMode} {ex.targetHoldSeconds ? `• ${ex.targetHoldSeconds}s ${t("hold")}` : ""}</span>
                  </Link>
                  
                  {isPlayable ? (
                    <Link 
                      href={`/session?exerciseId=${ex.id}`}
                      className="px-5 py-2.5 rounded-full bg-recovery text-paper font-sans font-medium text-sm flex items-center justify-center shrink-0 active:scale-[0.98] transition-transform w-full sm:w-auto"
                    >
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      {t("Start")}
                    </Link>
                  ) : (
                    <span className="px-5 py-2.5 rounded-full bg-ink/10 text-ink/40 font-sans font-medium text-sm text-center shrink-0 w-full sm:w-auto">
                      {t("Coming Soon")}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
