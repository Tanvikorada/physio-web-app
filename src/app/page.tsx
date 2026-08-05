import Link from "next/link"
import { ArcIndicator } from "@/components/ui/ArcIndicator"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:px-12 max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-recovery/10 text-recovery text-sm font-sans font-medium mb-4">
            Clinical-Grade Self-Tracking
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-ink font-medium tracking-tight leading-tight">
            Recover smarter with <br className="hidden md:block"/>
            <span className="text-recovery">Rehab.AI</span>
          </h1>
          <p className="font-sans text-lg md:text-xl text-ink/70 max-w-xl mx-auto leading-relaxed">
            Your personal physiotherapy companion. Track your range of motion accurately using just your device's camera, adapt to your pain levels, and generate exportable clinical reports.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link 
            href="/dashboard"
            className="rounded-full bg-recovery px-8 py-3 font-sans text-base font-medium text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <a 
            href="#how-it-works"
            className="rounded-full bg-white border border-line px-8 py-3 font-sans text-base font-medium text-ink shadow-sm hover:bg-paper transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Feature Explanation Section */}
      <section id="how-it-works" className="bg-white border-t border-line py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl text-ink text-center mb-16">Designed for clinical compliance and patient safety.</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-recovery/10 text-recovery flex items-center justify-center text-2xl mx-auto md:mx-0">
                1
              </div>
              <h3 className="font-serif text-xl text-ink">Smart Tracking</h3>
              <p className="font-sans text-ink/70 leading-relaxed">
                Uses advanced pose estimation to measure your joint angles in real-time. No wearables required.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-signal/10 text-signal flex items-center justify-center text-2xl mx-auto md:mx-0">
                2
              </div>
              <h3 className="font-serif text-xl text-ink">Pain Adaptive</h3>
              <p className="font-sans text-ink/70 leading-relaxed">
                Log your pain before every session. Rehab.AI automatically scales down your targets to keep you safe if you're hurting.
              </p>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-ink/10 text-ink flex items-center justify-center text-2xl mx-auto md:mx-0">
                3
              </div>
              <h3 className="font-serif text-xl text-ink">Clinical Reports</h3>
              <p className="font-sans text-ink/70 leading-relaxed">
                Export one-click PDF reports featuring adherence metrics and AI-generated factual summaries for your physiotherapist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Install App Section */}
      <section className="bg-paper py-20 px-6 md:px-12 text-center border-t border-line">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="font-serif text-3xl text-ink">Install Rehab.AI</h2>
          <p className="font-sans text-ink/70 text-lg leading-relaxed">
            For the best experience, install Rehab.AI as an app on your phone. Tap the <strong className="text-ink">Share</strong> button on iOS or the menu on Android, and select <strong className="text-ink">"Add to Home Screen"</strong>.
          </p>
        </div>
      </section>
    </main>
  )
}
