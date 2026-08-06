"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // 1. Register the user via API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Registration failed")
        setLoading(false)
        return
      }

      // 2. Automatically sign them in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password
      })

      if (signInRes?.error) {
        setError("Account created, but failed to sign in automatically.")
        setLoading(false)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-line">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ink font-medium">Create Account</h1>
          <p className="text-ink/70 mt-2">Start your recovery journey today.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-line bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-recovery/20 focus:border-recovery transition-colors text-ink"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-line bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-recovery/20 focus:border-recovery transition-colors text-ink"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-line bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-recovery/20 focus:border-recovery transition-colors text-ink"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-ink/50 mt-1.5">Must be at least 6 characters long.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-ink text-white rounded-xl font-medium hover:bg-ink/90 transition-colors disabled:opacity-70 mt-2"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-ink/70">
          Already have an account?{" "}
          <Link href="/login" className="text-recovery font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
