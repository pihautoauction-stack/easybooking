"use client";
import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // После подтверждения почты, просто перекидываем в бота
    window.location.href = "https://t.me/ТВОЙ_БОТ_BOT/app"; 
  }, []);

  return <div className="min-h-screen bg-black text-white flex items-center justify-center">Вход выполнен! Возвращаемся в Telegram...</div>;
}