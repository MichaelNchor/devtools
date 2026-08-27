import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "DevTools",
  description: "Local-first developer utilities. Nothing leaves your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          An explicit choice wins. With nothing stored we follow the operating
          system, which is what a visitor who has never touched the toggle is
          asking for.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.theme;' +
              'if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))' +
              'document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
      </head>
      <body
        style={{ ["--font-ui" as string]: "var(--font-mono)" }}
        className={`${nunito.variable} ${mono.variable} font-sans`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
