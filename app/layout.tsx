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
  icons: {
    icon: "/icons/favicon-dark.svg",
  },
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
          className="sticky top-0 z-50 flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "saturate(180%) blur(16px)",
            WebkitBackdropFilter: "saturate(180%) blur(16px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <img src="/icons/dark-full.svg" alt="DMPro Logo" className="h-[24px] w-auto mt-0.5" />
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
