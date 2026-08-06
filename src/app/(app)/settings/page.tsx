import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { updateSettings } from "@/app/actions/settings"
import { getDictionary } from "@/lib/i18n"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LogoutButton } from "@/components/settings/LogoutButton"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const largeText = cookieStore.get("LARGE_TEXT")?.value === "true"
  const { t } = getDictionary(locale)

  return (
    <div className="flex flex-col min-h-[70vh] p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">{t("Settings")}</h1>
        <p className="font-sans text-ink/70 mt-2">
          {t("Language, text size, and accessibility controls.")}
        </p>
      </div>

      <form action={updateSettings} className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="language" className="block font-sans font-medium text-ink">
            {t("Language")}
          </label>
          <select 
            id="language"
            name="language" 
            defaultValue={locale}
            className="w-full bg-white border border-line rounded-xl p-3 text-ink font-sans focus:outline-none focus:border-recovery transition-colors"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="te">తెలుగు (Telugu)</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              name="largeText" 
              value="true"
              defaultChecked={largeText}
              className="w-5 h-5 rounded border-line text-recovery focus:ring-recovery"
            />
            <span className="font-sans font-medium text-ink">
              {t("Large Text Mode")}
            </span>
          </label>
          <p className="font-sans text-sm text-ink/70">
            {t("Increases the size of all text and interactive elements for better readability.")}
          </p>
        </div>

        <button 
          type="submit"
          className="w-full sm:w-auto px-8 py-3 bg-signal text-white rounded-xl font-sans font-medium hover:opacity-90 transition-opacity"
        >
          {t("Save Preferences")}
        </button>
      </form>

      <div className="pt-8 border-t border-line mt-8">
        <h2 className="font-serif text-xl text-ink mb-4">{t("Account")}</h2>
        <LogoutButton label={t("Sign Out")} />
      </div>
    </div>
  )
}
