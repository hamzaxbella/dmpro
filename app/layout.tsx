import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DMPro — Instagram DM Pipeline",
  description:
    "Manage your Instagram DM outreach pipeline with a visual kanban board, analytics, and smart reminders.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--background)" }}>
        {/* Top navigation */}
        <header
          className="sticky top-0 z-50"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 h-14">
            {/* Logo */}
            <Link href="/board" className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "var(--accent)" }}
              >
                D
              </div>
              <span className="font-semibold text-[0.9375rem] tracking-[-0.01em]" style={{ color: "var(--foreground)" }}>
                DMPro
              </span>
            </Link>

            {/* Nav links */}
            <NavLinks />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
