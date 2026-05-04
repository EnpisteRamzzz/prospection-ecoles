import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/providers";
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
  title: "Prospection Écoles Privées",
  description: "App de prospection B2B — Formations Genially & IA (Formiris / OPCO)",
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
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="border-b bg-white sticky top-0 z-40">
            <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
              <Link href="/" className="font-semibold text-sm shrink-0">Prospection</Link>
              <div className="flex items-center gap-1 text-sm">
                <Link href="/etablissements" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Établissements</Link>
                <Link href="/pipeline" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Pipeline</Link>
                <Link href="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Dashboard</Link>
                <Link href="/aujourdhui" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Aujourd&apos;hui</Link>
                <Link href="/sequences" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Séquences</Link>
                <Link href="/import" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Import</Link>
                <Link href="/parametres/donnees" className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 transition-colors">Paramètres</Link>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
