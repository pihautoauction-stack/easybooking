"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { pb } from "@/lib/pb";
import { Loader2, Calendar as CalIcon, Clock, User, Phone, CheckCircle2 } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";

export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const masterId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [master, setMaster] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    // Данные клиента, которые подтянутся из localStorage если он уже записывался
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        const loadMaster = async () => {
            try {
                const m = await pb.collection('users').getOne(masterId);
                setMaster(m);
                const s = await pb.collection('services').getFullList({ filter: `user = "${masterId}"` });
                setServices(s);
                
                // Достаем данные из браузера клиента
                setClientName(localStorage.getItem('eb_name') || "");
                setClientPhone(localStorage.getItem('eb_phone') || "");
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadMaster();
    }, [masterId]);

    const handleBook = async () => {
        if (!selectedService || !selectedTime || !clientName || !clientPhone) return;
        setLoading(true);

        // Сохраняем клиента в память его телефона навсегда
        localStorage.setItem('eb_name', clientName);
        localStorage.setItem('eb_phone', clientPhone);

        const [hours, minutes] = selectedTime.split(':');
        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(Number(hours), Number(minutes), 0, 0);

        try {
            await pb.collection('appointments').create({
                master: masterId,
                service: selectedService.id,
                client_name: clientName,
                client_phone: clientPhone,
                start_time: startDateTime.toISOString(),
                status: 'active'
            });
            setBookingSuccess(true);
            setTimeout(() => {
                router.push("/my-bookings"); // Перекидываем в кабинет
            }, 2000);
        } catch (e) {
            alert("Ошибка при записи. Попробуйте еще раз.");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#0A84FF]" /></div>;

    if (bookingSuccess) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6 text-white">
            <CheckCircle2 className="w-20 h-20 text-[#32D74B] mb-6" />
            <h1 className="text-2xl font-bold mb-2">Вы успешно записаны!</h1>
            <p className="text-white/50 text-sm">Перенаправляем в ваши записи...</p>
        </div>
    );

    const availableTimes = ["10:00", "11:30", "13:00", "15:00", "17:30", "19:00"]; // Здесь позже можно сделать умный расчет

    return (
        <div className="min-h-screen bg-black text-white p-5 pb-24 antialiased">
            <div className="text-center mb-8 pt-4">
                <h1 className="text-2xl font-bold">{master?.business_name || "Специалист"}</h1>
                <p className="text-white/40 text-sm">Онлайн запись</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h2 className="text-sm font-bold text-white/50 uppercase mb-3 ml-2">Выберите услугу</h2>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} onClick={() => setSelectedService(s)} className={`p-4 rounded-2xl border transition-all ${selectedService?.id === s.id ? "bg-[#0A84FF]/20 border-[#0A84FF] text-white" : "bg-[#1C1C1E] border-white/5 text-white/60"}`}>
                                <div className="font-bold">{s.name}</div>
                                <div className="text-sm mt-1 font-medium">{s.price} ₽</div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedService && (
                    <div>
                        <h2 className="text-sm font-bold text-white/50 uppercase mb-3 ml-2 mt-6">Дата и время</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {availableTimes.map(time => (
                                <button key={time} onClick={() => setSelectedTime(time)} className={`py-4 rounded-2xl font-bold text-sm border transition-all ${selectedTime === time ? "bg-[#32D74B] border-[#32D74B] text-black" : "bg-[#1C1C1E] border-white/5 text-white"}`}>
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTime && (
                    <div className="space-y-3 pt-4">
                        <h2 className="text-sm font-bold text-white/50 uppercase mb-3 ml-2">Ваши данные</h2>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input type="text" placeholder="Ваше Имя" value={clientName} onChange={e=>setClientName(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 pl-12 pr-4 py-4 rounded-2xl outline-none" />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input type="tel" placeholder="Номер телефона" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 pl-12 pr-4 py-4 rounded-2xl outline-none" />
                        </div>
                    </div>
                )}
            </div>

            {selectedTime && clientName && clientPhone.length > 5 && (
                <div className="fixed bottom-0 left-0 w-full p-4 bg-black/80 backdrop-blur-xl border-t border-white/5">
                    <button onClick={handleBook} className="w-full bg-[#0A84FF] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all">
                        Записаться за {selectedService?.price} ₽
                    </button>
                </div>
            )}
        </div>
    );
}