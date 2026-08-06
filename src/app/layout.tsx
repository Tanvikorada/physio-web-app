import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { DictionaryProvider } from "@/components/DictionaryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const viewport: Viewport = {
  themeColor: "#3C6E5E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Rehab.AI",
  description: "Clinical-grade physiotherapy self-tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rehab.AI",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const largeText = cookieStore.get("LARGE_TEXT")?.value === "true";

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      style={{ fontSize: largeText ? "125%" : "100%" }}
    >
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        <DictionaryProvider initialLanguage={locale} initialLargeText={largeText}>
          {children}
        </DictionaryProvider>
      </body>
    </html>
  );
}
