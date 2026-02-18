"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#050505');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#050505');
        }

        const checkAuthAndRoute = async () => {
            const startParam = tg?.initDataUnsafe?.start_param;

            // 1. ИСПРАВЛЕНИЕ: Проверяем, не является ли параметр скрытым ТОКЕНОМ для входа специалиста (длиннее 40 символов)
            if (startParam && startParam.length > 40) {
                const { data, error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                if (!error && data.session) {
                    router.replace("/dashboard");
                    return;
                }
            }

            // Получаем текущую сессию
            const { data: { session } } = await supabase.auth.getSession();
            
            // 2. Если у человека уже есть сохраненная сессия специалиста -> кидаем в Дашборд
            if (session) {
                router.replace("/dashboard");
                return;
            }

            // 3. Если клиент перешел по ссылке для записи (ID специалиста - 36 символов)
            if (startParam && startParam.length > 10 && startParam.length <= 40) {
                router.replace(`/book/${startParam}`);
                return;
            }

            // 4. Если кто-то просто открыл бота (через кнопку меню), кидаем его в кабинет клиента
            const tgUser = tg?.initDataUnsafe?.user;
            if (tgUser?.id) {
                router.replace("/my-bookings");
                return;
            }

            // 5. Иначе - кидаем на страницу логина (для браузера)
            router.replace("/login");
        };

        checkAuthAndRoute();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
            <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full"></div>
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative z-10" />
            </div>
            <p className="mt-4 text-sm text-white/40 font-medium tracking-widest uppercase">EasyBooking</p>
        </div>
    );
}