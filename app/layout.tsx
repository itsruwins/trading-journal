import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/src/lib/auth";
import { ThemeProvider } from "@/src/lib/theme";
import { REVEAL_BOOT_SCRIPT } from "@/src/components/landing/reveal-boot";
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
  title: {
    default: "Trading Journal",
    template: "%s · Trading Journal",
  },
  description:
    "A premium journal for serious traders — log trades, review performance, refine your edge.",
};

/* The dock sits against the bottom edge, so the page has to extend into the
   home-indicator area — env(safe-area-inset-*) reports 0 without this. */
export const viewport: Viewport = {
  viewportFit: "cover",
};

const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* Arms the landing page's scroll reveals. Inert on every other route
            — nothing outside the landing page carries a .reveal — but it has
            to be here rather than in the page: React never executes a <script>
            rendered inside a component on a client render. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
