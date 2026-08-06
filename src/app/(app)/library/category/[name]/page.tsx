import prisma from "@/lib/prisma"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { SaveButton } from "@/components/library/SaveButton"
import { cookies } from "next/headers"
import { getDictionary } from "@/lib/i18n"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function CategoryPage({
  params
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const categoryName = decodeURIComponent(name)

  const exercises = await prisma.exercise.findMany({
    where: {
      categories: {
        has: categoryName
      }
    },
    orderBy: { name: "asc" }
  })

  const sessionAuth = await getServerSession(authOptions)
  const userId = sessionAuth?.user?.id
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const { t } = getDictionary(locale)

  const savedExercises = userId 
    ? await prisma.savedExercise.findMany({
        where: { userId },
        select: { exerciseId: true }
      })
    : []
  
  const savedExerciseIds = new Set(savedExercises.map(se => se.exerciseId))

  // Helper for tracking mode badges
  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "A": return { label: "AI rep-tracked", className: "bg-signal/20 text-signal" }
      case "B": return { label: "AI hold-tracked", className: "bg-blue-500/20 text-blue-600" }
      case "C": return { label: t("Coming Soon"), className: "bg-ink/10 text-ink/60" }
      case "D": return { label: "Guided", className: "bg-orange-500/20 text-orange-600" }
      default: return { label: "Unknown", className: "bg-ink/10 text-ink/60" }
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/library" className="flex items-center text-ink/60 mb-6 font-sans text-sm active:opacity-50">
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t("Back to Library")}
      </Link>
      
      <h1 className="font-serif text-3xl text-ink mb-8">{t(categoryName)}</h1>

      <div className="flex flex-col gap-3">
        {exercises.map(ex => {
          const badge = getModeBadge(ex.trackingMode)
          return (
            <Link key={ex.id} href={`/library/exercise/${ex.id}`} className="p-4 rounded-2xl bg-paper border border-line flex items-center justify-between active:scale-[0.98] transition-transform">
              <div className="flex flex-col gap-2">
                <span className="font-sans font-medium text-ink">{t(ex.name)}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md w-fit ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <SaveButton exerciseId={ex.id} initialIsSaved={savedExerciseIds.has(ex.id)} />
            </Link>
          )
        })}
        {exercises.length === 0 && (
          <p className="text-ink/60 text-center py-10">{t("No exercises found.")}</p>
        )}
      </div>
    </div>
  )
}
