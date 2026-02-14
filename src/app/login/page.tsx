"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowRight, KeyRound } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace("/dashboard");
        });
    }, [router]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Код отправлен! Проверьте почту." });
            setStep(2);
        }
        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { data, error } = await supabase.auth.verifyOtp({
            email, token, type: 'email'
        });

        if (error) {
            setMessage({ type: "error", text: "Неверный код. Проверьте правильность." });
        } else if (data.session) {
            router.replace("/dashboard");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] flex items-center justify-center p-6 font-sans selection:bg-blue-500/30">
            <div className="bg-white/[0.03] p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/10 backdrop-blur-2xl relative overflow-hidden">
                {/* Декоративное свечение на фоне карточки */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">Вход в систему</h1>
                    <p className="text-white/50 text-sm">
                        {step === 1 ? "Введите email для получения доступа" : "Введите 8-значный код из письма"}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-2xl text-sm text-center border backdrop-blur-md ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-red-500/10 text-red-300 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"}`}>
                        {message.text}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendCode} className="space-y-6">
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || !email} className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:active:scale-100">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Получить код <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    maxLength={8} 
                                    className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-center text-xl tracking-[0.3em] font-mono placeholder:text-white/10"
                                    placeholder="••••••••"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} 
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || token.length < 8} className="w-full bg-blue-600/90 backdrop-blur-md border border-blue-400/20 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:active:scale-100">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти в кабинет"}
                        </button>
                        
                        <button type="button" onClick={() => setStep(1)} className="w-full text-white/40 text-sm hover:text-white transition-colors py-2">
                            Вернуться назад
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}