"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"email" | "code">("email");
    const router = useRouter();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
            alert(error.message);
        } else {
            setStep("code");
        }
        setLoading(false);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        if (error) {
            alert("Неверный код. Попробуйте еще раз.");
            setLoading(false);
        } else {
            router.replace("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-5 text-gray-900 font-sans antialiased selection:bg-indigo-100">
            
            <div className="w-16 h-16 bg-white rounded-2xl mb-8 border border-gray-100 flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <span className="font-bold text-indigo-600 text-2xl tracking-tight">EB</span>
            </div>

            <div className="w-full max-w-[340px] bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <h1 className="text-2xl font-black mb-2 tracking-tight text-gray-900 text-center">
                    {step === "email" ? "Вход в кабинет" : "Введите код"}
                </h1>
                <p className="text-sm text-gray-500 mb-8 font-medium text-center leading-relaxed">
                    {step === "email" 
                        ? "Введите почту, и мы отправим вам пароль для входа." 
                        : `Мы отправили код на ${email}`}
                </p>

                {step === "email" ? (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                required type="email" placeholder="Ваш Email" value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-200 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400 shadow-sm" 
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-indigo-600/30 flex justify-center items-center mt-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Получить код"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                required type="text" placeholder="8-значный код" value={token} 
                                onChange={e => setToken(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-200 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400 shadow-sm tracking-widest" 
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/30 flex justify-center items-center mt-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти"}
                        </button>
                        <button type="button" onClick={() => setStep("email")} className="w-full text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest mt-4">
                            Назад
                        </button>
                    </form>
                )}
            </div>
            
        </div>
    );
}