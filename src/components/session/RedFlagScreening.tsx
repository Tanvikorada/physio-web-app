"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/components/DictionaryProvider"

interface RedFlagScreeningProps {
  onClear: () => void
  onBlock: (flags: string[]) => void
}

const QUESTION_KEYS = [
  { id: "pain",     en: "Are you experiencing sharp or shooting pain right now?" },
  { id: "swelling", en: "Any new or increased swelling since your last session?" },
  { id: "numbness", en: "Any numbness or tingling in the area?" },
  { id: "fever",    en: "Do you have a fever or feel generally unwell today?" },
]

export function RedFlagScreening({ onClear, onBlock }: RedFlagScreeningProps) {
  const { t } = useTranslation()
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({
    pain: null,
    swelling: null,
    numbness: null,
    fever: null,
  })

  const handleAnswer = (id: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const allAnswered = Object.values(answers).every(v => v !== null)

  const handleSubmit = () => {
    const flags = Object.entries(answers)
      .filter(([_, value]) => value === true)
      .map(([id]) => id)

    if (flags.length > 0) {
      onBlock(flags)
    } else {
      onClear()
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded-xl border border-line bg-white p-8 shadow-sm">
      <h2 className="font-serif text-2xl text-ink text-center mb-2">{t("Safety Check")}</h2>
      
      <div className="flex flex-col gap-4">
        {QUESTION_KEYS.map((q) => (
          <div key={q.id} className="flex flex-col gap-3">
            <p className="font-sans text-sm text-ink font-medium">{t(q.en)}</p>
            <div className="flex w-full gap-3">
              <Button
                variant={answers[q.id] === true ? "default" : "outline"}
                className={`flex-1 ${answers[q.id] === true ? "bg-signal text-paper hover:bg-signal/90" : ""}`}
                onClick={() => handleAnswer(q.id, true)}
              >
                {t("Yes")}
              </Button>
              <Button
                variant={answers[q.id] === false ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleAnswer(q.id, false)}
              >
                {t("No")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex w-full justify-center">
        <Button 
          size="lg" 
          className="w-full h-14 text-lg" 
          disabled={!allAnswered} 
          onClick={handleSubmit}
        >
          {t("Continue")}
        </Button>
      </div>
    </div>
  )
}
