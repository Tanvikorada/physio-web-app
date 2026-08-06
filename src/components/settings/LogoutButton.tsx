"use client"

import { signOut } from "next-auth/react"

export function LogoutButton({ label }: { label: string }) {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="w-full sm:w-auto px-8 py-3 bg-red-500/10 text-red-600 border border-red-200 rounded-xl font-sans font-medium hover:bg-red-500/20 transition-colors"
    >
      {label}
    </button>
  )
}
