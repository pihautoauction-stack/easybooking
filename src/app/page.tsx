import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Package, BarChart3, Users } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  if (isLoggedIn) {
    redirect("/dashboard");
  }

  const targetUrl = "/login";
  const btnTextAuth = "Войти";
  const btnTextMain = "Начать работу";

  return (
    <div className="min-h-[100dvh] bg-[#FAF9F6] text-stone-800 font-sans selection:bg-rose-200 antialiased overflow-hidden flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-xl border-b border-stone-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Nexio Logo" className="w-10 h-10 drop-shadow-sm ml-1" />
            <span className="text-xl font-black tracking-tight text-stone-900">Nexio</span>
          </div>
          <Link href={targetUrl} className="bg-stone-900 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-black transition-all active:scale-95">
            {btnTextAuth}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">

        {/* КРУПНЫЙ ЛОГОТИП В ЦЕНТРЕ */}
        <img src="/logo.svg" alt="Nexio" className="w-32 h-32 mb-8 drop-shadow-2xl animate-in fade-in zoom-in duration-700" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-500 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          ERP-система нового поколения
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-stone-900 max-w-4xl mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-5">
          Комплексное управление <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">вашим бизнесом</span>
        </h1>

        <p className="text-lg md:text-xl text-stone-500 max-w-2xl mb-10 font-medium animate-in fade-in slide-in-from-bottom-6">
          Управляйте расписанием, ведите складской учет и анализируйте чистую прибыль в едином рабочем пространстве. Идеально для СТО, клиник и салонов.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-7">
          <Link href={targetUrl} className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-400 to-orange-400 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-rose-500/20 hover:opacity-90 transition-all active:scale-95">
            {btnTextMain} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full mt-24 animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 mb-6">
              <CalendarDays className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-stone-900 mb-2">Умный график</h3>
            <p className="text-sm font-medium text-stone-500">Автоматическая онлайн-запись с учетом рабочих дней, перерывов и длительности услуг.</p>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 mb-6">
              <Package className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="text-xl font-black text-stone-900 mb-2">Складской учет</h3>
            <p className="text-sm font-medium text-stone-500">Списание материалов по факту визита. Учет закупочных и розничных цен. Журнал операций.</p>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 mb-6">
              <Users className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-stone-900 mb-2">CRM и Клиенты</h3>
            <p className="text-sm font-medium text-stone-500">История визитов, статистика выручки по каждому клиенту, черные списки и умные заметки.</p>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 mb-6">
              <BarChart3 className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-stone-900 mb-2">Честные финансы</h3>
            <p className="text-sm font-medium text-stone-500">Расчет чистой прибыли и автоматическое начисление зарплат сотрудникам без учета расходников.</p>
          </div>
        </div>
      </main>
    </div>
  );
}