import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArcIndicator } from "@/components/ui/ArcIndicator"

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-3xl p-8 pb-24">
      <header className="mb-16">
        <h1 className="font-serif text-2xl text-ink">Rehab.AI Design System</h1>
        <p className="mt-2 text-base text-ink/70">
          Core tokens and components for Phase 0.
        </p>
      </header>

      {/* Colors */}
      <section className="mb-16">
        <h2 className="mb-6 font-serif text-xl text-ink">Colors</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <ColorSwatch name="--ink" hex="#1B2B2B" bgClass="bg-ink" textClass="text-paper" />
          <ColorSwatch name="--paper" hex="#F6F4EE" bgClass="bg-paper" textClass="text-ink" border />
          <ColorSwatch name="--recovery" hex="#3C6E5E" bgClass="bg-recovery" textClass="text-paper" />
          <ColorSwatch name="--signal" hex="#C4703A" bgClass="bg-signal" textClass="text-paper" />
          <ColorSwatch name="--line" hex="#D8D2C4" bgClass="bg-line" textClass="text-ink" />
        </div>
      </section>

      {/* Typography */}
      <section className="mb-16">
        <h2 className="mb-6 font-serif text-xl text-ink">Typography</h2>
        
        <div className="space-y-8 rounded-lg border border-line p-8">
          <div>
            <div className="mb-2 text-xs text-ink/50 uppercase tracking-wider">Display / Serif (Fraunces)</div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">56px</span>
                <span className="font-serif text-2xl">0 / 120&deg;</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">36px</span>
                <span className="font-serif text-xl">Knee Flexion</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">24px</span>
                <span className="font-serif text-lg">Section Header</span>
              </div>
            </div>
          </div>

          <hr className="border-line" />

          <div>
            <div className="mb-2 text-xs text-ink/50 uppercase tracking-wider">Body / Sans (Inter)</div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">18px</span>
                <span className="font-sans text-base">This is standard body copy used for descriptions.</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">15px</span>
                <span className="font-sans text-sm">Smaller body text for secondary information.</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="w-16 text-xs text-ink/50">13px</span>
                <span className="font-sans text-xs">Caption or very minor label text.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Element (Arc) */}
      <section className="mb-16">
        <h2 className="mb-6 font-serif text-xl text-ink">Signature Element: ArcIndicator</h2>
        <p className="mb-8 max-w-xl text-base text-ink/70">
          Not a generic 0-100% circle. The arc physically sweeps the exact angle it measures.
          Below: 120&deg; target, shown at 30&deg;, 82&deg;, and 118&deg;.
        </p>

        <div className="mb-8 grid grid-cols-1 gap-12 sm:grid-cols-3">
          <ArcIndicator currentValue={30} targetValue={120} />
          <ArcIndicator currentValue={82} targetValue={120} />
          <ArcIndicator currentValue={118} targetValue={120} />
        </div>

        <h3 className="mb-6 mt-12 font-serif text-lg text-ink">Signal State (Warning/Pain)</h3>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          <ArcIndicator currentValue={30} targetValue={120} color="signal" />
          <ArcIndicator currentValue={82} targetValue={120} color="signal" />
          <ArcIndicator currentValue={118} targetValue={120} color="signal" />
        </div>
      </section>

      {/* Buttons */}
      <section className="mb-16">
        <h2 className="mb-6 font-serif text-xl text-ink">Buttons</h2>
        <div className="flex flex-wrap items-end gap-8 rounded-lg border border-line p-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink/50">Default (Recovery)</span>
            <Button>Start Session</Button>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink/50">Hover/Focus</span>
            {/* Simulate focus/hover with classes manually for demo */}
            <Button className="ring-2 ring-ink ring-offset-2 ring-offset-paper bg-recovery/90">
              Active State
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink/50">Disabled</span>
            <Button disabled>Not Ready</Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink/50">Outline</span>
            <Button variant="outline">View History</Button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink/50">Signal (Escalation)</span>
            <Button variant="signal">Stop Session</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ColorSwatch({
  name,
  hex,
  bgClass,
  textClass,
  border = false,
}: {
  name: string
  hex: string
  bgClass: string
  textClass: string
  border?: boolean
}) {
  return (
    <div
      className={`flex h-32 flex-col justify-end rounded-lg p-4 ${bgClass} ${textClass} ${
        border ? "border border-line" : ""
      }`}
    >
      <div className="font-sans text-sm font-medium">{name}</div>
      <div className="font-sans text-xs opacity-80">{hex}</div>
    </div>
  )
}
