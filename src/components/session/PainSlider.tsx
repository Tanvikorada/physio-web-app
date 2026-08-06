"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/components/DictionaryProvider"

interface PainSliderProps {
  label: string
  onSubmit: (score: number) => void
}

const PAIN_DESCRIPTORS: Record<number, { labelKey: string; color: string }> = {
  0:  { labelKey: "No pain",        color: "text-recovery" },
  1:  { labelKey: "Very mild",      color: "text-recovery" },
  2:  { labelKey: "Mild",           color: "text-recovery" },
  3:  { labelKey: "Mild",           color: "text-ink/70" },
  4:  { labelKey: "Moderate",       color: "text-ink/70" },
  5:  { labelKey: "Moderate",       color: "text-signal/80" },
  6:  { labelKey: "Moderate-severe", color: "text-signal/80" },
  7:  { labelKey: "Severe",         color: "text-signal" },
  8:  { labelKey: "Severe",         color: "text-signal" },
  9:  { labelKey: "Very severe",    color: "text-signal" },
  10: { labelKey: "Worst imaginable", color: "text-signal font-bold" },
}

export function PainSlider({ label, onSubmit }: PainSliderProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(0)

  const descriptor = PAIN_DESCRIPTORS[value]

  // Interpolate background: 0 = neutral line color, 10 = full signal
  const trackBg = `linear-gradient(to right, var(--color-signal) ${value * 10}%, var(--color-line) ${value * 10}%)`

  return (
    <div className="flex w-full flex-col items-center gap-8 rounded-2xl border border-line bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="font-sans text-xs uppercase tracking-widest text-ink/40">{t("Pain Assessment")}</p>
        <h2 className="font-serif text-2xl text-ink leading-snug">{t(label)}</h2>
        <p className="font-sans text-sm text-ink/50">{t("0 = no pain · 10 = worst pain imaginable")}</p>
      </div>

      {/* Score display */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="font-serif text-7xl leading-none tabular-nums transition-colors duration-300"
          style={{ color: value > 6 ? "var(--color-signal)" : value > 2 ? "var(--color-ink)" : "var(--color-recovery)" }}
        >
          {value}
        </span>
        <span className={`font-sans text-base transition-all duration-300 ${descriptor.color}`}>
          {t(descriptor.labelKey)}
        </span>
      </div>

      {/* Slider */}
      <div className="w-full space-y-3">
        {/* Custom styled range input */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="pain-slider h-3 w-full appearance-none rounded-full outline-none cursor-pointer"
            style={{ background: trackBg }}
            aria-label={t("Pain scale 0 to 10")}
            id="pain-slider-input"
          />
          <style dangerouslySetInnerHTML={{
            __html: `
              .pain-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: ${value > 6 ? "var(--color-signal)" : value > 2 ? "var(--color-ink)" : "var(--color-recovery)"};
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                transition: background 0.3s ease;
              }
              .pain-slider::-moz-range-thumb {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: ${value > 6 ? "var(--color-signal)" : value > 2 ? "var(--color-ink)" : "var(--color-recovery)"};
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              }
            `
          }} />
        </div>

        {/* Endpoint labels */}
        <div className="flex w-full justify-between px-1">
          <div className="flex flex-col items-start">
            <span className="font-sans text-xs font-semibold text-recovery">0</span>
            <span className="font-sans text-[11px] text-ink/50">{t("No pain")}</span>
          </div>
          {/* Tick marks 1–9 */}
          <div className="flex items-center gap-0">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <div key={n} className="flex flex-col items-center" style={{ width: 24 }}>
                <div className={`h-1.5 w-0.5 rounded-full ${n <= value ? "bg-signal/60" : "bg-line"}`} />
                <span className="font-sans text-[9px] text-ink/30 mt-0.5">{n}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end">
            <span className="font-sans text-xs font-semibold text-signal">10</span>
            <span className="font-sans text-[11px] text-ink/50">{t("Worst pain")}</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="w-full space-y-3">
        <Button
          onClick={() => onSubmit(value)}
          size="lg"
          className="w-full text-base h-14"
          style={{
            background: value > 6 ? "var(--color-signal)" : value > 2 ? "var(--color-ink)" : "var(--color-recovery)",
          }}
        >
          {t("Confirm — Pain level")} {value}/10
        </Button>
        {value >= 7 && (
          <p className="text-center font-sans text-xs text-signal font-medium">
            ⚠ {t("High pain reported. This session will be paused for your safety.")}
          </p>
        )}
      </div>
    </div>
  )
}
