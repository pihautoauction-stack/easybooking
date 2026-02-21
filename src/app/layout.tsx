import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

// Настройки окна (viewport) для правильного Full Screen (PWA) на iOS и Android
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Отключаем зум двойным тапом
  viewportFit: "cover", // Заставляет сайт залезть под "челку" (Dynamic Island)
  themeColor: "#FAF9F6", // Цвет подложки системного бара
};

export const metadata: Metadata = {
  title: "Nexio | Умная система онлайн-записи и учета",
  description: "Единое пространство для управления расписанием, сотрудниками и складом. Создано для профессионалов.",
  applicationName: "Nexio",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true, // Включает режим "без браузерной строки" на iOS
    title: "Nexio",
    statusBarStyle: "black-translucent", // Статус бар накладывается поверх приложения
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}