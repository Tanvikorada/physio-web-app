import prisma from "@/lib/prisma"
import Link from "next/link"
import { Search } from "lucide-react"
import { SaveButton } from "@/components/library/SaveButton"
import { cookies } from "next/headers"
import { getDictionary } from "@/lib/i18n"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function LibraryHome({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  
  // If searching, show matching exercises
  if (q && q.trim() !== "") {
    const exercises = await prisma.exercise.findMany({
      where: {
        name: {
          contains: q,
          mode: "insensitive"
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

    return (
      <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl text-ink mb-6">{t("Search Results")}</h1>
        <form className="relative mb-8" action="/library">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
          <input 
            type="text" 
            name="q"
            defaultValue={q}
            placeholder={t("Search exercises...")}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:border-signal/50 text-ink"
          />
        </form>

        <div className="flex flex-col gap-3">
          {exercises.length === 0 ? (
            <p className="text-ink/60 text-center py-10">{t("No exercises found.")}</p>
          ) : (
            exercises.map(ex => (
              <Link key={ex.id} href={`/library/exercise/${ex.id}`} className="p-4 rounded-2xl bg-paper border border-line flex items-center justify-between active:scale-[0.98] transition-transform">
                <div className="flex flex-col gap-1">
                  <span className="font-sans font-medium text-ink">{t(ex.name)}</span>
                  <span className="text-sm text-ink/60">{t(ex.categories[0])} &bull; {t("Mode")} {ex.trackingMode}</span>
                </div>
                <SaveButton exerciseId={ex.id} initialIsSaved={savedExerciseIds.has(ex.id)} />
              </Link>
            ))
          )}
        </div>
      </div>
    )
  }

  // Otherwise, show categories
  const exercises = await prisma.exercise.findMany({
    select: { categories: true }
  })
  
  const categoryCounts: Record<string, number> = {}
  exercises.forEach(ex => {
    ex.categories.forEach(cat => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
  })
  
  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const { t } = getDictionary(locale)

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl text-ink mb-6">{t("Library")}</h1>
      
      <form className="relative mb-8" action="/library">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
        <input 
          type="text" 
          name="q"
          placeholder={t("Search exercises...")}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-paper border border-line focus:outline-none focus:border-signal/50 text-ink"
        />
      </form>

      <div className="flex flex-col gap-3">
        {categories.map(cat => (
          <Link key={cat.name} href={`/library/category/${encodeURIComponent(cat.name)}`} className="flex items-center justify-between p-4 rounded-2xl bg-paper border border-line active:scale-[0.98] transition-transform">
            <span className="font-sans font-medium text-ink">{t(cat.name)}</span>
            <span className="text-sm text-ink/40 bg-line/30 px-2 py-1 rounded-full">{cat.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
