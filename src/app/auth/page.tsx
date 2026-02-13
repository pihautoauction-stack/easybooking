"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // 1. Проверяем сессию
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 2. Если вошли — формируем ссылку в Telegram
        // ВАЖНО: Используем твой юзернейм my_cool_booking_bot
        const botUsername = "my_cool_booking_bot";
        
        // Добавляем параметр, чтобы бот знал, что мы что-то обновили
        const tgUrl = `https://t.me/${botUsername}/app?startapp=auth_success`;
        
        // 3. Перекидываем
        window.location.href = tgUrl;
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#17212b] text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h1 className="text-xl font-bold mb-2">Авторизация...</h1>
      <p className="text-gray-400 text-sm mb-8">
        Переносим вас в Telegram
      </p>
      
      <a 
        href="https://t.me/my_cool_booking_bot/app" 
        className="bg-[#5288c1] text-white px-6 py-3 rounded-xl font-bold text-sm"
      >
        Открыть вручную
      </a>
    </div>
  );
}