"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowRight, KeyRound, UserRound, Building2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [setupRole, setSetupRole] = useState<"solo" | "owner">("solo");
    const [setupName, setSetupName] = useState("");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace("/dashboard");
        });
    }, [router]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); 
        setMessage(null);

        const trySend = async (isRetry = false) => {
            try {
                const { error } = await supabase.auth.signInWithOtp({ email });
                if (error) {
                    setMessage({ type: "error", text: error.message });
                } else {
                    setMessage({ type: "success", text: "Код отправлен! Проверьте почту." });
                    setStep(2);
                }
            } catch (err: any) {
                if (!isRetry) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await trySend(true);
                } else {
                    setMessage({ type: "error", text: "Ошибка сети: " + err.message });
                }
            }
        };

        await trySend(false);
        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setMessage(null);
        
        try {
            const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
            
            if (error) {
                setMessage({ type: "error", text: "Неверный код." });
                setLoading(false);
                return;
            } 
            
            if (data?.session?.user) {
                const { data: profile } = await supabase.from('profiles')
                    .select('business_name, role')
                    .eq('id', data.session.user.id)
                    .maybeSingle();

                if (!profile?.business_name) {
                    setUserId(data.session.user.id);
                    setStep(3); 
                } else {
                    router.replace("/dashboard");
                }
            }
        } catch (err: any) {
            setMessage({ type: "error", text: "Системная ошибка: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSetupProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').upsert({ 
                id: userId, 
                role: setupRole, 
                business_name: setupName 
            });

            if (error) throw error;
            router.replace("/dashboard");
        } catch (err: any) {
            alert(`Ошибка сохранения: ${err.message}\n\nВозможно, у таблицы profiles нет Primary Key или включен RLS.`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-5 sm:p-6 font-sans selection:bg-[#0A84FF]/30 antialiased">
            <div className="bg-[#1C1C1E] p-8 sm:p-10 rounded-[32px] shadow-2xl w-full max-w-md border border-white/10 relative overflow-hidden">
                
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">
                        {step === 3 ? "Настройка профиля" : "Вход в систему"}
                    </h1>
                    <p className="text-white/50 text-sm font-medium">
                        {step === 1 && "Введите email для доступа"}
                        {step === 2 && "8-значный код из письма"}
                        {step === 3 && "Выберите формат вашей работы"}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 mb-6 rounded-2xl text-sm font-medium text-center border ${message.type === "success" ? "bg-[#32D74B]/10 text-[#32D74B] border-[#32D74B]/20" : "bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/20"}`}>
                        {message.text}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-6">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                            <input type="email" required className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all placeholder-white/40" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <button type="submit" disabled={loading || !email} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl text-base shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Получить код <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                            <input type="text" required maxLength={8} className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all text-center text-xl tracking-[0.3em] font-mono placeholder:text-white/20" placeholder="••••••••" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        <button type="submit" disabled={loading || token.length < 8} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl text-base shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти в кабинет"}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleSetupProfile} className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div onClick={() => setSetupRole("solo")} className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-3 active:scale-[0.97] ${setupRole === "solo" ? "bg-[#0A84FF]/10 border-[#0A84FF]/30 text-[#0A84FF]" : "bg-white/[0.04] border-white/5 text-white/50 hover:bg-white/[0.08]"}`}>
                                <UserRound className="w-8 h-8" />
                                <span className="text-xs font-semibold text-center">Работаю<br/>один</span>
                            </div>
                            <div onClick={() => setSetupRole("owner")} className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-3 active:scale-[0.97] ${setupRole === "owner" ? "bg-[#BF5AF2]/10 border-[#BF5AF2]/30 text-[#BF5AF2]" : "bg-white/[0.04] border-white/5 text-white/50 hover:bg-white/[0.08]"}`}>
                                <Building2 className="w-8 h-8" />
                                <span className="text-xs font-semibold text-center">У меня<br/>команда</span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[11px] text-white/50 uppercase font-semibold tracking-wider ml-1">
                                {setupRole === "solo" ? "Ваше имя или название" : "Название компании"}
                            </label>
                            <input required value={setupName} onChange={e => setSetupName(e.target.value)} className="w-full bg-white/[0.06] border border-white/5 rounded-2xl py-4 px-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all placeholder-white/40" placeholder={setupRole === "solo" ? "Иван Иванов" : "Автосервис, Студия..."} />
                        </div>

                        <button type="submit" disabled={loading || !setupName} className="w-full bg-white text-black font-semibold py-4 rounded-2xl shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] active:scale-[0.97] text-base transition-all mt-2 flex justify-center disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить и войти"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}