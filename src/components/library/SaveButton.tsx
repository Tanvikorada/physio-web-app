"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"

interface SaveButtonProps {
  exerciseId: string
  initialIsSaved: boolean
  className?: string
}

export function SaveButton({ exerciseId, initialIsSaved, className = "p-2 text-ink/30 hover:text-signal transition-colors shrink-0" }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigating if inside a Link
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)
    const originalState = isSaved
    setIsSaved(!isSaved) // Optimistic update

    try {
      if (originalState) {
        // Was saved, now unsave
        const res = await fetch(`/api/saved?exerciseId=${exerciseId}`, {
          method: "DELETE"
        })
        if (!res.ok) throw new Error("Failed to unsave")
      } else {
        // Was unsaved, now save
        const res = await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId })
        })
        if (!res.ok) throw new Error("Failed to save")
      }
      // Refresh server components so Dashboard + Saved update immediately
      router.refresh()
    } catch (error) {
      console.error(error)
      // Revert on error
      setIsSaved(originalState)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      className={`${className} ${isSaved ? "text-signal" : ""}`}
      aria-label={isSaved ? "Unsave exercise" : "Save exercise"}
    >
      <Bookmark className="w-5 h-5 md:w-6 md:h-6" fill={isSaved ? "currentColor" : "none"} />
    </button>
  )
}
