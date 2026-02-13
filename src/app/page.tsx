"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MiniAppEntry() {
  const router = useRouter();
  const [status, setStatus] = useState("Загрузка...");

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const startParam = tg.initDataUnsafe?.start_param;

      if (startParam) {
        // У тебя в базе ID мастера (UUID) имеет длину 36 символов
        // Токен авторизации всегда гораздо длиннее (обычно больше 100 символов)
        
        if (startParam.length > 40) {
          // ЭТО МАСТЕР (Токен входа)
          setStatus("Авторизация мастера...");
          // Отправляем в дашборд, он сам подхватит токен из Telegram WebApp
          router.replace("/dashboard");
        } else {
          // ЭТО КЛИЕНТ (ID мастера)
          setStatus("Переход к записи...");
          router.replace(`/book/${startParam}`);
        }
      } else {
        // Нет параметров — просто идем в кабинет
        setStatus("Вход в кабинет...");
        router.replace("/dashboard");
      }
    } else {
      // Если открыли не в Telegram (например, подтверждение почты в Safari)
      // Мы отправляем на dashboard, где сработает наша "ловушка Safari"
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-400 text-sm animate-pulse">{status}</p>
    </div>
  );
}