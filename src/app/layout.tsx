import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "API Vitals",
  description: "Upload an API spec, test every endpoint, see what's slow and what's broken.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full scroll-smooth`}
      data-app-theme="light"
    >
      <body className="min-h-full font-sans antialiased">
        <Script id="app-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('hg_app_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-app-theme',t);}catch(e){}`}
        </Script>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
