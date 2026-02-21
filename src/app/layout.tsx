import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Nexio | Умная система онлайн-записи и учета",
  description: "Единое пространство для управления расписанием, сотрудниками и складом. Создано для профессионалов.",
  applicationName: "Nexio",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Nexio",
    statusBarStyle: "default", // или "black-translucent" если хочешь прозрачную статусную строку
  },
  themeColor: "#FAF9F6", // Цвет шапки в браузере мобилки
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Отключаем зум, чтобы было как в нативном приложении
    viewportFit: "cover",
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
        {/* Принудительный хак для старых и текущих версий iOS (добавляет эффект приложения) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}