"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function ExportModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState("all")
  const router = useRouter()

  const handleExport = () => {
    setIsOpen(false)
    router.push(`/report?range=${range}`)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground text-ink"
      >
        Export Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-serif text-xl text-ink">Generate Clinical Report</h2>
            <p className="mb-4 font-sans text-sm text-ink/70">Select the date range for your report.</p>
            
            <div className="mb-6 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-sans text-ink">
                <input 
                  type="radio" 
                  name="range" 
                  value="all" 
                  checked={range === "all"} 
                  onChange={(e) => setRange(e.target.value)}
                  className="accent-recovery w-4 h-4"
                />
                Since first session
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-sans text-ink">
                <input 
                  type="radio" 
                  name="range" 
                  value="30days" 
                  checked={range === "30days"} 
                  onChange={(e) => setRange(e.target.value)}
                  className="accent-recovery w-4 h-4"
                />
                Last 30 days
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 font-sans text-sm text-ink/70 hover:text-ink"
              >
                Cancel
              </button>
              <button 
                onClick={handleExport}
                className="rounded-md bg-recovery px-4 py-2 font-sans text-sm font-medium text-white shadow-sm hover:opacity-90"
              >
                Generate Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
