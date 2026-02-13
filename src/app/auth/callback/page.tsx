"use client";
import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // Ссылка должна вести ПРЯМО В БОТА, а не на саму себя
    // Замени @YourBotName на имя своего бота
    window.location.href = "https://t.me/EasyBooking_Bot/app"; 
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center font-sans p-6 text-center">
      <div className="space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xl font-bold">Вход выполнен успешно!</p>
        <p className="text-gray-400">Возвращаем вас в Telegram...</p>
      </div>
    </div>
  );
}