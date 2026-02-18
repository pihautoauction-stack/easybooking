import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Подключаем премиальный округлый шрифт
const manrope = Manrope({ 
  subsets: ["cyrillic", "latin"],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "EasyBooking",
  description: "Онлайн-запись для специалистов",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EasyBooking",
  },
  icons: {
    apple: '/icon-192.png',
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAF9F6", // Теплый пастельный цвет
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      {/* Применяем шрифт и теплый бежево-кремовый фон ко всему сайту */}
      <body className={`${manrope.className} bg-[#FAF9F6] text-stone-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}