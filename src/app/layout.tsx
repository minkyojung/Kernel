import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Istanbul — Creator Analytics",
  description: "Track, analyze, and improve your content performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <nav className="flex items-center gap-6">
                <a href="/" className="font-semibold tracking-tight">
                  Istanbul
                </a>
                <a
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </a>
                <a
                  href="/posts"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Posts
                </a>
                <a
                  href="/connect"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Connect
                </a>
                <a
                  href="/settings"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Settings
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
