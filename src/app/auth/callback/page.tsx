"use client";
import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // После подтверждения почты, просто перекидываем в бота
    window.location.href = "https://easybooking-omega.vercel.app/auth/callback"
"; 
  }, []);

  return <div className="min-h-screen bg-black text-white flex items-center justify-center">Вход выполнен! Возвращаемся в Telegram...</div>;
}