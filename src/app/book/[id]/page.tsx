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
            
            const { data: busy } = await supabase.from("appointments").select("start_time").eq("master_id", profile.id).gte("start_time", startDay.toISOString()).lte("start_time", endDay.toISOString());
            const busyTimes = busy?.map(b => format(new Date(b.start_time), "HH:mm")) || [];

            let current = setMinutes(setHours(selectedDate, profile.work_start_hour || 9), 0);
            const end = setMinutes(setHours(selectedDate, profile.work_end_hour || 21), 0);

            while (isBefore(current, end)) {
                const timeStr = format(current, "HH:mm");
                if (isBefore(now, current) && !busyTimes.includes(timeStr)) slots.push(timeStr);
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

        // Достаем Telegram ID клиента
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const clientTgId = tgUser?.id?.toString() || null;

        const res = await fetch('/api/notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterId: profile.id, serviceId: selectedService.id, clientName, clientPhone, startTime, clientTgId }),
        });

        if (res.status === 409) setBookingStatus("conflict");
        else if (res.ok) setBookingStatus("success");
        else setBookingStatus("error");
    };

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><div className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)]"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" /></div></div>;
    if (!profile) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 text-sm font-sans">Мастер не найден.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white p-4 sm:p-6 text-center font-sans">
                <div className="bg-emerald-500/10 p-6 sm:p-8 rounded-full mb-6 sm:mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-xl">
                    <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 drop-shadow-md" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 drop-shadow-md">Вы записаны!</h1>
                <p className="text-white/50 mb-8 sm:mb-10 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
                    Ждем вас <br/><span className="text-white font-medium">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                </p>
                <div className="space-y-3 w-full max-w-xs mx-auto">
                    {/* Кнопка перехода в ЛК клиента */}
                    <button onClick={() => window.location.href = "https://t.me/my_cool_booking_bot/app?startapp=my_bookings"} className="w-full bg-blue-600/90 border border-blue-400/20 text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 text-sm sm:text-base transition-all">Мои записи</button>
                    <button onClick={() => window.location.reload()} className="w-full bg-white/5 text-white/70 font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 hover:bg-white/10 active:scale-95 text-sm sm:text-base transition-all">Новая запись</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white p-4 sm:p-5 font-sans pb-24 selection:bg-blue-500/30">
            <div className="max-w-md mx-auto w-full">
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pt-2 sm:pt-4">
                    {selectedService && (
                        <button onClick={() => setSelectedService(null)} className="p-2 sm:p-3 bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 active:scale-95 shrink-0 hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-blue-400/90 drop-shadow-md truncate">{profile.business_name}</h1>
                        <p className="text-[10px] sm:text-xs text-white/40 font-medium tracking-wider mt-0.5 sm:mt-1">ОНЛАЙН-ЗАПИСЬ</p>
                    </div>
                </div>

                {!selectedService ? (
                    <div className="space-y-3 sm:space-y-4">
                        <p className="text-xs sm:text-sm text-white/50 mb-4 sm:mb-6 ml-1 sm:ml-2 font-medium">Выберите услугу</p>
                        {services.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-white/[0.03] backdrop-blur-xl rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10 active:scale-[0.98] shadow-lg relative overflow-hidden cursor-pointer hover:border-blue-500/30 transition-all group">
                                <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/5 rounded-full blur-2xl -z-10 group-hover:bg-blue-500/10 transition-colors"></div>
                                <div className="flex justify-between items-center gap-2">
                                    <h3 className="font-bold text-base sm:text-lg text-white/90 line-clamp-2">{service.name}</h3>
                                    <span className="text-blue-300 font-bold bg-blue-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-blue-500/20 text-xs sm:text-base shrink-0">{service.price} ₽</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        <div className="bg-white/[0.03] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10 text-center shadow-lg backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-24 h-24 sm:w-32 sm:h-32 bg-pink-500/10 rounded-full blur-3xl -z-10"></div>
                            <h3 className="font-bold text-lg sm:text-xl mb-1 text-white/90">{selectedService.name}</h3>
                            <p className="text-pink-400 font-mono text-xs sm:text-sm bg-pink-500/10 inline-block px-2 sm:px-3 py-1 rounded-md sm:rounded-lg border border-pink-500/20">{selectedService.price} ₽</p>
                        </div>

                        <p className="text-xs sm:text-sm text-white/50 ml-1 sm:ml-2 font-medium pt-1 sm:pt-2">Выберите дату и время</p>

                        <div className="flex justify-center bg-black/40 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/5 shadow-inner backdrop-blur-md overflow-x-auto w-full">
                            <style>{`
                                .rdp { --rdp-cell-size: min(12vw, 42px); --rdp-accent-color: #3b82f6; --rdp-background-color: #1e293b; margin: 0 auto; width: 100%; max-width: 100%; display: flex; justify-content: center; }
                                .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #2563eb; color: white; font-weight: bold; border-radius: 10px; }
                                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); border-radius: 10px; }
                                .rdp-day { border-radius: 10px; font-size: min(4vw, 14px); }
                                .rdp-caption_label { font-size: min(4.5vw, 16px); }
                                .rdp-head_cell { font-size: min(3.5vw, 12px); font-weight: normal; text-transform: uppercase; color: rgba(255,255,255,0.4); }
                            `}</style>
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]}
                            />
                        </div>

                        {selectedDate && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 pt-1 sm:pt-2">
                                {availableSlots.length > 0 ? availableSlots.map(t => (
                                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${selectedTime === t ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 active:scale-95"}`}>{t}</button>
                                )) : <p className="col-span-3 sm:col-span-4 text-center text-red-300/80 text-xs sm:text-sm py-4 sm:py-5 bg-red-900/10 border border-red-900/20 rounded-xl sm:rounded-2xl backdrop-blur-md">Нет свободных мест</p>}
                            </div>
                        )}

                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 mt-2 sm:mt-4 border-t border-white/10">
                                <div className="space-y-2.5 sm:space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                                        <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20" placeholder="Ваше имя" />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                                        <input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20 font-mono" placeholder="+7 (999) 000-00-00" />
                                    </div>
                                </div>
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-white text-black font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2 mt-2 sm:mt-4 transition-all">
                                    {bookingStatus === "submitting" ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : "Подтвердить запись"}
                                </button>
                            </form>
                        )}
                        
                        {bookingStatus === "conflict" && <div className="bg-orange-500/10 text-orange-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center text-xs sm:text-sm border border-orange-500/20 animate-pulse mt-3 sm:mt-4 backdrop-blur-md">Упс! Это время только что заняли. Выберите другое.</div>}
                        {bookingStatus === "error" && <div className="bg-red-500/10 text-red-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center text-xs sm:text-sm border border-red-500/20 mt-3 sm:mt-4 backdrop-blur-md">Ошибка сервера. Попробуйте позже.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}