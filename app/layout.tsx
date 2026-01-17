import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { RouteTransition } from "../components/RouteTransition";
import Navigation from "../components/Navigation";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "Nyxion VPN",
  description: "Быстрый и безопасный VPN сервис",
};

const themeInitScript = `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
    <html lang="ru">
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="overflow-x-hidden flex flex-col min-h-screen">
        <ThemeProvider>
          <div className="flex-1 overflow-y-auto pb-20">
            <RouteTransition>{children}</RouteTransition>
          </div>
          <Navigation />
        </ThemeProvider>
      </body>
    </html>
  );
}
