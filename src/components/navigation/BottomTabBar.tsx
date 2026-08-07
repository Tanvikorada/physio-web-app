"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, LibraryIcon, BookmarkIcon, ChartIcon, SettingsIcon } from "./Sidebar"
import { useTranslation } from "@/components/DictionaryProvider"

export const BottomTabBar = () => {
  const pathname = usePathname()
  const { t } = useTranslation()

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Library", href: "/library", icon: LibraryIcon },
    { name: "Saved", href: "/saved", icon: BookmarkIcon },
    { name: "Progress", href: "/progress", icon: ChartIcon },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 min-h-[44px] transition-all duration-200 active:scale-95 ${
                isActive 
                  ? "text-recovery" 
                  : "text-ink/40 hover:text-ink/70"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className={`text-[10px] leading-none ${isActive ? "font-medium" : "font-sans"}`}>
                {t(item.name)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
