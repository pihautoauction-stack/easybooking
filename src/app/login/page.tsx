"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Если мастер уже вошел, сразу кидаем его в дашборд
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace("/dashboard");
        });
    }, [router]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setMessage(null);
        
        const { error } = await supabase.auth.signInWithOtp({ email });
        
        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Код отправлен на почту" }); 
            setStep(2); 
        }
        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setMessage(null);
        
        const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        
        if (error) { 
            setMessage({ type: "error", text: "Неверный код" }); 
            setLoading(false); 
            return; 
        }
        
        if (data?.session) {
            router.replace("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 antialiased">
            <div className="bg-[#1C1C1E] p-8 rounded-[32px] w-full max-w-sm border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-white mb-2">Вход для специалистов</h1>
                    <p className="text-white/40 text-sm">Управление вашим бизнесом</p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-2xl text-xs text-center border ${message.type === "success" ? "bg-[#32D74B]/10 text-[#32D74B] border-[#32D74B]/20" : "bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/20"}`}>
                        {message.text}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-sm text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all" 
                                placeholder="Ваш Email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </div>
                        <button type="submit" disabled={loading || !email} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Получить код"}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <input 
                            type="text" 
                            required 
                            maxLength={8} 
                            className="w-full py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-white text-center text-xl tracking-[0.3em] font-mono outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all" 
                            placeholder="••••••••" 
                            value={token} 
                            onChange={(e) => setToken(e.target.value)} 
                        />
                        <button type="submit" disabled={loading || token.length < 8} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}