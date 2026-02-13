"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, User, Phone, AlertCircle } from "lucide-react";
import { format, setHours, setMinutes, startOfToday, addMinutes, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// ВАЖНО: Папка должна быть [id], не [username]
export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params); // Получаем ID из URL

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
            // Ищем по ID, так надежнее
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

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
    if (!profile) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Мастер не найден или ссылка устарела.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-emerald-500/20 p-6 rounded-full mb-6 shadow-xl shadow-emerald-900/20">
                    <CheckCircle className="w-20 h-20 text-emerald-400" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Успешно!</h1>
                <p className="text-slate-400 mb-8">Запись создана на {format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}.</p>
                <button onClick={() => window.location.reload()} className="bg-slate-800 hover:bg-slate-700 px-8 py-3 rounded-xl font-bold transition-all">Вернуться</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 font-sans pb-20">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-8 pt-4">
                    {selectedService && (
                        <button onClick={() => setSelectedService(null)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide text-blue-400">{profile.business_name}</h1>
                        <p className="text-xs text-slate-500">Онлайн-запись</p>
                    </div>
                </div>

                {!selectedService ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        {services.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-[0.98] shadow-md">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">{service.name}</h3>
                                    <span className="text-emerald-400 font-bold bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-500/30">{service.price} ₽</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                            <h3 className="font-bold text-lg">{selectedService.name}</h3>
                            <p className="text-emerald-400 font-mono">{selectedService.price} ₽</p>
                        </div>

                        <div className="flex justify-center bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-md">
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]}
                                className="rdp"
                            />
                        </div>

                        {selectedDate && (
                            <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-300">
                                {availableSlots.length > 0 ? availableSlots.map(t => (
                                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-2 rounded-lg text-xs font-bold transition-all ${selectedTime === t ? "bg-blue-600 shadow-lg shadow-blue-500/40 scale-105" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>{t}</button>
                                )) : <p className="col-span-4 text-center text-red-400 text-sm py-4 bg-red-900/10 rounded-xl">На этот день нет свободных мест :(</p>}
                            </div>
                        )}

                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-4 pt-4 border-t border-slate-800 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                        <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 outline-none focus:border-blue-500 transition-colors" placeholder="Ваше имя" />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                        <input required value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 outline-none focus:border-blue-500 transition-colors" placeholder="Телефон" />
                                    </div>
                                </div>
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    {bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}
                                </button>
                            </form>
                        )}
                        {bookingStatus === "conflict" && <div className="bg-orange-900/30 text-orange-300 p-4 rounded-xl text-center text-sm border border-orange-500/30 animate-pulse">Упс! Это время только что заняли. Выберите другое.</div>}
                        {bookingStatus === "error" && <div className="bg-red-900/30 text-red-300 p-4 rounded-xl text-center text-sm border border-red-500/30">Ошибка сервера. Попробуйте позже.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}