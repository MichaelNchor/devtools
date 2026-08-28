import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  // A template, so every tool page reads "JSON Merge — DevTools" in the tab
  // rather than repeating the site name by hand in each route.
  title: { default: "DevTools", template: "%s — DevTools" },
  description: "Twenty-two developer utilities that run entirely in your browser tab. No server, no network, nothing uploaded.",
};

// Next wants this separate from metadata; the tab strip is mostly favicons,
// so the theme colour matches the icon tile.
export const viewport: Viewport = {
  themeColor: "#236DC9",
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
              'var c=t==="dark"||t==="light"?t:"system";' +
              // Stamped before paint so the toggle can light the correct
              // option in its FIRST render. Without it the component boots at
              // "system", then snaps to the stored choice after hydration —
              // which is the flicker this attribute exists to remove.
              'document.documentElement.setAttribute("data-theme-choice",c);' +
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
