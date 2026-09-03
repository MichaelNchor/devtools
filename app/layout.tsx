import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

const display = Archivo({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "DevTools", template: "%s — DevTools" },
  description: "Developer utilities that run entirely in your browser tab. No server, no network, nothing uploaded.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#090908" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.theme;' +
              'var c=t==="dark"||t==="light"?t:"system";' +
              'document.documentElement.setAttribute("data-theme-choice",c);' +
              'if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))' +
              'document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
