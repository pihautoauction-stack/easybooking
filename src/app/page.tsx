"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#050505');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#050505');
        }

        const checkAuthAndRoute = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            // Получаем параметр из ссылки Telegram (startapp)
            const startParam = tg?.initDataUnsafe?.start_param;
            
            // 1. Если у человека есть сессия мастера -> в Дашборд
            if (session) {
                router.replace("/dashboard");
                return;
            }

            // 2. ВАЖНО: Если клиент перешел по ссылке мастера, у него будет start_param (UUID)
            if (startParam && startParam.length > 10 && startParam.length < 40) {
                router.replace(`/book/${startParam}`);
                return;
            }

            // 3. Если просто открыл бота (через кнопку меню), кидаем в его записи
            const tgUser = tg?.initDataUnsafe?.user;
            if (tgUser?.id) {
                router.replace("/my-bookings");
                return;
            }

            // 4. Иначе - страница входа (для мастеров через обычный браузер)
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