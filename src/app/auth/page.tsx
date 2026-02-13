"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // ВНИМАНИЕ: Если имя бота другое, поменяй "my_cool_booking_bot"
    const botName = "my_cool_booking_bot";
    
    // Ждем 1 секунду и перекидываем в бота
    const timer = setTimeout(() => {
       window.location.href = `https://t.me/${botName}/app`; 
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#17212b] text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
      <h1 className="text-xl font-bold mb-2">Вход выполнен!</h1>
      <p className="text-gray-400 text-sm">Возвращаемся в Telegram...</p>
      
      <a 
        href="https://t.me/my_cool_booking_bot/app" 
        className="mt-8 inline-block text-blue-400 text-xs uppercase font-bold tracking-wider hover:text-blue-300 transition-colors"
      >
        Нажмите, если не перешло автоматически
      </a>
    </div>
  );
}