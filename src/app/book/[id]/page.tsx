"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, User, Phone, CheckCircle2, Briefcase } from "lucide-react";
import { startOfToday, addDays, format } from "date-fns";
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
    
    // Берем данные из памяти телефона, если клиент уже записывался
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(false);

    useEffect(() => {
        const loadMaster = async () => {
            // Загружаем профиль мастера
            const { data: m } = await supabase.from('profiles').select('*').eq('id', masterId).single();
            setMaster(m);
            
            // Загружаем услуги мастера
            const { data: s } = await supabase.from('services').select('*').eq('user_id', masterId);
            setServices(s || []);
            
            // Пытаемся достать данные клиента из браузера (если он тут не впервые)
            setClientName(localStorage.getItem('eb_name') || "");
            setClientPhone(localStorage.getItem('eb_phone') || "");
            
            setLoading(false);
        };
        loadMaster();
    }, [masterId]);

    const handleBook = async () => {
        if (!selectedService || !selectedTime || !clientName || !clientPhone) return;
        setLoading(true);

        // Намертво сохраняем данные в браузере клиента для следующих визитов
        localStorage.setItem('eb_name', clientName);
        localStorage.setItem('eb_phone', clientPhone);

        const [hours, minutes] = selectedTime.split(':');
        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(Number(hours), Number(minutes), 0, 0);

        // Записываем в базу
        const { error } = await supabase.from('appointments').insert({
            master_id: masterId,
            service_id: selectedService.id,
            client_name: clientName,
            client_phone: clientPhone,
            start_time: startDateTime.toISOString(),
            status: 'active'
        });

        if (!error) {
            setBookingSuccess(true);
            // Через 2 секунды перекидываем клиента в его личный кабинет
            setTimeout(() => router.push("/my-bookings"), 2000);
        } else {
            alert("Произошла ошибка при записи. Попробуйте еще раз.");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" /></div>;

    // Экран успешной записи
    if (bookingSuccess) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6 text-white antialiased relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#32D74B]/20 blur-[100px] rounded-full"></div>
            <CheckCircle2 className="w-24 h-24 text-[#32D74B] mb-6 relative z-10 animate-bounce" />
            <h1 className="text-3xl font-bold mb-3 relative z-10">Вы записаны!</h1>
            <p className="text-white/50 text-sm relative z-10">Перенаправляем в ваши записи...</p>
        </div>
    );

    // Временный массив времени (в будущем сюда можно прикрутить реальную логику слотов)
    const availableTimes = ["10:00", "11:30", "13:00", "15:00", "17:30", "19:00"];

    return (
        <div className="min-h-screen bg-black text-white p-5 pb-32 antialiased">
            <div className="text-center mb-10 pt-6">
                <div className="w-16 h-16 bg-[#1C1C1E] rounded-2xl mx-auto mb-4 border border-white/10 flex items-center justify-center shadow-lg">
                    <span className="font-bold text-[#0A84FF] text-xl">EB</span>
                </div>
                <h1 className="text-2xl font-bold">{master?.business_name || "Специалист"}</h1>
                <p className="text-[#32D74B] text-xs font-bold uppercase tracking-widest mt-2">Онлайн запись</p>
            </div>

            <div className="space-y-8">
                {/* Выбор услуги */}
                <div>
                    <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Выберите услугу</h2>
                    <div className="space-y-3">
                        {services.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => setSelectedService(s)} 
                                className={`p-5 rounded-[24px] border transition-all cursor-pointer active:scale-95 shadow-md ${selectedService?.id === s.id ? "bg-[#0A84FF]/10 border-[#0A84FF] text-white" : "bg-[#1C1C1E] border-white/5 text-white/60 hover:border-white/20"}`}
                            >
                                <div className="font-bold text-lg mb-1">{s.name}</div>
                                <div className={`text-sm font-semibold ${selectedService?.id === s.id ? "text-[#0A84FF]" : "text-white/40"}`}>{s.price} ₽</div>
                            </div>
                        ))}
                        {services.length === 0 && <div className="text-center text-white/40 text-sm py-4">У мастера пока нет услуг</div>}
                    </div>
                </div>

                {/* Выбор времени */}
                {selectedService && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 ml-2">Свободное время сегодня</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {availableTimes.map(time => (
                                <button 
                                    key={time} 
                                    onClick={() => setSelectedTime(time)} 
                                    className={`py-4 rounded-2xl font-bold text-sm border transition-all active:scale-90 ${selectedTime === time ? "bg-[#32D74B] border-[#32D74B] text-black shadow-[0_0_20px_0_rgba(50,215,75,0.3)]" : "bg-[#1C1C1E] border-white/5 text-white hover:border-white/20"}`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Данные клиента */}
                {selectedTime && (
                    <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-2">Ваши данные</h2>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input 
                                type="text" 
                                placeholder="Ваше Имя" 
                                value={clientName} 
                                onChange={e=>setClientName(e.target.value)} 
                                className="w-full bg-[#1C1C1E] border border-white/5 pl-14 pr-5 py-5 rounded-[24px] outline-none focus:border-[#0A84FF]/50 transition-colors text-base shadow-sm" 
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input 
                                type="tel" 
                                placeholder="Номер телефона (+7...)" 
                                value={clientPhone} 
                                onChange={e=>setClientPhone(e.target.value)} 
                                className="w-full bg-[#1C1C1E] border border-white/5 pl-14 pr-5 py-5 rounded-[24px] outline-none focus:border-[#0A84FF]/50 transition-colors text-base shadow-sm" 
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Плавающая кнопка подтверждения */}
            {selectedTime && clientName && clientPhone.length > 5 && (
                <div className="fixed bottom-0 left-0 w-full p-5 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 animate-in slide-in-from-bottom-full duration-300">
                    <button 
                        onClick={handleBook} 
                        disabled={loading}
                        className="w-full bg-[#0A84FF] text-white font-bold py-5 rounded-[24px] active:scale-95 transition-all shadow-[0_4px_25px_0_rgba(10,132,255,0.4)] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Подтвердить визит за ${selectedService?.price} ₽`}
                    </button>
                </div>
            )}
        </div>
    );
}