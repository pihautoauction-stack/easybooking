"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // 1. Проверяем, вошли ли мы в Safari
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.refresh_token) {
        // 2. Если вошли — берем Refresh Token (ключ)
        const refreshToken = session.refresh_token;
        const botUsername = "my_cool_booking_bot"; // Твой бот
        
        // 3. Передаем этот ключ прямо в приложение через параметр startapp
        // Телеграм прочитает его и войдет автоматически
        window.location.href = `https://t.me/${botUsername}/app?startapp=${refreshToken}`;
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#17212b] text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h1 className="text-lg font-bold">Вход выполнен...</h1>
      <p className="text-gray-400 text-sm mt-2">Переносим доступ в Telegram</p>
    </div>
  );
}