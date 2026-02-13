"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Редирект в кабинет после входа
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 font-medium tracking-tight">Вход выполнен успешно...</p>
      </div>
    </div>
  );
}