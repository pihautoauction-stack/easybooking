"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      // 1. Получаем сессию
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.refresh_token) {
        // 2. Формируем ссылку для возврата
        const refreshToken = session.refresh_token;
        const botUsername = "my_cool_booking_bot"; // Твой бот
        
        // Ссылка, которая откроет приложение с токеном
        const url = `https://t.me/${botUsername}/app?startapp=${refreshToken}`;
        setTelegramUrl(url);

        // 3. Пытаемся открыть автоматически (может не сработать в Safari)
        window.location.href = url;
      } else {
        // Если сессии нет — кидаем на логин
        router.push("/login");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#17212b] text-white flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2">Вход успешен!</h1>
      <p className="text-gray-400 text-sm mb-8">
        Теперь вернитесь в Telegram, чтобы продолжить.
      </p>
      
      {/* КНОПКА БУДЕТ ВСЕГДА */}
      {telegramUrl && (
        <a 
          href={telegramUrl} 
          className="bg-[#5288c1] hover:bg-[#4a7db3] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all transform active:scale-95"
        >
          Открыть приложение
        </a>
      )}

      {!telegramUrl && <p className="text-xs text-gray-500 animate-pulse">Генерация ссылки...</p>}
    </div>
  );
}