import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyBooking",
  description: "Онлайн-запись для специалистов",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EasyBooking",
  },
  icons: {
    apple: '/icon-192.png', // Иконка для iPhone
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F9FAFB", // Светлый премиальный фон
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-[#F9FAFB] text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}