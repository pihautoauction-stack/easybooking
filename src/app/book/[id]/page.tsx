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
    
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    
    const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");
    
    // СТЕЙТЫ ДЛЯ ЛИСТА ОЖИДАНИЯ
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

        const [h, m] = selectedTime.split(":").map(Number);
        const startTime = setMinutes(setHours(selectedDate!, h), m).toISOString();
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const clientTgId = tgUser?.id?.toString() || null;

        const res = await fetch('/api/notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                masterId: profile.id, serviceId: selectedService.id, employeeId: selectedEmployee?.id, 
                employeeName: selectedEmployee?.name, clientName, clientPhone, startTime, clientTgId 
            }),
        });

        if (res.status === 409) setBookingStatus("conflict");
        else if (res.ok) setBookingStatus("success");
        else setBookingStatus("error");
    };

    // ФУНКЦИЯ ОТПРАВКИ В ЛИСТ ОЖИДАНИЯ
    const handleWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !selectedDate) return;
        setWaitlistStatus("submitting");

        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const clientTgId = tgUser?.id?.toString() || null;

        const res = await fetch('/api/waitlist', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                masterId: profile.id, date: selectedDate.toISOString(),
                clientName, clientPhone, clientTgId
            }),
        });

        if (res.ok) setWaitlistStatus("success");
        else alert("Ошибка. Попробуйте позже.");
    };

    const resetBooking = () => {
        setBookingStatus("idle"); setSelectedEmployee(null); setSelectedService(null);
        setSelectedDate(undefined); setSelectedTime(null); setClientName(""); setClientPhone("");
        setShowWaitlist(false); setWaitlistStatus("idle");
    };

    const handleBack = () => {
        if (showWaitlist) setShowWaitlist(false);
        else if (selectedDate) { setSelectedDate(undefined); setSelectedTime(null); }
        else if (selectedService) setSelectedService(null);
        else if (selectedEmployee) setSelectedEmployee(null);
    };

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    if (!profile) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50">Мастер не найден.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white p-4 font-sans text-center">
                <div className="w-full max-w-[300px] flex flex-col items-center">
                    <div className="bg-emerald-500/10 p-5 rounded-full mb-5 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"><CheckCircle className="w-14 h-14 text-emerald-400 drop-shadow-md" /></div>
                    <h1 className="text-2xl font-bold mb-2">Вы записаны!</h1>
                    <p className="text-white/50 mb-8 text-sm leading-relaxed">
                        Ждем вас <br/><span className="text-white font-medium">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                        {selectedEmployee && <><br/><span className="text-indigo-400 text-xs mt-2 block">К мастеру: {selectedEmployee.name}</span></>}
                    </p>
                    <div className="space-y-3 w-full">
                        <button onClick={() => router.push('/my-bookings')} className="w-full bg-blue-600/90 border border-blue-400/20 text-white font-bold py-4 rounded-2xl active:scale-95 text-sm transition-all">Мои записи</button>
                        <button onClick={resetBooking} className="w-full bg-white/5 text-white/70 font-bold py-4 rounded-2xl border border-white/10 active:scale-95 text-sm transition-all">Новая запись</button>
                    </div>
                </div>
            </div>
        );
    }

    if (waitlistStatus === "success") {
        return (
            <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center text-white p-4 font-sans text-center">
                <div className="w-full max-w-[300px] flex flex-col items-center">
                    <div className="bg-purple-500/10 p-5 rounded-full mb-5 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)]"><BellRing className="w-14 h-14 text-purple-400 drop-shadow-md" /></div>
                    <h1 className="text-2xl font-bold mb-2">Вы в листе ожидания</h1>
                    <p className="text-white/50 mb-8 text-sm leading-relaxed">Мы сообщим вам в Telegram, если освободится место на <span className="text-white font-medium">{format(selectedDate!, "d MMMM", { locale: ru })}</span>.</p>
                    <button onClick={resetBooking} className="w-full bg-white/5 text-white/70 font-bold py-4 rounded-2xl border border-white/10 active:scale-95 text-sm transition-all">Вернуться в начало</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white p-4 font-sans pb-24 selection:bg-blue-500/30">
            <div className="max-w-md mx-auto w-full">
                <div className="flex items-center gap-3 mb-6 pt-2">
                    {(selectedEmployee || selectedService || showWaitlist) && (
                        <button onClick={handleBack} className="p-2.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 active:scale-95 shrink-0 hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold uppercase tracking-widest text-blue-400/90 truncate">{profile.business_name}</h1>
                        <p className="text-[10px] text-white/40 font-medium tracking-wider mt-0.5">ОНЛАЙН-ЗАПИСЬ</p>
                    </div>
                    <button onClick={() => router.push('/my-bookings')} className="flex items-center justify-center p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl active:scale-95 shadow-lg shrink-0"><CalendarDays className="w-5 h-5 text-blue-400" /></button>
                </div>

                {profile.role === 'owner' && !selectedEmployee ? (
                    <div className="space-y-3">
                        <p className="text-sm text-white/50 mb-4 ml-1 font-medium">Выберите мастера</p>
                        {employees.map((emp) => (
                            <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-indigo-500/20 active:scale-[0.98] shadow-lg relative overflow-hidden cursor-pointer group flex items-center gap-4">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl -z-10"></div>
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 shrink-0"><User className="w-6 h-6 text-indigo-400" /></div>
                                <div><h3 className="font-bold text-base text-white/90">{emp.name}</h3>{emp.specialty && <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{emp.specialty}</p>}</div>
                            </div>
                        ))}
                    </div>
                ) : !selectedService ? (
                    <div className="space-y-3">
                        {selectedEmployee && <div className="mb-4 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2"><User className="w-4 h-4"/> К мастеру: {selectedEmployee.name}</div>}
                        <p className="text-sm text-white/50 mb-4 ml-1 font-medium">Выберите услугу</p>
                        {services.map((service) => (
                            <div key={service.id} onClick={() => setSelectedService(service)} className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/10 active:scale-[0.98] shadow-lg relative overflow-hidden cursor-pointer group flex flex-col">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
                                <div className="flex justify-between items-center gap-2"><h3 className="font-bold text-base text-white/90 line-clamp-2">{service.name}</h3><span className="text-blue-300 font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 text-sm shrink-0">{service.price} ₽</span></div>
                                {service.image_urls && service.image_urls.length > 0 && (
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x mt-4">
                                        {service.image_urls.map((url: string, idx: number) => (<img key={idx} src={url} alt="portfolio" className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shrink-0 snap-center border border-white/10 shadow-md" />))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 text-center shadow-lg backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl -z-10"></div>
                            <h3 className="font-bold text-lg mb-1 text-white/90">{selectedService.name}</h3>
                            <p className="text-pink-400 font-mono text-xs bg-pink-500/10 inline-block px-2 py-1 rounded-md border border-pink-500/20">{selectedService.price} ₽</p>
                        </div>

                        {!showWaitlist ? (
                            <>
                                <p className="text-sm text-white/50 ml-1 font-medium pt-1">Выберите дату и время</p>
                                <div className="flex justify-center bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner backdrop-blur-md overflow-x-auto w-full">
                                    <style>{`.rdp { --rdp-cell-size: min(12vw, 42px); --rdp-accent-color: #3b82f6; --rdp-background-color: #1e293b; margin: 0 auto; width: 100%; max-width: 100%; display: flex; justify-content: center; } .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #2563eb; color: white; font-weight: bold; border-radius: 10px; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); border-radius: 10px; } .rdp-day { border-radius: 10px; font-size: min(4vw, 14px); } .rdp-caption_label { font-size: min(4.5vw, 16px); } .rdp-head_cell { font-size: min(3.5vw, 12px); font-weight: normal; text-transform: uppercase; color: rgba(255,255,255,0.4); }`}</style>
                                    <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={[{ before: startOfToday() }, { dayOfWeek: profile.disabled_days ? profile.disabled_days.split(',').map(Number) : [] }]} />
                                </div>

                                {selectedDate && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                                        {availableSlots.length > 0 ? availableSlots.map(t => (
                                            <button key={t} onClick={() => setSelectedTime(t)} className={`py-3 rounded-xl text-sm font-bold transition-all ${selectedTime === t ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 active:scale-95"}`}>{t}</button>
                                        )) : (
                                            <div className="col-span-3 sm:col-span-4 mt-2">
                                                <div className="text-center text-red-300/80 text-sm py-4 bg-red-900/10 border border-red-900/20 rounded-xl mb-3">На эту дату нет свободных мест</div>
                                                <button onClick={() => setShowWaitlist(true)} className="w-full bg-purple-600/20 text-purple-400 border border-purple-500/30 font-bold py-4 rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                                                    <BellRing className="w-4 h-4" /> Сообщить, если появится окно
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTime && (
                                    <form onSubmit={handleBooking} className="space-y-3 pt-4 mt-2 border-t border-white/10">
                                        <div className="space-y-2.5">
                                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500/50" placeholder="Ваше имя" /></div>
                                            <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500/50 font-mono" placeholder="+7 (999) 000-00-00" /></div>
                                        </div>
                                        <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-white text-black font-bold py-4 rounded-xl active:scale-95 text-sm flex items-center justify-center gap-2 mt-2">{bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}</button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleWaitlist} className="space-y-4 pt-4 border-t border-white/10">
                                <p className="text-sm text-white/50 mb-2">Оставьте контакты, и мы напишем в Telegram, если освободится место на {format(selectedDate!, "d MMMM", { locale: ru })}.</p>
                                <div className="space-y-2.5">
                                    <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-purple-500/50" placeholder="Ваше имя" /></div>
                                    <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-purple-500/50 font-mono" placeholder="+7 (999) 000-00-00" /></div>
                                </div>
                                <button type="submit" disabled={waitlistStatus === "submitting"} className="w-full bg-purple-600/90 text-white font-bold py-4 rounded-xl active:scale-95 text-sm flex items-center justify-center gap-2 mt-2">{waitlistStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Встать в лист ожидания"}</button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}