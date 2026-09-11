import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/auth/AppHeader";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "The AI Prep Kit",
  description: "Turn a job description into a researched, coverage-checked interview prep kit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <div className="app-atmosphere" aria-hidden>
          <span className="app-orb app-orb-a" />
          <span className="app-orb app-orb-b" />
          <span className="app-orb app-orb-c" />
          <span className="app-grid" />
          <span className="app-noise" />
          <span className="app-vignette" />
        </div>
        <AuthProvider>
          <AppHeader />
          <main className="relative z-[1] flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
