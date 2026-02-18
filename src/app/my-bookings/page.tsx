"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CalendarX2, Briefcase, Trash2, ChevronLeft, Phone, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function MyBookings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState("");
    const [isPhoneSet, setIsPhoneSet] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        // Проверяем память браузера на наличие номера телефона клиента
        const savedPhone = localStorage.getItem('eb_phone');
        if (savedPhone) {
            setPhone(savedPhone);
            setIsPhoneSet(true);
            loadBookings(savedPhone);
        } else {
            setLoading(false);
        }
    }, []);

    const loadBookings = async (targetPhone: string) => {
        setLoading(true);
        
        // Буфер в 2 часа: чтобы запись не исчезала ровно в минуту начала визита
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Ищем только АКТИВНЫЕ записи клиента
        const { data } = await supabase.from("appointments")
            .select("id, start_time, client_name, service:services(name, price), master:profiles(business_name)")
            .eq("client_phone", targetPhone)
            .eq("status", "active") // <--- ИСПРАВЛЕНИЕ: Скрываем завершенные мастером
            .gte("start_time", twoHoursAgo) // <--- ИСПРАВЛЕНИЕ: Даем буфер времени, чтобы запись ушла сама
            .order("start_time", { ascending: true });
            
        setAppointments(data || []);
        setLoading(false);
    };

    const handleSetPhone = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 5) return;
        
        localStorage.setItem('eb_phone', phone);
        setIsPhoneSet(true);
        loadBookings(phone);
    };

    const handleCancel = async (app: any) => {
        if (!confirm("Вы уверены, что хотите отменить эту запись?")) return;
        setCancellingId(app.id);

        try {
            // Удаляем запись напрямую из БД
            const { error } = await supabase.from('appointments').delete().eq('id', app.id);
            if (error) throw error;

            setAppointments(prev => prev.filter(a => a.id !== app.id));
        } catch (error: any) {
            alert("Ошибка при отмене: " + error.message);
        } finally {
            setCancellingId(null);
        }
    };

    const handleLogout = () => {
        if (confirm("Выйти из профиля?")) {
            localStorage.removeItem('eb_phone');
            localStorage.removeItem('eb_name');
            window.location.reload();
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" />
        </div>
    );

    // Экран входа по номеру телефона (если телефон не сохранен в браузере)
    if (!isPhoneSet) {
        return (
            <div className="min-h-screen bg-[#000000] p-6 flex flex-col items-center justify-center text-white antialiased">
                <div className="w-16 h-16 bg-[#1C1C1E] rounded-2xl mb-8 border border-white/10 flex items-center justify-center shadow-lg">
                    <span className="font-bold text-[#0A84FF] text-xl">EB</span>
                </div>
                
                <form onSubmit={handleSetPhone} className="bg-[#1C1C1E] p-8 rounded-[32px] w-full max-w-sm border border-white/5 shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Мои записи</h2>
                    <p className="text-sm text-white/50 mb-8 font-medium">Введите номер телефона, который вы указывали при бронировании</p>
                    
                    <div className="relative mb-6">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input 
                            required 
                            type="tel" 
                            placeholder="+7 (999) 000-00-00" 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            className="w-full bg-[#000000]/40 border border-white/5 pl-14 pr-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all text-base font-medium" 
                        />
                    </div>
                    
                    <button type="submit" className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-semibold active:scale-[0.97] transition-all shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] text-base">
                        Найти визиты
                    </button>
                </form>
            </div>
        );
    }

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
                        <p className="text-[10px] text-[#32D74B] font-bold tracking-wider mt-0.5 uppercase bg-[#32D74B]/10 inline-block px-2 py-0.5 rounded">Номер: {phone}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2.5 bg-[#FF453A]/10 text-[#FF453A] rounded-full border border-[#FF453A]/20 active:scale-95 shrink-0 transition-all">
                        <LogOut className="w-5 h-5" />
                    </button>
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
                            {/* Декоративный блик */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A84FF]/5 blur-3xl rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <div className="text-[#0A84FF] font-semibold text-3xl tracking-tight leading-none mb-1.5">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
                                        {format(new Date(app.start_time), "d MMMM", { locale: ru })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-semibold text-xs truncate max-w-[140px] bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                                        {app.master?.business_name || "Специалист"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm font-medium text-white/70 bg-black/30 p-4 rounded-2xl border border-white/5 mb-4 relative z-10">
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <div className="w-8 h-8 bg-[#0A84FF]/10 rounded-lg flex items-center justify-center shrink-0">
                                        <Briefcase className="w-4 h-4 text-[#0A84FF]" />
                                    </div>
                                    <span className="truncate font-semibold text-white">{app.service?.name}</span>
                                </div>
                                <span className="font-semibold text-[#32D74B] shrink-0">{app.service?.price} ₽</span>
                            </div>

                            <button onClick={() => handleCancel(app)} disabled={cancellingId === app.id} className="w-full bg-transparent text-[#FF453A] font-semibold py-4 rounded-2xl border border-[#FF453A]/20 hover:bg-[#FF453A]/10 active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 relative z-10">
                                {cancellingId === app.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Отменить визит <Trash2 className="w-4 h-4" /></>}
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}