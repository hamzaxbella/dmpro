import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

const navItems = [
  { href: "/inbox", label: "Inbox", icon: "MessageSquare" },
  { href: "/board", label: "Board", icon: "LayoutGrid" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/reminders", label: "Reminders", icon: "Bell" },
];

// Minimal SVG icons — no dependency needed
function NavIcon({ name }: { name: string }) {
  switch (name) {
    case "LayoutGrid":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "BarChart3":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
      );
    case "Bell":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "MessageSquare":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

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
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link flex items-center gap-2">
                  <NavIcon name={item.icon} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
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
