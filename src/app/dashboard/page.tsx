"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Calendar, Copy, Plus, Loader2, Link as LinkIcon, User, Briefcase, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    
    // Состояние профиля
    const [businessName, setBusinessName] = useState("");
    const [workHours, setWorkHours] = useState({ start: 9, end: 21 });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            tg.setHeaderColor('#111111');
            tg.setBackgroundColor('#000000');
        }

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUser(user);
            await loadData(user.id);
            setLoading(false);
        };
        init();
    }, [router]);

    const loadData = async (userId: string) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            setWorkHours({ start: p.work_start_hour || 9, end: p.work_end_hour || 21 });
        }
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId);
        setServices(s || []);
        const { data: a } = await supabase.from("appointments").select("*, service:services(name)").eq("master_id", userId);
        setAppointments(a || []);
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="px-6 pt-8 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Кабинет</h1>
                    <p className="text-gray-500 text-sm font-medium">Управление сервисом</p>
                </div>
                <button onClick={() => supabase.auth.signOut()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                    <LogOut className="w-5 h-5 text-gray-400" />
                </button>
            </header>

            <main className="px-4 pb-32 space-y-6">
                {/* Ссылка */}
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/10 p-6 rounded-[32px] border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Ваша ссылка для записи</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black/40 rounded-2xl p-4 text-[13px] text-blue-200 truncate font-mono border border-white/5">
                            {profileUrl}
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(profileUrl)} className="bg-white text-black px-5 rounded-2xl font-bold active:scale-90 transition-transform">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Настройки Мастера */}
                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-bold">Профиль мастера</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] text-gray-500 font-bold uppercase ml-1">Название студии / Имя</label>
                            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Мастерская Металла" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 transition-all text-sm" />
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 space-y-2">
                                <label className="text-[11px] text-gray-500 font-bold uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> С</label>
                                <select value={workHours.start} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none appearance-none font-bold text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-black">{i}:00</option>)}</select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[11px] text-gray-500 font-bold uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> До</label>
                                <select value={workHours.end} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none appearance-none font-bold text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-black">{i}:00</option>)}</select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Услуги */}
                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-pink-500" />
                            </div>
                            <h2 className="text-lg font-bold">Услуги</h2>
                        </div>
                        <button className="bg-pink-500 p-3 rounded-xl hover:bg-pink-400 active:scale-90 transition-all">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {services.length === 0 ? (
                            <div className="text-center py-6 text-gray-600 border-2 border-dashed border-white/5 rounded-[24px]">Услуги не добавлены</div>
                        ) : services.map(s => (
                            <div key={s.id} className="bg-white/5 p-4 rounded-[24px] border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm">{s.name}</p>
                                    <p className="text-emerald-400 text-xs font-mono">{s.price} ₽</p>
                                </div>
                                <button className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Записи */}
                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-bold">Ближайшие записи</h2>
                    </div>
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <p className="text-gray-600 text-center py-4 italic text-sm">Свободный график — записей пока нет</p>
                        ) : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-white/5 rounded-[24px] border border-white/5 flex justify-between items-center group">
                                <div className="space-y-1">
                                    <div className="text-emerald-400 font-black text-xl font-mono leading-none">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="font-bold text-sm">{app.client_name}</div>
                                    <div className="text-gray-500 text-[11px] font-medium uppercase tracking-wider">{app.service?.name}</div>
                                </div>
                                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                <button 
                    onClick={() => setSaving(true)} 
                    disabled={saving}
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white py-5 rounded-[24px] font-bold text-lg shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Сохранить профиль"}
                </button>
            </div>
        </div>
    );
}