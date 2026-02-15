"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, Briefcase, Trash2, CalendarX2, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function MyBookings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#000000');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
            
            const tgId = tg.initDataUnsafe?.user?.id?.toString();
            if (tgId) {
                loadBookings(tgId);
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const loadBookings = async (tgId: string) => {
        const { data } = await supabase.from("appointments")
            .select("id, start_time, client_name, service:services(name, price), master:profiles(business_name, telegram_chat_id)")
            .eq("client_tg_id", tgId)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true });
            
        setAppointments(data || []);
        setLoading(false);
    };

    const handleCancel = async (app: any) => {
        if (!confirm("Вы уверены, что хотите отменить запись?")) return;
        setCancellingId(app.id);

        try {
            const res = await fetch('/api/notify/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: app.id,
                    masterChatId: app.master?.telegram_chat_id,
                    serviceName: app.service?.name,
                    startTime: app.start_time,
                    clientName: app.client_name
                }),
            });

            if (!res.ok) throw new Error("База данных отклонила запрос");

            setAppointments(prev => prev.filter(a => a.id !== app.id));
            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({ message: "Запись успешно отменена" });
            }
        } catch (error: any) {
            alert("Ошибка: " + error.message);
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#000000] text-white p-5 font-sans pb-24 selection:bg-[#0A84FF]/30 antialiased">
            <div className="max-w-md mx-auto w-full">
                
                {/* HEADER */}
                <div className="flex items-center gap-3 mb-8 pt-2">
                    <button onClick={() => router.back()} className="p-2.5 bg-[#1C1C1E] rounded-full border border-white/5 active:scale-95 shrink-0 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-semibold tracking-tight text-white truncate">Ваши записи</h1>
                        <p className="text-[11px] text-white/50 font-semibold tracking-wider mt-0.5 uppercase">Кабинет клиента</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {appointments.length === 0 ? (
                        <div className="text-center py-12 bg-[#1C1C1E] border border-white/5 rounded-[32px]">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarX2 className="w-8 h-8 text-white/30" />
                            </div>
                            <p className="text-white/50 font-medium text-sm">У вас нет активных записей</p>
                        </div>
                    ) : appointments.map(app => (
                        <div key={app.id} className="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/10 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-white font-semibold text-3xl tracking-tight leading-none mb-1.5">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
                                        {format(new Date(app.start_time), "d MMMM", { locale: ru })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-semibold text-sm truncate max-w-[140px] bg-white/10 px-3 py-1.5 rounded-xl">
                                        {app.master?.business_name || "Специалист"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm font-medium text-white/70 bg-white/5 p-4 rounded-2xl border border-white/5 mb-4">
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <Briefcase className="w-4 h-4 text-white/40 shrink-0" />
                                    <span className="truncate">{app.service?.name}</span>
                                </div>
                                <span className="font-semibold text-white shrink-0">{app.service?.price} ₽</span>
                            </div>

                            <button onClick={() => handleCancel(app)} disabled={cancellingId === app.id} className="w-full bg-transparent text-[#FF453A] font-semibold py-4 rounded-2xl border border-[#FF453A]/20 hover:bg-[#FF453A]/10 active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {cancellingId === app.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Отменить запись <Trash2 className="w-4 h-4" /></>}
                            </button>
                        </div>
                    ))}
                </div>

                {/* ВХОД ДЛЯ СПЕЦИАЛИСТОВ */}
                <div className="mt-12 mb-6 text-center">
                    <button 
                        onClick={() => router.push('/login')} 
                        className="text-[11px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors font-semibold"
                    >
                        Вход для специалистов
                    </button>
                </div>

            </div>
        </div>
    );
}