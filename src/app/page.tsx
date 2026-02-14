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

      const startParam = tg.initDataUnsafe?.start_param;

      // Если это UUID мастера (36 символов) — на запись к "Зимней Вишне"
      if (startParam && startParam.length === 36) {
        router.replace(`/book/${startParam}`);
      } else {
        // Во всех остальных случаях (включая вход по токену) — в кабинет
        router.replace("/dashboard");
      }
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-400 text-sm animate-pulse">Проверка доступа...</p>
    </div>
  );
}