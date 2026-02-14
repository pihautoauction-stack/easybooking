import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyBooking",
  description: "Запись клиентов в Telegram",
};

// Жесткая фиксация масштаба экрана (блокировка зума для iOS/Android)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050505", // Делает шторку телефона в цвет приложения
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-slate-900 text-white antialiased">
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
        {children}
      </body>
    </html>
  );
}