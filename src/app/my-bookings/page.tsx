"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Phone, CalendarDays, Clock, ChevronLeft, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function MyBookings() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        // Подтягиваем телефон из localStorage, если клиент только что записался
        const savedPhone = localStorage.getItem('nx_phone');
        if (savedPhone) {
            setPhone(savedPhone);
            handleSearch(null, savedPhone);
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent | null, phoneOverride?: string) => {
        if (e) e.preventDefault();
        const searchPhone = phoneOverride || phone;
        if (!searchPhone) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                id, start_time, status,
                service:services(name, duration, price),
                master:profiles(business_name, username)
            `)
            .eq("client_phone", searchPhone)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true });

        if (!error && data) {
            setBookings(data);
        }
        setSearched(true);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-stone-800 p-4 sm:p-6 font-sans selection:bg-rose-100 antialiased">
            <div className="max-w-md mx-auto w-full space-y-6">

                {/* NEXIO HEADER */}
                <div className="flex items-center gap-3 mb-8 justify-center pt-6">
                    <img src="/logo.svg" alt="Nexio Logo" className="w-12 h-12 drop-shadow-md" />
                    <div className="flex flex-col text-left">
                        <h1 className="text-xl font-black tracking-tight text-stone-900 leading-tight">Nexio</h1>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Мои записи</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl pointer-events-none"></div>

                    <button onClick={() => router.back()} className="text-sm font-bold text-stone-400 hover:text-stone-800 flex items-center gap-1 mb-6 transition-colors relative z-10">
                        <ChevronLeft className="w-4 h-4" /> Назад
                    </button>

                    <h2 className="text-lg font-black tracking-tight text-stone-900 mb-4 relative z-10">Найти свои визиты</h2>

                    <form onSubmit={handleSearch} className="space-y-4 relative z-10">
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input
                                required
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400"
                                placeholder="+7 (999) 000-00-00"
                            />
                        </div>
                        <button type="submit" disabled={loading || !phone} className="w-full bg-stone-900 text-white font-black py-4 rounded-2xl active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center shadow-md">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Найти"}
                        </button>
                    </form>
                </div>

                {searched && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        {bookings.length === 0 ? (
                            <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm text-center">
                                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-100">
                                    <CalendarDays className="w-6 h-6 text-stone-400" />
                                </div>
                                <p className="text-stone-500 font-bold text-sm">Активных записей не найдено</p>
                            </div>
                        ) : (
                            bookings.map(booking => (
                                <div key={booking.id} className="bg-white p-5 rounded-[28px] border border-stone-100 shadow-sm hover:border-rose-200 transition-colors">
                                    <div className="flex justify-between items-start mb-4 border-b border-stone-50 pb-4">
                                        <div>
                                            <p className="font-black text-xl text-stone-900">{format(new Date(booking.start_time), "d MMMM", { locale: ru })}</p>
                                            <p className="text-rose-500 font-bold flex items-center gap-1.5 mt-1 text-sm"><Clock className="w-4 h-4" /> {format(new Date(booking.start_time), "HH:mm")}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${booking.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-stone-100 text-stone-500'}`}>
                                            {booking.status === 'active' ? 'Ожидается' : booking.status}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-stone-800 leading-tight mb-1">{booking.service?.name || "Услуга"}</h3>
                                        <div className="flex items-center gap-4 text-xs font-bold text-stone-500 mt-2">
                                            <span>{booking.service?.price} ₽</span>
                                            <span>•</span>
                                            <span>~{booking.service?.duration} мин</span>
                                        </div>
                                    </div>

                                    {booking.master?.business_name && (
                                        <div className="mt-4 pt-4 border-t border-stone-50 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-stone-400" />
                                            <span className="text-xs font-bold text-stone-600">{booking.master.business_name}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}