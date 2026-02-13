"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // ВНИМАНИЕ: Ссылка без @, и в конце добавляем /app, чтобы открылось приложение
    window.location.href = "https://t.me/my_cool_booking_bot/app"; 
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-emerald-500/30">
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Вход выполнен!</h1>
      <p className="text-slate-400 text-sm mb-8">
        Возвращаемся в Telegram...
      </p>
      
      <a 
        href="https://t.me/my_cool_booking_bot/app" 
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
      >
        Открыть вручную
      </a>
    </div>
  );
}