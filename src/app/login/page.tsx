"use client";

import { useState, useEffect } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, UserRound } from "lucide-react";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (pb.authStore.isValid) router.replace("/dashboard");
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError("");

        try {
            if (isLogin) {
                await pb.collection('users').authWithPassword(email, password);
            } else {
                await pb.collection('users').create({
                    email, password, passwordConfirm: password, business_name: name
                });
                await pb.collection('users').authWithPassword(email, password);
            }
            router.replace("/dashboard");
        } catch (err: any) {
            setError(err.message || "Ошибка авторизации. Проверьте данные.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 antialiased">
            <div className="bg-[#1C1C1E] p-8 rounded-[32px] w-full max-w-sm border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-white mb-2">{isLogin ? "Вход в кабинет" : "Регистрация"}</h1>
                    <p className="text-white/40 text-sm">Управление вашим бизнесом</p>
                </div>

                {error && <div className="p-4 mb-6 rounded-2xl text-xs text-center bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative">
                            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                            <input type="text" required className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-sm text-white outline-none" placeholder="Имя или название бизнеса" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                        <input type="email" required className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-sm text-white outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                        <input type="password" required className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/5 rounded-2xl text-sm text-white outline-none" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Войти" : "Создать аккаунт")}
                    </button>
                </form>

                <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-white/40 hover:text-white transition-colors">
                    {isLogin ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
                </button>
            </div>
        </div>
    );
}