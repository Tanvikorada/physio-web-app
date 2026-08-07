import prisma from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Info, Play } from "lucide-react"
import { SaveButton } from "@/components/library/SaveButton"
import { cookies } from "next/headers"
import { getDictionary } from "@/lib/i18n"
import { ExerciseDemo3D, Demo3DConfig } from "@/components/library/ExerciseDemo3D"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function ExerciseDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const exercise = await prisma.exercise.findUnique({
    where: { id }
  })

  if (!exercise) {
    notFound()
  }

  const sessionAuth = await getServerSession(authOptions)
  const userId = sessionAuth?.user?.id
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const { t } = getDictionary(locale)

  let isSaved = false
  if (userId) {
    const saved = await prisma.savedExercise.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId: id
        }
      }
    })
    isSaved = !!saved
  }

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case "A": return t("modeA_desc")
      case "B": return t("modeB_desc")
      case "C": return t("modeC_desc")
      case "D": return t("modeD_desc")
      default: return ""
    }
  }

  const isPlayable = exercise.trackingMode === "A" || exercise.trackingMode === "B" || exercise.trackingMode === "D"

  // 3D Demo configuration mapping for flagship exercises
  const demoConfig: Record<string, Demo3DConfig> = {
    "Shoulder Abduction": { boneName: "RightArm", rotationAxis: "y", rotationDirection: 1, startAngleDeg: 25, targetAngleDeg: 90, useQuaternionSlerp: true },
    "Shoulder Flexion": { boneName: "RightArm", rotationAxis: "x", rotationDirection: 1, startAngleDeg: 20, targetAngleDeg: 140, useQuaternionSlerp: true },
    "Heel Slides": { boneName: "RightLeg", rotationAxis: "x", rotationDirection: 1, startAngleDeg: 160, targetAngleDeg: 90, useQuaternionSlerp: true },
    "Neck Rotation": { boneName: "Neck", rotationAxis: "y", rotationDirection: 1, startAngleDeg: 15, targetAngleDeg: 60, useQuaternionSlerp: true },
    "Hip Abduction": { boneName: "RightUpLeg", rotationAxis: "z", rotationDirection: 1, startAngleDeg: 175, targetAngleDeg: 145, useQuaternionSlerp: true },
    "Ankle Pumps": { boneName: "RightFoot", rotationAxis: "x", rotationDirection: 1, startAngleDeg: 120, targetAngleDeg: 90, useQuaternionSlerp: true },
  }

  const demoParams = demoConfig[exercise.name]
  
  // Extract landmark config if available
  const lmConfig = exercise.landmarkConfig as any
  const startAngle = lmConfig?.rep_start_angle ?? demoParams?.startAngleDeg
  const targetAngle = lmConfig?.rep_top_angle ?? demoParams?.targetAngleDeg

  if (demoParams) {
    // Override with dynamic tracking angles if they exist
    demoParams.startAngleDeg = startAngle;
    demoParams.targetAngleDeg = targetAngle;
  }

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <Link href={`/library/category/${encodeURIComponent(exercise.categories[0])}`} className="flex items-center text-ink/60 mb-4 font-sans text-sm active:opacity-50 w-fit">
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t("Back to")} {t(exercise.categories[0])}
      </Link>
      
      <div className="flex items-start justify-between mb-2">
        <h1 className="font-serif text-2xl md:text-3xl text-ink leading-tight">{t(exercise.name)}</h1>
        <SaveButton exerciseId={exercise.id} initialIsSaved={isSaved} />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {exercise.categories.map(cat => (
          <span key={cat} className="text-xs font-semibold px-2 py-1 rounded-md bg-paper border border-line text-ink/60">
            {t(cat)}
          </span>
        ))}
      </div>

      {demoParams && (
        <ExerciseDemo3D config={demoParams} />
      )}

      {/* AI Briefing — fetched and displayed server-side */}
      {exercise.aiBriefing && (
        <div className="bg-recovery/5 border border-recovery/25 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-recovery/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-recovery">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-sans text-xs font-semibold text-recovery uppercase tracking-wide">Before you start</span>
          </div>
          <p className="font-sans text-sm text-ink/80 leading-relaxed">{exercise.aiBriefing}</p>
        </div>
      )}

      <div className="bg-paper border border-line rounded-2xl p-4 mb-4">
        <h2 className="font-sans font-medium text-ink mb-2 flex items-center text-sm">
          <Info className="w-4 h-4 mr-2 opacity-50" />
          {t("Instructions")}
        </h2>
        <p className="font-sans text-ink/80 text-sm leading-relaxed">
          {t(exercise.instructionsFull || exercise.description || "")}
        </p>
      </div>

      <div className="bg-paper border border-line rounded-2xl p-5 mb-8">
        <h2 className="font-sans font-medium text-ink mb-2">{t("Tracking Details")}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink/60">{t("Mode")}:</span>
            <span className="font-medium text-ink">{t("Type " + exercise.trackingMode)}</span>
          </div>
          {exercise.targetHoldSeconds && (
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">{t("Hold Target")}:</span>
              <span className="font-medium text-ink">{exercise.targetHoldSeconds}s</span>
            </div>
          )}
          <p className="text-sm text-ink/80 bg-ink/5 p-3 rounded-xl mt-2 leading-relaxed">
            {getModeDescription(exercise.trackingMode)}
          </p>
        </div>
      </div>

      {isPlayable ? (
        <Link 
          href={`/session?exerciseId=${exercise.id}`}
          className="mt-auto w-full min-h-[52px] rounded-full bg-signal text-paper font-sans font-medium text-base flex items-center justify-center active:scale-[0.98] transition-transform shadow-md shadow-signal/20"
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          {t("Start Session")}
        </Link>
      ) : (
        <button 
          disabled
          className="mt-auto w-full min-h-[52px] rounded-full bg-ink/10 text-ink/40 font-sans font-medium text-base flex items-center justify-center cursor-not-allowed"
        >
          {t("Coming Soon")}
        </button>
      )}
    </div>
  )
}
