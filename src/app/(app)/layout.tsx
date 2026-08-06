import { Sidebar } from "@/components/navigation/Sidebar"
import { BottomTabBar } from "@/components/navigation/BottomTabBar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
        <main className="flex-1">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
