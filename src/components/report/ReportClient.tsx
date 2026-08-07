"use client"

import * as React from "react"
import { useRef, useState } from "react"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { PainChart } from "@/components/dashboard/PainChart"
import { ArcIndicator } from "@/components/ui/ArcIndicator"
import Link from "next/link"

interface ReportClientProps {
  user: { name: string | null }
  dateRange: string
  summary: string
  exercises: any[]
}

export function ReportClient({ user, dateRange, summary, exercises }: ReportClientProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false
      })
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      const pdf = new jsPDF("p", "mm", "a4")
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`RehabReport_${user.name?.replace(/\s+/g, "") || "Patient"}_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl mb-8 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-line">
        <div>
          <h2 className="font-serif text-xl text-ink">Report Preview</h2>
          <p className="font-sans text-sm text-ink/70">Review the generated report before downloading.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard" className="px-4 py-2 font-sans text-sm text-ink border border-input rounded-md hover:bg-accent transition-colors">
            Back to Dashboard
          </Link>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-recovery text-white px-6 py-2 rounded-md font-sans text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isExporting ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* The Actual Report to be exported */}
      <div className="w-full overflow-x-auto pb-8">
        <div className="mx-auto w-max min-w-full bg-paper shadow-lg flex justify-center">
          {/* We fix the width to something akin to A4 at 96 DPI to make scaling predictable (approx 794px width) */}
          <div ref={reportRef} className="w-[794px] bg-paper p-12 text-ink flex flex-col gap-10 shrink-0">
          
          {/* Header */}
          <header className="border-b-2 border-line pb-6">
            <h1 className="font-serif text-4xl text-ink font-medium tracking-tight mb-2">Rehab.AI Clinical Report</h1>
            <div className="flex justify-between items-end font-sans">
              <div>
                <p className="text-lg"><span className="text-ink/60">Patient:</span> {user.name}</p>
                <p className="text-lg"><span className="text-ink/60">Period:</span> {dateRange}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ink/60">Generated</p>
                <p className="text-base font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </header>

          {/* AI Summary */}
          <section className="bg-white p-6 rounded-xl border border-line shadow-sm">
            <h2 className="font-serif text-xl text-ink mb-3 flex items-center gap-2">
              <span className="text-recovery text-2xl">✦</span> Clinical Overview
            </h2>
            <p className="font-sans text-base leading-relaxed text-ink/90">
              {summary}
            </p>
          </section>

          {/* Exercise Breakdowns */}
          {exercises.map((ex, i) => {
            const chartData = ex.sessionsData.map((s: any) => ({
              date: s.date,
              rom: s.romAchieved,
              status: s.status
            }))
            
            const painData = ex.sessionsData.map((s: any) => ({
              date: s.date,
              pain: s.painScorePre !== null ? s.painScorePre : s.painScorePost, // Default to pre-pain, or post if pre is missing
              status: s.status
            }))

            return (
              <section key={i} className="flex flex-col gap-6">
                <div className="border-b border-line/50 pb-2 flex justify-between items-end">
                  <h2 className="font-serif text-2xl text-ink">{ex.name}</h2>
                  <p className="font-sans text-sm text-ink/70">Target ROM: {ex.targetROM}&deg;</p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Adherence & Progress */}
                  <div className="col-span-1 bg-white p-5 rounded-xl border border-line flex flex-col items-center justify-center gap-4">
                    <ArcIndicator currentValue={ex.currentROM} targetValue={ex.targetROM} />
                    <div className="text-center font-sans">
                      <p className="text-sm text-ink/60 uppercase tracking-wide mb-1">Adherence</p>
                      <p className="text-3xl font-serif text-ink">{ex.adherencePct ?? Math.round((ex.completedCount / Math.max(ex.sessionsCount, 1)) * 100)}%</p>
                      <p className="text-xs text-ink/50 mt-1">{ex.completedCount} of {ex.sessionsCount} sessions</p>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="col-span-2 flex flex-col gap-6">
                    <div className="bg-white p-4 rounded-xl border border-line">
                      <p className="font-sans text-sm font-medium text-ink mb-2">Range of Motion Trend (&deg;)</p>
                      <TrendChart data={chartData} targetROM={ex.targetROM} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-line">
                      <p className="font-sans text-sm font-medium text-ink mb-2">Reported Pain Trend (0-10)</p>
                      <PainChart data={painData} />
                    </div>
                  </div>
                </div>

                {/* Safety Log */}
                {(ex.escalationNote || ex.blockedCount > 0) && (
                  <div className="bg-signal/5 border border-signal/20 p-5 rounded-xl mt-2">
                    <h3 className="font-serif text-lg text-signal mb-3 flex items-center gap-2">
                      <span className="text-xl">⚠</span> Safety & Escalation Log
                    </h3>
                    <ul className="list-disc pl-5 font-sans text-sm text-ink/80 space-y-2 leading-relaxed">
                      {ex.escalationNote && (
                        <li><strong>Active Escalation:</strong> {ex.escalationNote}</li>
                      )}
                      {ex.sessionsData.filter((s: any) => s.status === "blocked").map((s: any, idx: number) => (
                        <li key={idx}>
                          <strong>{new Date(s.date).toLocaleDateString()}:</strong> Session blocked by safety gate. Reason: {s.blockedReason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )
          })}

          {/* Footer Disclaimer */}
          <footer className="mt-auto pt-10 border-t border-line">
            <p className="font-sans text-[11px] text-ink/50 leading-relaxed text-justify uppercase tracking-wider">
              Disclaimer: This report is generated by an AI-assisted self-tracking tool and is not a clinical diagnosis. It is intended to support, not replace, assessment by a licensed physiotherapist. Do not make medical decisions solely based on this report.
            </p>
          </footer>
        </div>
      </div>
    </div>
  </div>
)
}
