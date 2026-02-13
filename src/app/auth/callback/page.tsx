"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Авто-редирект через 1 сек
    const timer = setTimeout(() => {
       // ВАЖНО: Убедись, что имя бота правильное
       window.location.href = "https://t.me/EasyBooking_Bot/app"; 
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Вход выполнен!</h1>
      <p className="text-gray-500 text-sm mb-8">
        Перенаправляем в приложение...
      </p>
      
      <a 
        href="https://t.me/EasyBooking_Bot/app" 
        className="text-blue-500 text-sm font-bold hover:underline"
      >
        Нажмите, если не перешло автоматически
      </a>
    </div>
  );
}