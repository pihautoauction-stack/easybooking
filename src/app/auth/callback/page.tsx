"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Ждем секунду и перекидываем. 
    // ВАЖНО: Если имя бота другое, поменяй его здесь!
    setTimeout(() => {
        window.location.href = "https://t.me/EasyBooking_Bot/app"; 
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
        <div className="w-8 h-8 text-blue-500">➜</div>
      </div>
      <h1 className="text-2xl font-bold mb-2">Вход выполнен!</h1>
      <p className="text-gray-500 text-sm mb-8">Возвращаемся в Telegram...</p>
      
      <a href="https://t.me/EasyBooking_Bot/app" className="text-blue-500 font-bold hover:underline">
        Нажмите здесь, если не перешло
      </a>
    </div>
  );
}