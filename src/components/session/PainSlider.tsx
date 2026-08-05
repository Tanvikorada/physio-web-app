"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PainSliderProps {
  label: string
  onSubmit: (score: number) => void
}

export function PainSlider({ label, onSubmit }: PainSliderProps) {
  const [value, setValue] = useState(0)

  // Calculate signal color intensity based on value (0 to 10)
  // At 0, it should be neutral/grey. At 10, it should be full --signal (#C4703A).
  const intensity = value / 10

  // We can interpolate between a neutral line color (#D8D2C4) and signal (#C4703A)
  // But a simple way using Tailwind is to adjust opacity of the signal color for the thumb/track, 
  // or use a custom CSS variable inline.
  // Actually, we'll just use inline styles to set the background color of the thumb and filled track.

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-xl border border-line bg-white p-8 shadow-sm">
      <h2 className="font-serif text-2xl text-ink">{label}</h2>
      
      <div className="flex w-full flex-col items-center space-y-8">
        <div className="relative w-full">
          <input 
            type="range" 
            min={0} 
            max={10} 
            step={1} 
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-2 w-full appearance-none rounded-full outline-none"
            style={{
              background: `linear-gradient(to right, var(--signal) ${value * 10}%, var(--line) ${value * 10}%)`,
              opacity: 0.3 + (intensity * 0.7), // more opaque as pain goes up
            }}
          />
          {/* Custom thumb styles using global css or simple relative positioning could be better, but native range is okay for prototype. Let's add a large number readout. */}
          <style dangerouslySetInnerHTML={{__html: `
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: var(--signal);
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
          `}} />
        </div>

        <div className="flex items-center justify-center">
          <span className="font-serif text-5xl text-ink" style={{ color: value > 3 ? 'var(--signal)' : 'var(--ink)' }}>
            {value}
          </span>
          <span className="ml-2 font-sans text-sm text-ink/60 uppercase tracking-widest mt-3">/ 10</span>
        </div>

        <div className="flex w-full justify-between font-sans text-xs text-ink/50 px-2">
          <span>0 - No Pain</span>
          <span>10 - Worst Pain</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 w-full">
        <Button onClick={() => onSubmit(value)} size="lg" className="w-full text-lg h-14">
          Confirm
        </Button>
        <p className="text-center font-sans text-[11px] text-ink/40 uppercase tracking-wide">
          Note: These pain thresholds are prototype defaults and not clinically calibrated.
        </p>
      </div>
    </div>
  )
}
