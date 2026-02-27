"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";

const supabase = createClient();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });
      if (error) throw error;
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Ошибка отправки кода. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

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

      router.replace("/dashboard");
    } catch (err: any) {
      setError("Неверный код. Проверьте правильность или запросите новый.");
      setLoading(false);
    }
  };

  // ЭКРАН ЗАГРУЗКИ: Показываем анимированный логотип, пока проверяется память
  if (loading && step === 1) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 selection:bg-rose-200 antialiased relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-rose-100/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-orange-100/40 rounded-full blur-3xl pointer-events-none"></div>
        <img src="/logo.svg" alt="Nexio Logo" className="w-32 h-32 mb-6 drop-shadow-2xl" />
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe pb-safe bg-[#FAF9F6] flex items-center justify-center p-4 text-stone-800 font-sans selection:bg-rose-200 antialiased relative overflow-hidden">

      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-rose-100/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-orange-100/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[40px] shadow-2xl shadow-stone-200/50 border border-stone-100 relative z-10">

        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Nexio Logo" className="w-24 h-24 mb-1 drop-shadow-xl" />
          <h1 className="text-2xl font-black tracking-tight text-stone-900 text-center leading-tight">
            Вход в систему
          </h1>
          <p className="text-xs font-bold text-stone-400 mt-2 text-center uppercase tracking-widest">
            Nexio ERP
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Рабочий Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-0.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-base font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-400"
                placeholder="name@company.com"
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Получить код доступа <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-center text-center mb-1">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                <MailCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-stone-500">Код отправлен на почту</p>
              <p className="text-sm font-black text-stone-900 mt-0.5">{email}</p>
            </div>

            <div>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-2 text-center text-3xl tracking-[0.3em] font-black outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-300"
                placeholder="••••••••"
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
              disabled={loading || code.length < 6}
              className="w-full bg-stone-900 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:bg-black disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти в систему"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode("");
                setError(null);
              }}
              className="w-full text-xs font-bold text-stone-400 hover:text-stone-800 transition-colors flex items-center justify-center gap-1.5 pt-2"
            >
              <ArrowLeft className="w-3 h-3" /> Вернуться назад
            </button>
          </form>
        )}

      </div>
    </div>
  );
}