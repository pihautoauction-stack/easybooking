"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Регистрация успешна! Теперь вы можете войти.");
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4 text-stone-800 font-sans selection:bg-rose-200 antialiased">
      <div className="w-full max-w-[400px] bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-stone-200/50 border border-stone-100">
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center shadow-lg shadow-stone-900/20 mb-6">
            <span className="font-bold text-white tracking-tight text-2xl">NX</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 text-center leading-tight">
            {isRegister ? "Создать аккаунт" : "Вход в Nexio"}
          </h1>
          <p className="text-sm font-bold text-stone-400 mt-2 text-center uppercase tracking-widest">
            ERP System
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-400"
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Пароль</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-900 transition-all placeholder-stone-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl text-center">
              {error === 'Invalid login credentials' ? 'Неверный email или пароль' : error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-stone-900 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:bg-black"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? "Зарегистрироваться" : "Войти")}
          </button>
        </form>

        <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }} 
              className="text-sm font-bold text-stone-500 hover:text-rose-500 transition-colors"
            >
              {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
            </button>
        </div>

      </div>
    </div>
  );
}