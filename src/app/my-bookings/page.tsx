"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { Loader2, Briefcase, CalendarX2, Phone } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function MyBookings() {
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState("");
    const [isPhoneSet, setIsPhoneSet] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);

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
        try {
            const records = await pb.collection('appointments').getFullList({
                filter: `client_phone = "${targetPhone}" && start_time >= @now`,
                sort: 'start_time',
                expand: 'service,master'
            });
            setAppointments(records);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSetPhone = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('eb_phone', phone);
        setIsPhoneSet(true);
        loadBookings(phone);
    };

    const handleCancel = async (id: string) => {
        if(confirm("Точно отменить запись?")) {
            await pb.collection('appointments').delete(id);
            setAppointments(prev => prev.filter(a => a.id !== id));
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#0A84FF]" /></div>;

    // Экран входа по номеру (если человек зашел с чистого браузера)
    if (!isPhoneSet) {
        return (
            <div className="min-h-screen bg-black p-6 flex items-center justify-center text-white">
                <form onSubmit={handleSetPhone} className="bg-[#1C1C1E] p-8 rounded-[32px] w-full max-w-sm border border-white/5">
                    <h2 className="text-xl font-bold mb-2">Найти мои записи</h2>
                    <p className="text-sm text-white/40 mb-6">Введите телефон, который вы указывали при бронировании</p>
                    <div className="relative mb-4">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input required type="tel" placeholder="+7 999 000 00 00" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-4 rounded-2xl outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-bold">Искать записи</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-5 antialiased">
            <header className="mb-10 pt-4 flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold">Ваши визиты</h1>
                    <p className="text-[10px] text-[#32D74B] uppercase tracking-widest font-bold mt-1">Привязано к {phone}</p>
                </div>
                <button onClick={() => { localStorage.removeItem('eb_phone'); window.location.reload(); }} className="text-xs text-white/40 underline">Выйти</button>
            </header>

            <div className="space-y-4">
                {appointments.length === 0 ? (
                    <div className="bg-[#1C1C1E] rounded-[32px] p-10 text-center border border-white/5">
                        <CalendarX2 className="mx-auto mb-4 w-10 h-10 opacity-20" />
                        <p className="text-white/40 font-medium">Активных записей нет</p>
                    </div>
                ) : appointments.map(app => (
                    <div key={app.id} className="bg-[#1C1C1E] rounded-[28px] p-6 border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-3xl font-bold mb-1">{format(new Date(app.start_time), "HH:mm")}</div>
                                <div className="text-white/40 text-xs font-bold uppercase">{format(new Date(app.start_time), "d MMMM", { locale: ru })}</div>
                            </div>
                            <div className="bg-white/5 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-white/5">{app.expand?.master?.business_name || "Специалист"}</div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5 mb-6">
                            <Briefcase className="w-4 h-4 text-[#0A84FF]" />
                            <div className="flex-1 text-sm font-semibold truncate">{app.expand?.service?.name}</div>
                        </div>
                        <button onClick={() => handleCancel(app.id)} className="w-full py-4 text-[#FF453A] font-bold text-sm bg-[#FF453A]/10 rounded-2xl active:scale-95 transition-all">Отменить запись</button>
                    </div>
                ))}
            </div>
        </div>
    );
}