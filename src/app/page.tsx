"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                router.replace("/dashboard");
            } else {
                router.replace("/login");
            }
        };

        checkAuth();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-white antialiased">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" />
            <p className="mt-4 text-[11px] text-white/40 font-semibold tracking-widest uppercase">EasyBooking</p>
        </div>
    );
}