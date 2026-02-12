"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { format, setHours, setMinutes, startOfToday, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { CheckCircle, Loader2 } from "lucide-react";

export default function BookingPage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);
    const [profile, setProfile] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");

    useEffect(() => {
        supabase.from("profiles").select("*").eq("username", username).single().then(({data}) => {
            if (data) {
                setProfile(data);
                supabase.from("services").select("*").eq("user_id", data.id).then(({data: s}) => setServices(s || []));
            }
        });
    }, [username]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !selectedTime) return;
        setStatus("submitting");
        const [h, m] = selectedTime.split(":").map(Number);
        const startTime = setMinutes(setHours(selectedDate!, h), m).toISOString();

        const res = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify({ masterId: profile.id, serviceId: selectedService.id, clientName: name, clientPhone: phone, startTime })
        });

        if (res.status === 409) setStatus("conflict");
        else if (res.ok) setStatus("success");
        else setStatus("error");
    };

    if (!profile) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Загрузка...</div>;

    if (status === "success") return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
            <h1 className="text-2xl font-bold text-emerald-400">Запись подтверждена!</h1>
            <p className="mt-2 text-slate-400">Ждем вас {format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}.</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-slate-800 px-8 py-3 rounded-full font-bold">Назад</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4">
            <div className="max-w-md mx-auto">
                <h1 className="text-xl font-bold mb-6 text-center text-blue-400 uppercase">{profile.business_name || profile.username}</h1>
                {!selectedService ? (
                    <div className="space-y-4">
                        {services.map(s => (
                            <div key={s.id} onClick={() => setSelectedService(s)} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all">
                                <h3 className="font-bold text-lg">{s.name}</h3>
                                <p className="text-sm text-slate-400">{s.price} ₽</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-center bg-slate-800 p-4 rounded-2xl border border-slate-700">
                            <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days?.split(',').map(Number) || [] }]} />
                        </div>
                        {selectedDate && (
                            <div className="grid grid-cols-4 gap-2">
                                {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"].map(t => (
                                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-2 rounded-lg text-xs font-bold ${selectedTime === t ? "bg-blue-600" : "bg-slate-800 border border-slate-700 text-slate-400"}`}>{t}</button>
                                ))}
                            </div>
                        )}
                        {selectedTime && (
                            <form onSubmit={handleBooking} className="space-y-4">
                                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="Ваше имя" />
                                <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="Телефон" />
                                <button type="submit" disabled={status === "submitting"} className="w-full bg-blue-600 py-4 rounded-xl font-bold shadow-lg">
                                    {status === "submitting" ? <Loader2 className="animate-spin mx-auto" /> : "Записаться"}
                                </button>
                            </form>
                        )}
                        {status === "conflict" && <p className="text-orange-400 text-center text-sm font-bold">Это время только что заняли!</p>}
                    </div>
                )}
            </div>
        </div>
    );
}