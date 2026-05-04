import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppSidebar } from "@/components/app-sidebar";
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
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-background">
        <Providers>
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
