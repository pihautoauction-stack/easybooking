"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MiniAppEntry() {
  const router = useRouter();
  const [status, setStatus] = useState("Загрузка...");

  useEffect(() => {
    // Проверяем, открыто ли в Telegram
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Проверяем start_param (например, ?startapp=user-uuid-123)
      const startParam = tg.initDataUnsafe?.start_param;

      if (startParam) {
        setStatus("Переход к записи...");
        router.replace(`/book/${startParam}`);
      } else {
        setStatus("Вход в кабинет...");
        router.replace("/dashboard");
      }
    } else {
      // Если открыли в обычном браузере
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-400 text-sm animate-pulse">{status}</p>
    </div>
  );
}