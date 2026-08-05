"use client"

export function InstallButton() {
  return (
    <button
      type="button"
      onClick={() => {
        alert("To install as an app: \nOn iOS: Tap Share -> 'Add to Home Screen'\nOn Android/Desktop: Click the install icon in your URL bar.")
      }}
      className="w-full sm:w-auto px-8 py-4 bg-paper text-ink border-2 border-line rounded-full font-medium hover:bg-line/20 transition-all duration-300 text-lg"
    >
      Install App
    </button>
  )
}
