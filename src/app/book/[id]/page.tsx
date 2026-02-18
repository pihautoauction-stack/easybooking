"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, ChevronLeft, User, Phone, CalendarDays, BellRing } from "lucide-react";
import { format, setHours, setMinutes, startOfToday, addMinutes, isBefore } from "date-fns";
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
    
    // Данные клиента из памяти браузера
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
            
            // Подтягиваем сохраненные данные клиента, если он уже записывался ранее
            setClientName(localStorage.getItem('eb_name') || "");
            setClientPhone(localStorage.getItem('eb_phone') || "");
            
            setLoading(false);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!selectedDate || !profile) return;
        setShowWaitlist(false);
        setWaitlistStatus("idle");

        const generateSlots = async () => {
            const slots: string[] = [];
            const now = new Date();
            const startDay = new Date(selectedDate); startDay.setHours(0,0,0,0);
            const endDay = new Date(selectedDate); endDay.setHours(23,59,59,999);
            
            let query = supabase.from("appointments").select("start_time").eq("master_id", profile.id).gte("start_time", startDay.toISOString()).lte("start_time", endDay.toISOString());
            if (selectedEmployee) query = query.eq("employee_id", selectedEmployee.id);
            
            const { data: busy } = await query;
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
    }, [selectedDate, profile, selectedEmployee]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTime || !profile) return;
        setBookingStatus("submitting");

        // Сохраняем данные в браузер на будущее
        localStorage.setItem('eb_name', clientName);
        localStorage.setItem('eb_phone', clientPhone);

        const [h, m] = selectedTime.split(":").map(Number);
        const startTime = setMinutes(setHours(selectedDate!, h), m).toISOString();

        // Проверяем, не заняли ли слот прямо сейчас
        let busyQuery = supabase.from("appointments").select("id").eq("master_id", profile.id).eq("start_time", startTime);
        if (selectedEmployee) busyQuery = busyQuery.eq("employee_id", selectedEmployee.id);
        const { data: busy } = await busyQuery.maybeSingle();
        
        if (busy) {
            setBookingStatus("conflict");
            return;
        }

        // Записываем напрямую в Supabase
        const { error } = await supabase.from("appointments").insert({
            master_id: profile.id,
            service_id: selectedService.id,
            employee_id: selectedEmployee?.id,
            client_name: clientName,
            client_phone: clientPhone,
            start_time: startTime,
            status: 'active'
        });

        if (!error) {
            setBookingStatus("success");
            // Через пару секунд кидаем в "Мои записи"
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

        // Записываем заявку в лист ожидания напрямую в БД
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

    if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" /></div>;
    if (!profile) return <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white/50 font-medium">Профиль не найден.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-white p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[320px] flex flex-col items-center">
                    <div className="bg-[#32D74B]/15 p-6 rounded-full mb-6 border border-[#32D74B]/20"><CheckCircle className="w-16 h-16 text-[#32D74B]" /></div>
                    <h1 className="text-2xl font-semibold mb-3 tracking-tight">Вы успешно записаны</h1>
                    <p className="text-white/60 mb-10 text-base leading-relaxed">
                        Ждем вас <span className="text-white font-semibold">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                        {selectedEmployee && <><br/><span className="text-[#0A84FF] text-sm mt-2 block font-medium">Специалист: {selectedEmployee.name}</span></>}
                    </p>
                    <div className="space-y-4 w-full">
                        <button onClick={() => router.push('/my-bookings')} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl active:scale-[0.97] text-base transition-all shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]">Мои записи</button>
                        <button onClick={resetBooking} className="w-full bg-white/5 text-white/70 font-semibold py-4 rounded-2xl active:scale-[0.97] text-base transition-all">Новая запись</button>
                    </div>
                </div>
            </div>
        );
    }

    if (waitlistStatus === "success") {
        return (
            <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-white p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[320px] flex flex-col items-center">
                    <div className="bg-[#BF5AF2]/15 p-6 rounded-full mb-6 border border-[#BF5AF2]/20"><BellRing className="w-16 h-16 text-[#BF5AF2]" /></div>
                    <h1 className="text-2xl font-semibold mb-3 tracking-tight">Вы в листе ожидания</h1>
                    <p className="text-white/60 mb-10 text-base leading-relaxed">Если появится свободное окно на <span className="text-white font-semibold">{format(selectedDate!, "d MMMM", { locale: ru })}</span>, специалист свяжется с вами.</p>
                    <button onClick={resetBooking} className="w-full bg-white/5 text-white/70 font-semibold py-4 rounded-2xl active:scale-[0.97] text-base transition-all">Вернуться в начало</button>
                </div>
            </div>
        );
    }

    const filteredServices = services.filter(service => {
        if (selectedEmployee) return !service.employee_id || service.employee_id === selectedEmployee.id;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#000000] text-white p-5 font-sans pb-24 selection:bg-[#0A84FF]/30 antialiased">
            <div className="max-w-md mx-auto w-full">
                
                {/* HEADER КЛИЕНТА */}
                <div className="flex items-center gap-3 mb-8 pt-2">
                    {(selectedEmployee || selectedService || showWaitlist) && (
                        <button onClick={handleBack} className="p-2.5 bg-[#1C1C1E] rounded-full border border-white/5 active:scale-95 shrink-0 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-semibold tracking-tight text-white truncate">{profile.business_name}</h1>
                        <p className="text-[11px] text-[#0A84FF] font-semibold tracking-wider mt-0.5 uppercase">Онлайн-запись</p>
                    </div>
                    <button onClick={() => router.push('/my-bookings')} className="p-3 bg-[#0A84FF]/10 rounded-full active:scale-95 transition-all shrink-0"><CalendarDays className="w-5 h-5 text-[#0A84FF]" /></button>
                </div>

                {profile.role === 'owner' && !selectedEmployee ? (
                    <div className="space-y-3">
                        <p className="text-sm text-white/50 mb-3 ml-2 font-medium">Выберите специалиста</p>
                        {employees.map((emp) => (
                            <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/5 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-4">
                                <div className="w-14 h-14 bg-[#BF5AF2]/10 rounded-full flex items-center justify-center shrink-0"><User className="w-6 h-6 text-[#BF5AF2]" /></div>
                                <div><h3 className="font-semibold text-base text-white">{emp.name}</h3>{emp.specialty && <p className="text-[12px] text-white/50 font-medium mt-1">{emp.specialty}</p>}</div>
                            </div>
                        ))}
                    </div>
                ) : !selectedService ? (
                    <div className="space-y-3">
                        {selectedEmployee && <div className="mb-5 bg-[#BF5AF2]/10 p-4 rounded-[20px] text-sm text-[#BF5AF2] font-semibold flex items-center gap-2"><User className="w-5 h-5"/> Мастер: {selectedEmployee.name}</div>}
                        <p className="text-sm text-white/50 mb-3 ml-2 font-medium">Выберите услугу</p>
                        {filteredServices.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-[#1C1C1E] rounded-[24px] p-5 border border-white/5 active:scale-[0.98] transition-all cursor-pointer flex flex-col">
                                <div className="flex justify-between items-center gap-3"><h3 className="font-semibold text-base text-white line-clamp-2 leading-tight">{service.name}</h3><span className="text-white font-semibold bg-white/10 px-3.5 py-1.5 rounded-xl text-sm shrink-0">{service.price} ₽</span></div>
                                {service.image_urls && service.image_urls.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x mt-4">
                                        {service.image_urls.map((url: string, idx: number) => (<img key={idx} src={url} alt="Услуга" className="w-24 h-24 object-cover rounded-[16px] shrink-0 snap-center" />))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/5 text-center">
                            <h3 className="font-semibold text-lg mb-2 text-white">{selectedService.name}</h3>
                            <p className="text-white font-medium text-sm bg-white/10 inline-block px-3 py-1 rounded-lg">{selectedService.price} ₽</p>
                        </div>

                        {!showWaitlist ? (
                            <>
                                <p className="text-sm text-white/50 ml-2 font-medium">Выберите дату и время</p>
                                <div className="flex justify-center bg-[#1C1C1E] rounded-[28px] p-5 border border-white/5 overflow-x-auto w-full">
                                    <style>{`.rdp { --rdp-cell-size: min(12vw, 42px); --rdp-accent-color: #0A84FF; --rdp-background-color: transparent; margin: 0 auto; width: 100%; max-width: 100%; display: flex; justify-content: center; } .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #0A84FF; color: white; font-weight: 600; border-radius: 12px; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.08); border-radius: 12px; } .rdp-day { border-radius: 12px; font-size: min(4vw, 15px); font-weight: 500; } .rdp-caption_label { font-size: min(4.5vw, 17px); font-weight: 600; } .rdp-head_cell { font-size: min(3.5vw, 13px); font-weight: 500; color: rgba(255,255,255,0.3); }`}</style>
                                    <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]} />
                                </div>

                                {selectedDate && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                                        {availableSlots.length > 0 ? availableSlots.map(t => (
                                            <button key={t} onClick={() => setSelectedTime(t)} className={`py-3.5 rounded-2xl text-sm font-semibold transition-all ${selectedTime === t ? "bg-[#0A84FF] text-white shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]" : "bg-[#1C1C1E] text-white/70 active:scale-95"}`}>{t}</button>
                                        )) : (
                                            <div className="col-span-3 sm:col-span-4 mt-2">
                                                <div className="text-center text-[#FF453A] font-medium text-sm py-4 bg-[#FF453A]/10 rounded-2xl mb-3">Мест нет</div>
                                                <button onClick={() => setShowWaitlist(true)} className="w-full bg-white/5 text-white font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2">
                                                    <BellRing className="w-5 h-5 text-[#BF5AF2]" /> Сообщить об окне
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTime && (
                                    <form onSubmit={handleBooking} className="space-y-4 pt-6 mt-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-3">
                                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all placeholder-white/40" placeholder="Ваше имя" /></div>
                                            <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all placeholder-white/40" placeholder="+7 (999) 000-00-00" /></div>
                                        </div>
                                        
                                        {bookingStatus === "conflict" && <p className="text-[#FF453A] text-sm text-center">Это время только что заняли. Выберите другое.</p>}
                                        
                                        <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] transition-all disabled:opacity-50">{bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}</button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleWaitlist} className="space-y-5 pt-4 border-t border-white/10 animate-in fade-in">
                                <p className="text-sm text-white/60 mb-2 leading-relaxed">Оставьте контакты, и мы сообщим вам, если освободится место на <span className="text-white font-semibold">{format(selectedDate!, "d MMMM", { locale: ru })}</span>.</p>
                                <div className="space-y-3">
                                    <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#BF5AF2]/50 transition-all placeholder-white/40" placeholder="Ваше имя" /></div>
                                    <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#BF5AF2]/50 transition-all placeholder-white/40" placeholder="+7 (999) 000-00-00" /></div>
                                </div>
                                <button type="submit" disabled={waitlistStatus === "submitting"} className="w-full bg-white/10 text-white font-semibold py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50">{waitlistStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Встать в лист ожидания"}</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}