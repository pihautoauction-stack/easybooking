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
    username: string; // Изменил с telegram_username на username
    work_start_hour: number;
    work_end_hour: number;
    disabled_days: string;
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

    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");

    // 1. Загрузка профиля по username
    useEffect(() => {
        const fetchData = async () => {
            if (!username) return;

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, business_name, username, work_start_hour, work_end_hour, disabled_days")
                    .eq("username", username) // Фильтруем по нашему полю ника
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
                setError("Ошибка загрузки");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [username]);

    // 2. Расчет свободных слотов
    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedDate || !profile || !selectedService) return;

            setSlotsLoading(true);
            setSelectedTime(null);

            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: appointments } = await supabase
                .from("appointments")
                .select("start_time, end_time")
                .eq("master_id", profile.id)
                .gte("start_time", startOfDay.toISOString())
                .lte("end_time", endOfDay.toISOString());

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

    const generateSmartSlots = (date: Date, serviceDuration: number, busySlots: BusySlot[]) => {
        if (!profile) return [];
        const slots: string[] = [];
        const now = new Date();
        const startHour = profile.work_start_hour ?? 9;
        const endHour = profile.work_end_hour ?? 21;

        let currentTime = setMinutes(setHours(date, startHour), 0);
        const endTime = setMinutes(setHours(date, endHour), 0);

        while (isBefore(currentTime, endTime)) {
            const potentialEnd = addMinutes(currentTime, serviceDuration);
            if (isBefore(endTime, potentialEnd)) break;
            if (isBefore(currentTime, now)) { currentTime = addMinutes(currentTime, 30); continue; }

            const isOverlapping = busySlots.some(busy => 
                (currentTime >= busy.start && currentTime < busy.end) ||
                (potentialEnd > busy.start && potentialEnd <= busy.end) ||
                (currentTime <= busy.start && potentialEnd >= busy.end)
            );

            if (!isOverlapping) slots.push(format(currentTime, "HH:mm"));
            currentTime = addMinutes(currentTime, 30);
        }
        return slots;
    };

    // 3. ОТПРАВКА ЗАПИСИ ЧЕРЕЗ API
    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !selectedDate || !selectedTime || !profile) return;

        setBookingStatus("submitting");

        const [hours, minutes] = selectedTime.split(":").map(Number);
        const startDate = setMinutes(setHours(selectedDate, hours), minutes);

        try {
            const response = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterId: profile.id,       // ТЕПЕРЬ ПЕРЕДАЕМ ПРАВИЛЬНО
                    serviceId: selectedService.id,
                    clientName: clientName,
                    clientPhone: clientPhone,
                    startTime: startDate.toISOString(),
                }),
            });

            if (response.status === 409) {
                setBookingStatus("conflict");
                return;
            }

            if (response.ok) {
                setBookingStatus("success");
            } else {
                setBookingStatus("error");
            }
        } catch (err) {
            console.error(err);
            setBookingStatus("error");
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
    if (error || !profile) return <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center"><h1 className="text-2xl font-bold mb-2">Упс! 😕</h1><p className="text-slate-400">{error || "Страница не найдена"}</p></div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-emerald-500/20 p-6 rounded-full mb-6">
                    <CheckCircle className="w-16 h-16 text-emerald-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Запись подтверждена!</h1>
                <p className="text-slate-400 max-w-xs mb-8">Ждем вас {selectedDate && format(selectedDate, "d MMMM", { locale: ru })} в {selectedTime}.</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-medium transition-colors">Вернуться назад</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 font-sans">
            <main className="max-w-md mx-auto pt-4 pb-12">
                <div className="flex items-center gap-4 mb-8">
                    {selectedService && (
                        <button onClick={() => setSelectedService(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold">{profile.business_name || `@${profile.username}`}</h1>
                        <p className="text-sm text-slate-400">{selectedService ? "Запись на услугу" : "Выберите услугу"}</p>
                    </div>
                </div>

                {!selectedService ? (
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
                ) : (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div><h3 className="font-medium text-blue-400">{selectedService.name}</h3></div>
                            <button onClick={() => setSelectedService(null)} className="text-xs text-slate-500 uppercase font-bold">Изменить</button>
                        </div>

                        <div className="flex justify-center bg-slate-800 rounded-2xl p-4 border border-slate-700">
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]}
                            />
                        </div>

                        {selectedDate && (
                            <div className="space-y-4">
                                <h3 className="font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Доступное время</h3>
                                {slotsLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
                                ) : availableTimeSlots.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableTimeSlots.map((time) => (
                                            <button key={time} onClick={() => setSelectedTime(time)} className={`py-2 rounded-lg text-xs font-bold transition-all ${selectedTime === time ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>{time}</button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-red-400 text-sm text-center">Нет свободных окон</p>
                                )}
                            </div>
                        )}

                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-4 pt-4 border-t border-slate-800">
                                <input required type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 outline-none focus:border-blue-500" placeholder="Ваше имя" />
                                <input required type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 outline-none focus:border-blue-500" placeholder="Телефон" />
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                                    {bookingStatus === "submitting" ? <Loader2 className="animate-spin" /> : "Подтвердить запись"}
                                </button>
                                {bookingStatus === "conflict" && <p className="text-orange-400 text-sm text-center mt-2">Это время только что заняли. Выберите другое.</p>}
                                {bookingStatus === "error" && <p className="text-red-400 text-sm text-center mt-2">Ошибка при записи. Попробуйте снова.</p>}
                            </form>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}