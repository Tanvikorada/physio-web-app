"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, LibraryIcon, BookmarkIcon, ChartIcon, SettingsIcon } from "./Sidebar"
import { useTranslation } from "@/components/DictionaryProvider"

export const BottomTabBar = () => {
  const pathname = usePathname()
  const { t, largeText } = useTranslation()

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Library", href: "/library", icon: LibraryIcon },
    { name: "Saved", href: "/saved", icon: BookmarkIcon },
    { name: "Progress", href: "/progress", icon: ChartIcon },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line pb-safe z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive 
                  ? "text-recovery" 
                  : "text-ink/40 hover:text-ink/70"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {largeText && (
                <span className={`text-[10px] ${isActive ? "font-serif font-medium" : "font-sans"}`}>
                  {t(item.name)}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
