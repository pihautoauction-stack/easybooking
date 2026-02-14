"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, Scissors, Trash2, CalendarX2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function MyBookings() {
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#050505');
            
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
            // ИСПРАВЛЕННЫЙ ПУТЬ К API:
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

            if (!res.ok) throw new Error("Ошибка удаления");

            // Удаляем визуально только после успеха
            setAppointments(prev => prev.filter(a => a.id !== app.id));
            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({ message: "Запись успешно отменена" });
            }
        } catch (error) {
            alert("Не удалось отменить запись. Попробуйте еще раз.");
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
            <div className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)]">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white p-4 sm:p-5 font-sans pb-24 selection:bg-blue-500/30">
            <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6 sm:mb-8 pt-4">
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 drop-shadow-md">
                        <Calendar className="w-6 h-6 text-blue-400" /> Ваши записи
                    </h1>
                    <button onClick={() => window.history.back()} className="text-xs font-bold text-white/50 bg-white/5 px-3 py-1.5 rounded-lg active:scale-95 transition-all hover:bg-white/10">Назад</button>
                </div>

                <div className="space-y-4">
                    {appointments.length === 0 ? (
                        <div className="text-center py-12 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <CalendarX2 className="w-8 h-8 text-white/30" />
                            </div>
                            <p className="text-white/40 text-sm">У вас нет активных записей</p>
                        </div>
                    ) : appointments.map(app => (
                        <div key={app.id} className="bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-5 sm:p-6 border border-white/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-blue-400 font-bold font-mono text-2xl sm:text-3xl drop-shadow-md leading-none mb-1">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1.5">
                                        {format(new Date(app.start_time), "d MMMM", { locale: ru })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white/90 text-sm sm:text-base font-bold truncate max-w-[120px] sm:max-w-[150px]">{app.master?.business_name || "Мастер"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 bg-black/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 mb-4">
                                <Scissors className="w-4 h-4 text-pink-400/70 shrink-0" />
                                <span className="truncate flex-1">{app.service?.name}</span>
                                <span className="font-bold text-pink-400 shrink-0">{app.service?.price} ₽</span>
                            </div>

                            <button onClick={() => handleCancel(app)} disabled={cancellingId === app.id} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-xl sm:rounded-2xl border border-red-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100">
                                {cancellingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Отменить запись <Trash2 className="w-4 h-4" /></>}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}