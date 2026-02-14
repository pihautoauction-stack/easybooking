"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MiniAppEntry() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#050505');

      const startParam = tg.initDataUnsafe?.start_param;

      if (startParam === 'my_bookings') {
        // Клиент хочет посмотреть свои записи
        router.replace('/my-bookings');
      } else if (startParam && startParam.length === 36) {
        // Клиент пришел по ссылке мастера
        router.replace(`/book/${startParam}`);
      } else {
        // Мастер пришел в кабинет
        router.replace("/dashboard");
      }
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white selection:bg-blue-500/30">
        <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)] mb-6">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
        <p className="text-white/40 text-sm animate-pulse tracking-widest uppercase font-mono">Проверка доступа...</p>
    </div>
  );
}