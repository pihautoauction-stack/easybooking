"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkAuthAndRoute = async () => {
            // Получаем текущую сессию
            const { data: { session } } = await supabase.auth.getSession();
            
            // Если у человека есть активная сессия -> кидаем в Дашборд
            if (session) {
                router.replace("/dashboard");
            } else {
                // Иначе - кидаем на страницу логина
                router.replace("/login");
            }
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