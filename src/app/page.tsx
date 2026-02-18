"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkAuthAndRoute = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/dashboard");
            } else {
                router.replace("/login");
            }
        };

        checkAuthAndRoute();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center text-gray-900">
            <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/10 blur-xl rounded-full"></div>
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 relative z-10" />
            </div>
            <p className="mt-4 text-xs text-gray-400 font-bold tracking-widest uppercase">EasyBooking</p>
        </div>
    );
}