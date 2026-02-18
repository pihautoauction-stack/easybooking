"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, ChevronLeft, User, Phone, CalendarDays, BellRing, Clock } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { useRouter } from "next/navigation";
import "react-day-picker/dist/style.css";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "submitting" | "success">("idle");

    useEffect(() => {
        const fetchData = async () => {
            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
            if (profileData) {
                setProfile(profileData);
                const { data: servicesData } = await supabase.from("services").select("*").eq("user_id", profileData.id);
                setServices(servicesData || []);
                
                if (profileData.role === 'owner') {
                    const { data: empData } = await supabase.from("employees").select("*").eq("salon_id", profileData.id);
                    setEmployees(empData || []);
                }
            }
            
            setClientName(localStorage.getItem('eb_name') || "");
            setClientPhone(localStorage.getItem('eb_phone') || "");
            setLoading(false);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!selectedDate || !profile || !selectedService) return;
        setShowWaitlist(false);
        setWaitlistStatus("idle");

        const generateSlots = async () => {
            const now = new Date();
            const startDay = new Date(selectedDate); startDay.setHours(0,0,0,0);
            const endDay = new Date(selectedDate); endDay.setHours(23,59,59,999);
            
            // Получаем активные записи на этот день с длительностью их услуг
            let query = supabase.from("appointments")
                .select("start_time, service:services(duration)")
                .eq("master_id", profile.id)
                .gte("start_time", startDay.toISOString())
                .lte("start_time", endDay.toISOString())
                .eq("status", "active"); // Учитываем только активные!
            
            if (selectedEmployee) query = query.eq("employee_id", selectedEmployee.id);
            const { data: busy } = await query;

            // 1. Превращаем занятое время в интервалы [старт в минутах, конец в минутах от начала дня]
            const busyIntervals = (busy || []).map(b => {
                const d = new Date(b.start_time);
                const startMins = d.getHours() * 60 + d.getMinutes();
                const duration = b.service?.duration || 60; // Если длительности нет, по умолчанию 1 час
                return { start: startMins, end: startMins + duration };
            });

            // 2. Достаем перерывы
            const rawBreaks = typeof profile.breaks === 'string' ? JSON.parse(profile.breaks) : (profile.breaks || []);
            const breakIntervals = rawBreaks.map((br: any) => {
                const [sH, sM] = br.start.split(':').map(Number);
                const [eH, eM] = br.end.split(':').map(Number);
                return { start: sH * 60 + sM, end: eH * 60 + eM };
            });

            // 3. Рабочие часы
            const [wStartH, wStartM] = (profile.work_start_time || "09:00").split(':').map(Number);
            const [wEndH, wEndM] = (profile.work_end_time || "20:00").split(':').map(Number);
            const workStartMins = wStartH * 60 + wStartM;
            const workEndMins = wEndH * 60 + wEndM;

            const step = profile.schedule_step || 30; // Шаг расписания (15, 30, 60)
            const serviceDuration = selectedService.duration || 60; // Длительность текущей услуги

            const slots: string[] = [];
            let currentMins = workStartMins;

            const isToday = startDay.toDateString() === now.toDateString();
            const currentNowMins = now.getHours() * 60 + now.getMinutes();

            // ПРОХОДИМСЯ ПО ВСЕМУ РАБОЧЕМУ ДНЮ ШАГОМ
            while (currentMins + serviceDuration <= workEndMins) {
                const slotStart = currentMins;
                const slotEnd = currentMins + serviceDuration;
                let isValid = true;

                // Проверка: не прошло ли уже время (если день сегодня)
                if (isToday && slotStart <= currentNowMins) {
                    isValid = false;
                }

                // Проверка: не пересекается ли слот с уже занятыми записями
                if (isValid) {
                    for (const b of busyIntervals) {
                        // Логика пересечения отрезков: (Старт1 < Конец2) И (Конец1 > Старт2)
                        if (slotStart < b.end && slotEnd > b.start) {
                            isValid = false; break;
                        }
                    }
                }

                // Проверка: не пересекается ли слот с перерывами (Обед)
                if (isValid) {
                    for (const br of breakIntervals) {
                        if (slotStart < br.end && slotEnd > br.start) {
                            isValid = false; break;
                        }
                    }
                }

                // Если всё ок - добавляем слот
                if (isValid) {
                    const h = Math.floor(slotStart / 60).toString().padStart(2, '0');
                    const m = (slotStart % 60).toString().padStart(2, '0');
                    slots.push(`${h}:${m}`);
                }

                currentMins += step; // Идем дальше на шаг (например, +30 мин)
            }
            setAvailableSlots(slots);
        };
        generateSlots();
    }, [selectedDate, profile, selectedEmployee, selectedService]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTime || !profile) return;
        setBookingStatus("submitting");

        localStorage.setItem('eb_name', clientName);
        localStorage.setItem('eb_phone', clientPhone);

        const [h, m] = selectedTime.split(":").map(Number);
        const startDateTime = new Date(selectedDate!);
        startDateTime.setHours(h, m, 0, 0);
        const startTimeStr = startDateTime.toISOString();

        // Проверяем конфликты в базе перед самой записью
        let busyQuery = supabase.from("appointments").select("id").eq("master_id", profile.id).eq("start_time", startTimeStr).eq("status", "active");
        if (selectedEmployee) busyQuery = busyQuery.eq("employee_id", selectedEmployee.id);
        const { data: busy } = await busyQuery.maybeSingle();
        
        if (busy) {
            setBookingStatus("conflict");
            return;
        }

        const { error } = await supabase.from("appointments").insert({
            master_id: profile.id,
            service_id: selectedService.id,
            employee_id: selectedEmployee?.id,
            client_name: clientName,
            client_phone: clientPhone,
            start_time: startTimeStr,
            status: 'active'
        });

        if (!error) {
            setBookingStatus("success");
            setTimeout(() => router.push('/my-bookings'), 2000);
        } else {
            setBookingStatus("error");
        }
    };

    const handleWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !selectedDate) return;
        setWaitlistStatus("submitting");

        localStorage.setItem('eb_name', clientName);
        localStorage.setItem('eb_phone', clientPhone);

        const { error } = await supabase.from('waitlist').insert({
            master_id: profile.id,
            date: selectedDate.toISOString(),
            client_name: clientName,
            client_phone: clientPhone
        });

        if (!error) setWaitlistStatus("success");
        else alert("Ошибка. Попробуйте позже.");
    };

    const resetBooking = () => {
        setBookingStatus("idle"); setSelectedEmployee(null); setSelectedService(null);
        setSelectedDate(undefined); setSelectedTime(null);
        setShowWaitlist(false); setWaitlistStatus("idle");
    };

    const handleBack = () => {
        if (showWaitlist) setShowWaitlist(false);
        else if (selectedDate) { setSelectedDate(undefined); setSelectedTime(null); }
        else if (selectedService) setSelectedService(null);
        else if (selectedEmployee) setSelectedEmployee(null);
    };

    if (loading) return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!profile) return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-gray-500 font-medium">Профиль не найден.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center text-gray-900 p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[320px] flex flex-col items-center bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div className="bg-emerald-50 p-6 rounded-full mb-6 border border-emerald-100"><CheckCircle className="w-16 h-16 text-emerald-500" /></div>
                    <h1 className="text-2xl font-black mb-3 tracking-tight text-gray-900">Вы успешно записаны</h1>
                    <p className="text-gray-500 mb-8 text-sm font-medium leading-relaxed">
                        Ждем вас <span className="text-gray-900 font-bold">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                        {selectedEmployee && <><br/><span className="text-indigo-600 mt-2 block font-bold">Специалист: {selectedEmployee.name}</span></>}
                    </p>
                    <div className="space-y-3 w-full">
                        <button onClick={() => router.push('/my-bookings')} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-indigo-600/20">Мои записи</button>
                    </div>
                </div>
            </div>
        );
    }

    if (waitlistStatus === "success") {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center text-gray-900 p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[320px] flex flex-col items-center bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div className="bg-purple-50 p-6 rounded-full mb-6 border border-purple-100"><BellRing className="w-16 h-16 text-purple-600" /></div>
                    <h1 className="text-2xl font-black mb-3 tracking-tight text-gray-900">Вы в листе ожидания</h1>
                    <p className="text-gray-500 mb-8 text-sm font-medium leading-relaxed">Если появится окно на <span className="text-gray-900 font-bold">{format(selectedDate!, "d MMMM", { locale: ru })}</span>, мы свяжемся с вами.</p>
                    <button onClick={resetBooking} className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all">Вернуться в начало</button>
                </div>
            </div>
        );
    }

    const filteredServices = services.filter(service => {
        if (selectedEmployee) return !service.employee_id || service.employee_id === selectedEmployee.id;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-gray-900 p-4 sm:p-5 font-sans pb-24 selection:bg-indigo-100 antialiased">
            <div className="max-w-md mx-auto w-full space-y-6">
                
                {/* HEADER КЛИЕНТА */}
                <div className="flex items-center gap-3 pt-2">
                    {(selectedEmployee || selectedService || showWaitlist) && (
                        <button onClick={handleBack} className="p-3 bg-white rounded-full border border-gray-200 shadow-sm active:scale-95 shrink-0 transition-all text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-black tracking-tight text-gray-900 truncate">{profile.business_name}</h1>
                        <p className="text-[11px] text-indigo-600 font-bold tracking-widest mt-0.5 uppercase">Онлайн-запись</p>
                    </div>
                    <button onClick={() => router.push('/my-bookings')} className="p-3 bg-indigo-50 rounded-full border border-indigo-100 active:scale-95 transition-all shrink-0"><CalendarDays className="w-5 h-5 text-indigo-600" /></button>
                </div>

                {profile.role === 'owner' && !selectedEmployee ? (
                    <div className="space-y-3">
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3 ml-2 font-bold">1. Выберите специалиста</p>
                        {employees.map((emp) => (
                            <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100"><User className="w-6 h-6 text-indigo-600" /></div>
                                <div><h3 className="font-bold text-base text-gray-900">{emp.name}</h3>{emp.specialty && <p className="text-xs text-indigo-600 font-bold mt-1">{emp.specialty}</p>}</div>
                            </div>
                        ))}
                    </div>
                ) : !selectedService ? (
                    <div className="space-y-4">
                        {selectedEmployee && <div className="bg-indigo-50 p-4 rounded-2xl text-sm text-indigo-600 font-bold flex items-center gap-2 border border-indigo-100 shadow-sm"><User className="w-5 h-5"/> Выбран мастер: {selectedEmployee.name}</div>}
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3 ml-2 font-bold">Выберите услугу</p>
                        {filteredServices.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all cursor-pointer flex flex-col group hover:border-indigo-100">
                                <div className="flex justify-between items-start gap-4">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">{service.name}</h3>
                                    <span className="text-gray-900 font-black bg-gray-50 px-3.5 py-1.5 rounded-xl text-base shrink-0 border border-gray-200">{service.price} ₽</span>
                                </div>
                                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                    <Clock className="w-4 h-4" /> {service.duration || 60} мин.
                                </div>
                                {service.image_urls && service.image_urls.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x mt-5">
                                        {service.image_urls.map((url: string, idx: number) => (<img key={idx} src={url} alt="Услуга" className="w-24 h-24 object-cover rounded-2xl shrink-0 snap-center shadow-sm border border-gray-100" />))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 leading-tight">{selectedService.name}</h3>
                                <p className="text-gray-500 text-xs font-bold mt-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {selectedService.duration || 60} мин.</p>
                            </div>
                            <span className="text-gray-900 font-black bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl text-base">{selectedService.price} ₽</span>
                        </div>

                        {!showWaitlist ? (
                            <>
                                <p className="text-[11px] text-gray-500 uppercase tracking-widest ml-2 font-bold">Выберите дату и время</p>
                                <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-x-auto w-full flex justify-center">
                                    <style>{`.rdp { --rdp-cell-size: min(12vw, 42px); --rdp-accent-color: #4F46E5; --rdp-background-color: #F9FAFB; margin: 0 auto; width: 100%; max-width: 100%; display: flex; justify-content: center; font-family: inherit; } .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: var(--rdp-accent-color); color: white; font-weight: 700; border-radius: 12px; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--rdp-background-color); border-radius: 12px; } .rdp-day { border-radius: 12px; font-size: min(4vw, 15px); font-weight: 600; color: #111827; } .rdp-caption_label { font-size: min(4.5vw, 17px); font-weight: 800; color: #111827; } .rdp-head_cell { font-size: min(3.5vw, 13px); font-weight: 700; color: #6B7280; text-transform: uppercase; } .rdp-day_outside { color: #D1D5DB; } .rdp-day_disabled { color: #E5E7EB; opacity: 0.5; }`}</style>
                                    <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]} />
                                </div>

                                {selectedDate && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2 animate-in fade-in slide-in-from-bottom-2">
                                        {availableSlots.length > 0 ? availableSlots.map(t => (
                                            <button key={t} onClick={() => setSelectedTime(t)} className={`py-4 rounded-2xl text-sm font-bold transition-all ${selectedTime === t ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-indigo-200 active:scale-95 shadow-sm"}`}>{t}</button>
                                        )) : (
                                            <div className="col-span-3 sm:col-span-4 mt-2">
                                                <div className="text-center text-rose-600 font-bold text-sm py-4 bg-rose-50 border border-rose-100 rounded-2xl mb-3 shadow-sm">Нет свободных мест</div>
                                                <button onClick={() => setShowWaitlist(true)} className="w-full bg-white border border-gray-200 text-gray-900 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50">
                                                    <BellRing className="w-5 h-5 text-indigo-600" /> Сообщить, если освободится
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTime && (
                                    <form onSubmit={handleBooking} className="space-y-4 pt-6 mt-6 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-3">
                                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400 shadow-sm" placeholder="Ваше имя" /></div>
                                            <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400 shadow-sm" placeholder="+7 (999) 000-00-00" /></div>
                                        </div>
                                        
                                        {bookingStatus === "conflict" && <p className="text-rose-500 font-bold text-sm text-center bg-rose-50 py-3 rounded-xl border border-rose-100">Это время только что заняли. Выберите другое.</p>}
                                        
                                        <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2">{bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}</button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleWaitlist} className="space-y-5 pt-6 mt-6 border-t border-gray-200 animate-in fade-in">
                                <p className="text-sm text-gray-500 font-medium mb-2 leading-relaxed">Оставьте контакты, и мы сообщим вам, если освободится место на <span className="text-gray-900 font-bold">{format(selectedDate!, "d MMMM", { locale: ru })}</span>.</p>
                                <div className="space-y-3">
                                    <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder-gray-400 shadow-sm" placeholder="Ваше имя" /></div>
                                    <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder-gray-400 shadow-sm" placeholder="+7 (999) 000-00-00" /></div>
                                </div>
                                <button type="submit" disabled={waitlistStatus === "submitting"} className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-purple-600/20 mt-2">{waitlistStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Встать в лист ожидания"}</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}