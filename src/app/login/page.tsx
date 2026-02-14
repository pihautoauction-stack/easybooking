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
            setMessage({ type: "success", text: "Код отправлен! Проверьте письмо (там 8 цифр)." });
            setStep(2);
        }
        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });

        if (error) {
            setMessage({ type: "error", text: "Неверный код. Проверьте правильность или запросите новый." });
        } else if (data.session) {
            router.replace("/dashboard");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Вход в систему</h1>
                    <p className="text-slate-400">
                        {step === 1 ? "Введите email для получения доступа" : "Введите 8-значный код из письма"}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-lg text-sm text-center ${message.type === "success" ? "bg-emerald-900/50 text-emerald-200 border border-emerald-800" : "bg-red-900/50 text-red-200 border border-red-800"}`}>
                        {message.text}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendCode} className="space-y-6">
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-all"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || !email} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Получить код <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    maxLength={8} 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-all text-center text-xl tracking-widest font-mono"
                                    placeholder="12345678"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} 
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || token.length < 8} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти в кабинет"}
                        </button>
                        
                        <button type="button" onClick={() => setStep(1)} className="w-full text-slate-500 text-sm hover:text-white transition-colors">
                            Вернуться назад
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}