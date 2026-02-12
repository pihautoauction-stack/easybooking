import Link from "next/link";
import { Calendar, Clock, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <main className="flex flex-col items-center text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            EasyBooking: Система записи
          </h1>
          <p className="text-xl text-slate-400">
            Эффективное управление бронированием для вашего бизнеса
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <Calendar className="w-10 h-10 text-blue-400 mb-4" />
            <h3 className="font-semibold text-lg">Удобный календарь</h3>
          </div>
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <Clock className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="font-semibold text-lg">Запись 24/7</h3>
          </div>
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <CheckCircle className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="font-semibold text-lg">Автоматизация</h3>
          </div>
        </div>

        <Link
          href="/login"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20 mt-8 inline-block"
        >
          Начать работу
        </Link>
      </main>
    </div>
  );
}
