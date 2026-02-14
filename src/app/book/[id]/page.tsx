"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, ChevronLeft, User, Phone } from "lucide-react";
import { format, setHours, setMinutes, startOfToday, addMinutes, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");

    useEffect(() => {
        const fetchData = async () => {
            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
            if (profileData) {
                setProfile(profileData);
                const { data: servicesData } = await supabase.from("services").select("*").eq("user_id", profileData.id);
                setServices(servicesData || []);
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!selectedDate || !profile) return;

        const generateSlots = async () => {
            const slots: string[] = [];
            const now = new Date();
            
            const startDay = new Date(selectedDate); startDay.setHours(0,0,0,0);
            const endDay = new Date(selectedDate); endDay.setHours(23,59,59,999);
            
            const { data: busy } = await supabase.from("appointments")
                .select("start_time")
                .eq("master_id", profile.id)
                .gte("start_time", startDay.toISOString())
                .lte("start_time", endDay.toISOString());
            
            const busyTimes = busy?.map(b => format(new Date(b.start_time), "HH:mm")) || [];

            let current = setMinutes(setHours(selectedDate, profile.work_start_hour || 9), 0);
            const end = setMinutes(setHours(selectedDate, profile.work_end_hour || 21), 0);

            while (isBefore(current, end)) {
                const timeStr = format(current, "HH:mm");
                if (isBefore(now, current) && !busyTimes.includes(timeStr)) {
                    slots.push(timeStr);
                }
                current = addMinutes(current, 30);
            }
            setAvailableSlots(slots);
        };
        generateSlots();
    }, [selectedDate, profile]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTime || !profile) return;
        setBookingStatus("submitting");

        const [h, m] = selectedTime.split(":").map(Number);
        const startTime = setMinutes(setHours(selectedDate!, h), m).toISOString();

        const res = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                masterId: profile.id,
                serviceId: selectedService.id,
                clientName,
                clientPhone,
                startTime
            }),
        });

        if (res.status === 409) setBookingStatus("conflict");
        else if (res.ok) setBookingStatus("success");
        else setBookingStatus("error");
    };

    // Экран загрузки
    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        </div>
    );

    if (!profile) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 font-sans">Мастер не найден.</div>;

    // Экран успеха
    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in-95 duration-300 font-sans">
                <div className="bg-emerald-500/10 p-8 rounded-full mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-xl">
                    <CheckCircle className="w-20 h-20 text-emerald-400 drop-shadow-md" />
                </div>
                <h1 className="text-3xl font-bold mb-3 drop-shadow-md">Вы записаны!</h1>
                <p className="text-white/50 mb-10 leading-relaxed max-w-xs">
                    Ждем вас <br/><span className="text-white font-medium">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                </p>
                <button onClick={() => window.location.reload()} className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all">Новая запись</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white p-5 font-sans pb-24 selection:bg-blue-500/30">
            <div className="max-w-md mx-auto">
                {/* Хедер профиля мастера */}
                <div className="flex items-center gap-4 mb-8 pt-4">
                    {selectedService && (
                        <button onClick={() => setSelectedService(null)} className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-colors active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-widest text-blue-400/90 drop-shadow-md">{profile.business_name}</h1>
                        <p className="text-xs text-white/40 font-medium tracking-wider mt-1">ОНЛАЙН-ЗАПИСЬ</p>
                    </div>
                </div>

                {!selectedService ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <p className="text-sm text-white/50 mb-6 ml-2 font-medium">Выберите услугу</p>
                        {services.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 hover:border-blue-500/30 cursor-pointer transition-all active:scale-[0.98] shadow-lg group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -z-10 group-hover:bg-blue-500/10 transition-colors"></div>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-white/90">{service.name}</h3>
                                    <span className="text-blue-300 font-bold bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 shadow-inner">{service.price} ₽</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Выбранная услуга */}
                        <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/10 text-center shadow-lg backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -z-10"></div>
                            <h3 className="font-bold text-xl mb-1 text-white/90">{selectedService.name}</h3>
                            <p className="text-pink-400 font-mono text-sm bg-pink-500/10 inline-block px-3 py-1 rounded-lg border border-pink-500/20">{selectedService.price} ₽</p>
                        </div>

                        <p className="text-sm text-white/50 ml-2 font-medium pt-2">Выберите дату и время</p>

                        {/* Календарь */}
                        <div className="flex justify-center bg-black/40 rounded-[2rem] p-6 border border-white/5 shadow-inner backdrop-blur-md">
                            <style>{`
                                .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #3b82f6; --rdp-background-color: #1e293b; margin: 0; }
                                .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #2563eb; color: white; font-weight: bold; border-radius: 12px; }
                                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); border-radius: 12px; }
                                .rdp-day { border-radius: 12px; }
                            `}</style>
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]}
                            />
                        </div>

                        {/* Время */}
                        {selectedDate && (
                            <div className="grid grid-cols-4 gap-3 animate-in fade-in duration-300 pt-2">
                                {availableSlots.length > 0 ? availableSlots.map(t => (
                                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${selectedTime === t ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-105 border border-blue-400/30 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 active:scale-95"}`}>{t}</button>
                                )) : <p className="col-span-4 text-center text-red-300/80 text-sm py-5 bg-red-900/10 border border-red-900/20 rounded-2xl backdrop-blur-md">На этот день нет свободных мест</p>}
                            </div>
                        )}

                        {/* Форма */}
                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-4 pt-6 mt-4 border-t border-white/10 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20" placeholder="Ваше имя" />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20 font-mono" placeholder="+7 (999) 000-00-00" />
                                    </div>
                                </div>
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-white text-black font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                                    {bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}
                                </button>
                            </form>
                        )}
                        
                        {bookingStatus === "conflict" && <div className="bg-orange-500/10 text-orange-300 p-4 rounded-2xl text-center text-sm border border-orange-500/20 animate-pulse backdrop-blur-md mt-4">Упс! Это время только что заняли. Выберите другое.</div>}
                        {bookingStatus === "error" && <div className="bg-red-500/10 text-red-300 p-4 rounded-2xl text-center text-sm border border-red-500/20 backdrop-blur-md mt-4">Ошибка сервера. Попробуйте позже.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}