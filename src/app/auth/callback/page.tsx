"use client";
import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // ВНИМАНИЕ: Ссылка должна вести прямо в Твоего Бот-Приложение
    window.location.href = "https://t.me/EasyBooking_Bot/app"; 
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center text-center p-6 font-sans">
      <div className="space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xl font-bold tracking-tight">Вход выполнен!</p>
        <p className="text-gray-500 text-sm font-medium">Возвращаемся в Telegram...</p>
      </div>
    </div>
  );
}