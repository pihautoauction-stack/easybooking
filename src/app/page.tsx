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
        // Проверка: UUID мастера = 36 символов, Токен = больше 40 символов
        if (startParam.length > 40) {
          // ЭТО МАСТЕР (вход по токену из Safari)
          setStatus("Авторизация мастера...");
          router.replace("/dashboard");
        } else if (startParam.length === 36) {
          // ЭТО КЛИЕНТ (запись по ID мастера)
          setStatus("Переход к записи...");
          router.replace(`/book/${startParam}`);
        } else {
          // Любой другой непонятный параметр
          router.replace("/dashboard");
        }
      } else {
        router.replace("/dashboard");
      }
    } else {
      // Если открыто в браузере (подтверждение почты)
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