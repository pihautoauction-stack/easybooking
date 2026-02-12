"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft } from "lucide-react";
import { format, setHours, setMinutes, startOfToday, addMinutes, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function BookingPage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");

    useEffect(() => {
        const fetchData = async () => {
            const { data: profileData } = await supabase.from("profiles").select("*").eq("username", username).single();
            if (profileData) {
                setProfile(profileData);
                const { data } = await supabase.from("services").select("*").eq("user_id", profileData.id);
                setServices(data || []);
            }
            setLoading(false);
        };
        fetchData();
    }, [username]);

    useEffect(() => {
        if (!selectedDate || !profile || !selectedService) return;
        const slots: string[] = [];
        const now = new Date();
        let current = setMinutes(setHours(selectedDate, profile.work_start_hour || 9), 0);
        const end = setMinutes(setHours(selectedDate, profile.work_end_hour || 21), 0);
        while (isBefore(current, end)) {
            if (isBefore(now, current)) slots.push(format(current, "HH:mm"));
            current = addMinutes(current, 30);
        }
        setAvailableTimeSlots(slots);
    }, [selectedDate, selectedService, profile]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !selectedService || !selectedTime) return;
        setBookingStatus("submitting");
        const [h, m] = selectedTime.split(":").map(Number);
        const startDate = setMinutes(setHours(selectedDate!, h), m);

        const res = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                masterId: profile.id, // ТЕПЕРЬ ПЕРЕДАЕМ ПРАВИЛЬНЫЙ ID
                serviceId: selectedService.id,
                clientName, clientPhone,
                startTime: startDate.toISOString(),
            }),
        });

        if (res.status === 409) setBookingStatus("conflict");
        else if (res.ok) setBookingStatus("success");
        else setBookingStatus("error");
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">Загрузка...</div>;
    if (!profile) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Мастер не найден</div>;

    if (bookingStatus === "success") return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Запись подтверждена!</h1>
            <p className="text-slate-400">Ждем вас {format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}.</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-slate-800 px-8 py-3 rounded-full font-bold">Вернуться назад</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 font-sans">
            <div className="max-w-md mx-auto">
                <h1 className="text-xl font-bold mb-6 text-center text-blue-400">{profile.business_name || profile.username}</h1>
                {!selectedService ? (
                    <div className="space-y-4">
                        {services.map(s => (
                            <div key={s.id} onClick={() => setSelectedService(s)} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-blue-500 cursor-pointer">
                                <h3 className="font-bold text-lg">{s.name}</h3>
                                <p className="text-sm text-slate-400">{s.price} ₽ • {s.duration} мин</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days?.split(',').map(Number) || [] }]} />
                        {selectedDate && (
                            <div className="grid grid-cols-4 gap-2">
                                {availableTimeSlots.map(t => (
                                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-2 rounded-lg text-xs font-bold ${selectedTime === t ? "bg-blue-600" : "bg-slate-800 border border-slate-700 text-slate-400"}`}>{t}</button>
                                ))}
                            </div>
                        )}
                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-4">
                                <input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="Ваше имя" />
                                <input required value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="Телефон" />
                                <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-blue-600 py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20">{bookingStatus === "submitting" ? "Секунду..." : "Подтвердить запись"}</button>
                            </form>
                        )}
                        {bookingStatus === "error" && <p className="text-red-400 text-center text-sm font-bold">Ошибка записи. Попробуйте еще раз.</p>}
                        {bookingStatus === "conflict" && <p className="text-orange-400 text-center text-sm">Время уже занято!</p>}
                    </div>
                )}
            </div>
        </div>
    );
}