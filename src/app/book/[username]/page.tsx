"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, User, Phone, AlertCircle } from "lucide-react";
import { format, setHours, setMinutes, startOfToday, addMinutes, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface Profile {
    id: string;
    business_name: string;
    telegram_username: string;
    work_start_hour: number;
    work_end_hour: number;
    disabled_days: string; // "0,6"
}

interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
}

interface BusySlot {
    start: Date;
    end: Date;
}

export default function BookingPage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Booking State
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    // 1. Загрузка профиля и услуг
    useEffect(() => {
        const fetchData = async () => {
            if (!username) return;

            try {
                // Загружаем профиль + настройки графика
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, business_name, telegram_username, work_start_hour, work_end_hour, disabled_days")
                    .eq("telegram_username", username)
                    .single();

                if (profileError || !profileData) {
                    setError("Мастер не найден");
                    setLoading(false);
                    return;
                }

                setProfile(profileData);

                const { data: servicesData } = await supabase
                    .from("services")
                    .select("*")
                    .eq("user_id", profileData.id)
                    .order("created_at", { ascending: true });

                setServices(servicesData || []);
            } catch (err) {
                console.error(err);
                setError("Произошла ошибка при загрузке данных");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [username]);

    // 2. Логика расчета свободного времени
    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedDate || !profile || !selectedService) return;

            setSlotsLoading(true);
            setSelectedTime(null);

            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: appointments, error } = await supabase
                .from("appointments")
                .select("start_time, end_time")
                .eq("master_id", profile.id)
                .gte("start_time", startOfDay.toISOString())
                .lte("end_time", endOfDay.toISOString());

            if (error) {
                console.error("Ошибка получения расписания", error);
                setSlotsLoading(false);
                return;
            }

            const busySlots: BusySlot[] = (appointments || []).map(app => ({
                start: new Date(app.start_time),
                end: new Date(app.end_time)
            }));

            const slots = generateSmartSlots(selectedDate, selectedService.duration, busySlots);
            setAvailableTimeSlots(slots);
            setSlotsLoading(false);
        };

        fetchAvailability();
    }, [selectedDate, selectedService, profile]);

    // Умная функция генерации слотов (с учетом настроек профиля)
    const generateSmartSlots = (date: Date, serviceDuration: number, busySlots: BusySlot[]) => {
        if (!profile) return [];

        const slots: string[] = [];
        const now = new Date();

        // Берем настройки из профиля (или дефолтные 9-21)
        const startHour = profile.work_start_hour ?? 9;
        const endHour = profile.work_end_hour ?? 21;

        let currentTime = setMinutes(setHours(date, startHour), 0);
        const endTime = setMinutes(setHours(date, endHour), 0);

        while (isBefore(currentTime, endTime)) {
            const potentialEnd = addMinutes(currentTime, serviceDuration);

            if (isBefore(endTime, potentialEnd)) {
                break; 
            }

            if (isBefore(currentTime, now)) {
                currentTime = addMinutes(currentTime, 30);
                continue;
            }

            let isOverlapping = false;
            for (const busy of busySlots) {
                if (
                    (currentTime >= busy.start && currentTime < busy.end) ||
                    (potentialEnd > busy.start && potentialEnd <= busy.end) ||
                    (currentTime <= busy.start && potentialEnd >= busy.end)
                ) {
                    isOverlapping = true;
                    break;
                }
            }

            if (!isOverlapping) {
                slots.push(format(currentTime, "HH:mm"));
            }

            currentTime = addMinutes(currentTime, 30);
        }

        return slots;
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !selectedDate || !selectedTime || !profile) return;

        setBookingStatus("submitting");

        const [hours, minutes] = selectedTime.split(":").map(Number);
        const startDate = setMinutes(setHours(selectedDate, hours), minutes);
        const endDate = addMinutes(startDate, selectedService.duration);

        const { error } = await supabase.from("appointments").insert({
            master_id: profile.id,
            service_id: selectedService.id,
            client_name: clientName,
            client_phone: clientPhone,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            status: "pending",
        });

        if (error) {
            console.error("Booking error:", error);
            setBookingStatus("error");
        } else {
            try {
                await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: clientName,
                        phone: clientPhone,
                        service: selectedService.name,
                        date: format(startDate, 'dd.MM.yyyy', { locale: ru }),
                        time: selectedTime
                    }),
                });
            } catch (notifyError) {
                console.error(notifyError);
            }
            setBookingStatus("success");
        }
    };

    const resetBooking = () => {
        setSelectedService(null);
        setSelectedDate(undefined);
        setSelectedTime(null);
        setBookingStatus("idle");
        setClientName("");
        setClientPhone("");
    };

    // Определяем выходные дни для календаря
    const getDisabledDays = () => {
        if (!profile || !profile.disabled_days) return [];
        return profile.disabled_days.split(',').map(Number);
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
    if (error || !profile) return <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center"><h1 className="text-2xl font-bold mb-2">Упс! 😕</h1><p className="text-slate-400">{error || "Страница не найдена"}</p></div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="bg-emerald-500/20 p-6 rounded-full mb-6">
                    <CheckCircle className="w-16 h-16 text-emerald-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Запись подтверждена!</h1>
                <p className="text-slate-400 max-w-xs mb-8">Ждем вас {selectedDate && format(selectedDate, "d MMMM", { locale: ru })} в {selectedTime}.</p>
                <button onClick={resetBooking} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-medium transition-colors">Вернуться назад</button>
            </div>
        );
    }

    const css = `
    .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #2563eb; --rdp-background-color: #1e293b; margin: 0; }
    .rdp-day_selected:not([disabled]) { background-color: var(--rdp-accent-color); font-weight: bold; }
    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #334155; }
    .rdp-day_today { color: #3b82f6; font-weight: bold; }
    .rdp-day_disabled { opacity: 0.2; cursor: not-allowed; color: #ef4444; }
  `;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4">
            <style>{css}</style>
            <main className="max-w-md mx-auto pt-4 pb-12">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    {selectedService && (
                        <button onClick={() => setSelectedService(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold">{profile.business_name || `@${profile.telegram_username}`}</h1>
                        <p className="text-sm text-slate-400">{selectedService ? "Запись на услугу" : "Выберите услугу"}</p>
                    </div>
                </div>

                {/* Step 1: Services */}
                {!selectedService && (
                    <div className="space-y-4">
                        {services.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-[0.98]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-lg">{service.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-2">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration} мин</span>
                                            <span className="text-emerald-400 font-medium bg-emerald-900/20 px-2 py-0.5 rounded-full">{service.price} ₽</span>
                                        </div>
                                    </div>
                                    <div className="bg-blue-600/20 p-2 rounded-full"><CalendarIcon className="w-5 h-5 text-blue-400" /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {selectedService && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-medium">{selectedService.name}</h3>
                                <p className="text-sm text-slate-400">{selectedService.duration} мин • {selectedService.price} ₽</p>
                            </div>
                            <button onClick={() => setSelectedService(null)} className="text-xs text-blue-400 hover:text-blue-300">Изменить</button>
                        </div>

                        {/* Calendar */}
                        <div className="flex justify-center bg-slate-800 rounded-2xl p-4 border border-slate-700">
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                // Блокируем прошедшие дни И ВЫХОДНЫЕ
                                disabled={[
                                    { before: startOfToday() },
                                    { dayOfWeek: getDisabledDays() }
                                ]}
                                styles={{
                                    head_cell: { color: "#94a3b8" },
                                    cell: { color: "#e2e8f0" },
                                    nav_button: { color: "#e2e8f0" },
                                    caption: { color: "#e2e8f0" }
                                }}
                            />
                        </div>

                        {/* Time Slots */}
                        {selectedDate && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="font-medium mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-400" />
                                    Доступное время
                                </h3>
                                
                                {slotsLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                                ) : availableTimeSlots.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-3">
                                        {availableTimeSlots.map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 px-1 rounded-lg text-sm font-medium border transition-all ${selectedTime === time
                                                    ? "bg-emerald-600 border-emerald-500 text-white"
                                                    : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-center text-sm flex flex-col items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        Нет свободного времени на этот день
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Form */}
                        {selectedDate && selectedTime && (
                            <form onSubmit={handleBooking} className="animate-in fade-in slide-in-from-top-4 duration-300 pt-4 border-t border-slate-800">
                                <h3 className="font-medium mb-4">Ваши данные</h3>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input required type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ваше имя" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input required type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+7 (999) 000-00-00" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}
                                </button>
                                {bookingStatus === "error" && <p className="text-red-400 text-sm text-center mt-3">Ошибка при создании записи.</p>}
                            </form>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}