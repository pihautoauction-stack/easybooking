"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ШАГ 1: Отправка кода на почту
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          shouldCreateUser: true, // Позволяет и входить, и регистрироваться автоматически
        }
      });
      if (error) throw error;
      setStep(2); // Переключаем на шаг ввода кода
    } catch (err: any) {
      setError(err.message || "Ошибка отправки кода. Проверьте почту.");
    } finally {
      setLoading(false);
    }
  };

  // ШАГ 2: Проверка кода
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({ 
        email, 
        token: code, 
        type: 'email' 
      });
      if (error) throw error;
      // Если код верный, пускаем в кабинет
      router.push("/dashboard");
    } catch (err: any) {
      setError("Неверный или устаревший код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4 text-stone-800 font-sans selection:bg-rose-200 antialiased">
      <div className="w-full max-w-[400px] bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-stone-200/50 border border-stone-100 relative overflow-hidden">
        
        {/* Элементы дизайна */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-50 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center shadow-lg shadow-stone-900/20 mb-6">
            <span className="font-bold text-white tracking-tight text-2xl">NX</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 text-center leading-tight">
            Вход в Nexio
          </h1>
          <p className="text-sm font-bold text-stone-400 mt-2 text-center uppercase tracking-widest">
            ERP System
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Укажите Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-base font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-400"
                placeholder="name@example.com"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !email}
              className="w-full mt-4 bg-stone-900 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:bg-black disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Получить код <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-6">
              <p className="text-sm font-bold text-stone-500">Код отправлен на почту:</p>
              <p className="text-base font-black text-stone-900 mt-1">{email}</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Код из письма</label>
              <input 
                type="text" 
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center text-2xl tracking-[0.5em] font-black outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-300"
                placeholder="000000"
                maxLength={8}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !code}
              className="w-full mt-4 bg-stone-900 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:bg-black disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти в кабинет"}
            </button>

            <button 
              type="button"
              onClick={() => {
                setStep(1);
                setCode("");
                setError(null);
              }}
              className="w-full mt-4 text-sm font-bold text-stone-400 hover:text-stone-800 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Назад
            </button>
          </form>
        )}

      </div>
    </div>
  );
}