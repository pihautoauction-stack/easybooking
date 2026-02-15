"use client";

import { useEffect } from "react";
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
            if (tg.setHeaderColor) tg.setHeaderColor('#000000');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
        }

        const checkAuthAndRoute = async () => {
            const startParam = tg?.initDataUnsafe?.start_param;

            if (startParam && startParam.length > 40) {
                const { data, error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                if (!error && data.session) {
                    router.replace("/dashboard");
                    return;
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                router.replace("/dashboard");
                return;
            }

            if (startParam && startParam.length > 10 && startParam.length <= 40) {
                router.replace(`/book/${startParam}`);
                return;
            }

            const tgUser = tg?.initDataUnsafe?.user;
            if (tgUser?.id) {
                router.replace("/my-bookings");
                return;
            }

            router.replace("/login");
        };

        checkAuthAndRoute();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-white antialiased">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" />
            <p className="mt-4 text-[11px] text-white/40 font-semibold tracking-widest uppercase">EasyBooking</p>
        </div>
    );
}