import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { RouteTransition } from "../components/RouteTransition";
import Navigation from "../components/Navigation";
import { ThemeProvider } from "../components/ThemeProvider";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "Nyxion VPN",
  description: "Быстрый и безопасный VPN сервис",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const themeInitScript = `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
  } catch (e) {
    console.warn('Theme init failed', e);
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="overflow-x-hidden min-h-screen bg-background dark:bg-surfaceDark">
        <ThemeProvider>
          <div className="flex flex-col min-h-screen max-w-lg mx-auto relative">
            <Header />
            <main className="flex-1 overflow-y-auto pb-24">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <Navigation />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
