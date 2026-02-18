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
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        const { data } = await supabase.from("appointments")
            .select("id, start_time, client_name, service:services(name, price), master:profiles(business_name)")
            .eq("client_phone", targetPhone)
            .eq("status", "active")
            .gte("start_time", twoHoursAgo)
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
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </div>
    );

    if (!isPhoneSet) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] p-6 flex flex-col items-center justify-center text-stone-900 antialiased selection:bg-rose-100">
                <div className="w-16 h-16 bg-white rounded-2xl mb-8 border border-stone-100 flex items-center justify-center shadow-sm">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-orange-400 text-2xl tracking-tight">EB</span>
                </div>
                
                <form onSubmit={handleSetPhone} className="bg-white p-8 rounded-[32px] w-full max-w-sm border border-stone-100 shadow-sm">
                    <h2 className="text-2xl font-black mb-2 tracking-tight text-center">Мои записи</h2>
                    <p className="text-sm text-stone-500 mb-8 font-bold text-center leading-relaxed">Введите номер телефона, который вы указывали при бронировании</p>
                    
                    <div className="relative mb-6">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input 
                            required type="tel" placeholder="+7 (999) 000-00-00" value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            className="w-full bg-stone-50 border border-stone-200 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-sm font-bold text-stone-900 placeholder-stone-400 shadow-sm" 
                        />
                    </div>
                    
                    <button type="submit" className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white py-4 rounded-2xl font-black active:scale-[0.97] transition-all shadow-lg shadow-rose-500/20 flex justify-center hover:opacity-90">
                        Найти визиты
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-stone-900 p-4 sm:p-5 font-sans pb-24 selection:bg-rose-100 antialiased">
            <div className="max-w-md mx-auto w-full space-y-6">
                
                <div className="flex items-center gap-3 pt-2">
                    <button onClick={() => router.back()} className="p-3 bg-white rounded-full border border-stone-200 shadow-sm active:scale-95 shrink-0 transition-all text-stone-600 hover:text-stone-900">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-black tracking-tight truncate">Ваши записи</h1>
                        <p className="text-[10px] text-rose-500 font-black tracking-widest mt-0.5 uppercase bg-rose-50 inline-block px-2 py-0.5 rounded-md border border-rose-100">
                            Номер: {phone}
                        </p>
                    </div>
                    <button onClick={handleLogout} className="p-3 bg-white text-stone-400 rounded-full border border-stone-200 shadow-sm active:scale-95 shrink-0 transition-all hover:text-rose-500">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {appointments.length === 0 ? (
                        <div className="text-center py-12 bg-white border border-stone-100 rounded-[32px] shadow-sm">
                            <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarX2 className="w-7 h-7 text-stone-300" />
                            </div>
                            <p className="text-stone-400 font-bold text-sm">У вас нет активных записей</p>
                        </div>
                    ) : appointments.map(app => (
                        <div key={app.id} className="bg-white rounded-[32px] p-6 border border-stone-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 blur-2xl rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-5 relative z-10">
                                <div>
                                    <div className="text-rose-500 font-black text-3xl tracking-tight leading-none mb-2">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-stone-500 text-[11px] font-black uppercase tracking-widest">
                                        {format(new Date(app.start_time), "d MMMM", { locale: ru })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-stone-600 font-bold text-[11px] truncate max-w-[140px] bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                                        {app.master?.business_name || "Специалист"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm font-bold text-stone-900 bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-5 relative z-10">
                                <div className="flex items-center gap-3 truncate pr-2">
                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-stone-100">
                                        <Briefcase className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <span className="truncate">{app.service?.name}</span>
                                </div>
                                <span className="text-emerald-500 font-black shrink-0 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">{app.service?.price} ₽</span>
                            </div>

                            <button onClick={() => handleCancel(app)} disabled={cancellingId === app.id} className="w-full bg-white text-rose-500 font-black py-4 rounded-2xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 relative z-10 shadow-sm">
                                {cancellingId === app.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Отменить визит <Trash2 className="w-4 h-4" /></>}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}