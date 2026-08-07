import { Sidebar } from "@/components/navigation/Sidebar"
import { BottomTabBar } from "@/components/navigation/BottomTabBar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Activity } from "lucide-react"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  return (
    <div className="flex min-h-screen bg-paper w-full">
      <Sidebar user={session?.user} />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-line sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="bg-recovery/10 text-recovery p-1 rounded-md">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-xl font-medium tracking-tight text-ink">Rehab<span className="text-recovery">.AI</span></h1>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
