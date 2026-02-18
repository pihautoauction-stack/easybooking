"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Briefcase, CalendarX2, Phone, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function MyBookings() {
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState("");
    const [isPhoneSet, setIsPhoneSet] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        // Проверяем, есть ли номер телефона в памяти браузера
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
        
        // Загружаем только будущие записи клиента (от текущего времени и дальше)
        const { data, error } = await supabase
            .from('appointments')
            .select('*, service:services(name, price), master:profiles(business_name)')
            .eq('client_phone', targetPhone)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

        if (!error) {
            setAppointments(data || []);
        }
        setLoading(false);
    };

    const handleSetPhone = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 6) return; // Базовая защита от пустых вводов
        
        localStorage.setItem('eb_phone', phone);
        setIsPhoneSet(true);
        loadBookings(phone);
    };

    const handleCancel = async (id: string) => {
        if(confirm("Вы уверены, что хотите отменить эту запись?")) {
            await supabase.from('appointments').delete().eq('id', id);
            // Убираем удаленную запись из списка на экране
            setAppointments(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleLogout = () => {
        if(confirm("Выйти из профиля?")) {
            localStorage.removeItem('eb_phone');
            localStorage.removeItem('eb_name');
            window.location.reload();
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" /></div>;

    // Экран "Входа" для клиента (если номер не найден в памяти телефона)
    if (!isPhoneSet) {
        return (
            <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center text-white antialiased">
                <div className="w-16 h-16 bg-[#1C1C1E] rounded-2xl mb-8 border border-white/10 flex items-center justify-center shadow-lg">
                    <span className="font-bold text-[#0A84FF] text-xl">EB</span>
                </div>
                
                <form onSubmit={handleSetPhone} className="bg-[#1C1C1E] p-8 rounded-[32px] w-full max-w-sm border border-white/5 shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2">Мои записи</h2>
                    <p className="text-sm text-white/40 mb-8">Введите номер телефона, который вы указывали при бронировании</p>
                    
                    <div className="relative mb-6">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input 
                            required 
                            type="tel" 
                            placeholder="+7 (999) 000-00-00" 
                            value={phone} 
                            onChange={e=>setPhone(e.target.value)} 
                            className="w-full bg-black/40 border border-white/5 pl-14 pr-5 py-5 rounded-[24px] outline-none focus:border-[#0A84FF]/50 transition-colors text-base" 
                        />
                    </div>
                    
                    <button type="submit" className="w-full bg-[#0A84FF] text-white py-5 rounded-[24px] font-bold active:scale-95 transition-all shadow-[0_4px_20px_0_rgba(10,132,255,0.3)]">
                        Найти визиты
                    </button>
                </form>
            </div>
        );
    }

    // Экран со списком записей клиента
    return (
        <div className="min-h-screen bg-black text-white p-5 pb-10 antialiased">
            <header className="mb-10 pt-4 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">Ваши визиты</h1>
                    <p className="text-[10px] text-[#32D74B] uppercase tracking-widest font-bold mt-2 bg-[#32D74B]/10 inline-block px-2 py-1 rounded-md">Привязано к {phone}</p>
                </div>
                <button onClick={handleLogout} className="p-3 bg-white/5 rounded-full text-white/40 hover:text-white active:scale-90 transition-all">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <div className="space-y-5">
                {appointments.length === 0 ? (
                    <div className="bg-[#1C1C1E] rounded-[32px] p-12 text-center border border-white/5 shadow-xl">
                        <CalendarX2 className="mx-auto mb-4 w-12 h-12 text-white/10" />
                        <p className="text-white/50 font-medium">У вас пока нет предстоящих записей</p>
                    </div>
                ) : appointments.map(app => (
                    <div key={app.id} className="bg-[#1C1C1E] rounded-[32px] p-6 border border-white/10 shadow-xl relative overflow-hidden">
                        {/* Декоративный блик */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A84FF]/5 blur-3xl rounded-full pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <div className="text-4xl font-bold mb-1 tracking-tight text-[#0A84FF]">{format(new Date(app.start_time), "HH:mm")}</div>
                                <div className="text-white/50 text-xs font-bold uppercase tracking-widest">{format(new Date(app.start_time), "d MMMM, EEEE", { locale: ru })}</div>
                            </div>
                            <div className="bg-white/5 px-3 py-2 rounded-xl text-xs font-bold border border-white/5 text-right max-w-[140px] truncate">
                                {app.master?.business_name || "Специалист"}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 p-4 bg-black/30 rounded-2xl border border-white/5 mb-6 relative z-10">
                            <div className="w-10 h-10 bg-[#0A84FF]/10 rounded-xl flex items-center justify-center shrink-0">
                                <Briefcase className="w-5 h-5 text-[#0A84FF]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-bold truncate">{app.service?.name}</div>
                                <div className="text-sm text-[#32D74B] font-medium mt-0.5">{app.service?.price} ₽</div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleCancel(app.id)} 
                            className="w-full py-4 text-[#FF453A] font-bold text-sm bg-[#FF453A]/10 rounded-2xl active:scale-95 transition-all border border-[#FF453A]/20 relative z-10"
                        >
                            Отменить визит
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}