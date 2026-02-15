"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ExternalLink } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.refresh_token) {
        const refreshToken = session.refresh_token;
        const botUsername = "my_cool_booking_bot"; // Твой бот
        
        const url = `https://t.me/${botUsername}/app?startapp=${refreshToken}`;
        setTelegramUrl(url);
        window.location.href = url;
      } else {
        router.push("/login");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center text-white antialiased">
        <div className="bg-[#1C1C1E] p-10 rounded-[32px] shadow-2xl flex flex-col items-center w-full max-w-sm border border-white/10">
            <CheckCircle2 className="w-16 h-16 text-[#32D74B] mb-6" />
            
            <h1 className="text-2xl font-semibold mb-2 tracking-tight">Вход успешен</h1>
            <p className="text-white/60 mb-8 text-sm">
              Теперь вернитесь в Telegram, чтобы продолжить работу.
            </p>
            
            {telegramUrl ? (
              <a 
                href={telegramUrl} 
                className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-semibold text-lg shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              >
                <ExternalLink className="w-5 h-5" /> Открыть приложение
              </a>
            ) : (
              <p className="text-sm text-white/40 font-medium animate-pulse">Генерация ссылки...</p>
            )}
        </div>
    </div>
  );
}