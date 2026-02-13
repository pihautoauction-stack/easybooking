"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // После подтверждения почты редиректим в личный кабинет
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center font-sans">
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
        <p className="text-xl font-black tracking-tight">Вход выполнен!</p>
        <p className="text-slate-500 font-medium">Готовим ваш кабинет...</p>
      </div>
    </div>
  );
}