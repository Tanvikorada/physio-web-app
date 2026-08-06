import { InstallButton } from "@/components/InstallButton"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Decorative background blur */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-recovery/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-signal/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 max-w-2xl mx-auto space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-recovery/10 text-recovery font-medium text-sm mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-recovery opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-recovery"></span>
            </span>
            AI-Powered Physiotherapy
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-ink tracking-tight font-medium">
            Your personal <span className="text-recovery">rehab</span> assistant.
          </h1>
          <p className="text-lg md:text-xl text-ink/70 leading-relaxed max-w-xl mx-auto">
            Recover faster with real-time motion tracking, smart analytics, and clinical-grade guidance based on APTA standards right from your browser.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-ink text-paper rounded-full font-medium hover:bg-ink/90 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-ink/20 text-lg text-center"
          >
            Get Started
          </Link>
          <InstallButton />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 mt-12 border-t border-line/50 text-left">
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-line/50 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">📷</div>
            <h3 className="font-serif text-lg font-medium text-ink mb-2">Live Tracking</h3>
            <p className="text-sm text-ink/70">Uses your device camera to measure Range of Motion instantly.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-line/50 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">📈</div>
            <h3 className="font-serif text-lg font-medium text-ink mb-2">Smart Trends</h3>
            <p className="text-sm text-ink/70">AI analyzes your pain and progress to adjust your recovery path.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-line/50 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="font-serif text-lg font-medium text-ink mb-2">Private by Design</h3>
            <p className="text-sm text-ink/70">No videos are ever recorded or sent to the cloud. Processed locally.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
