"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, ChevronLeft, User, Phone, CalendarDays, BellRing, Clock, Folder, FolderOpen } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { useRouter } from "next/navigation";
import "react-day-picker/dist/style.css";

const supabase = createClient();

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

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq(isUUID ? "id" : "username", id)
                .single();

            if (profileData) {
                if (typeof profileData.portfolio_urls === 'string') {
                    profileData.portfolio_urls = JSON.parse(profileData.portfolio_urls);
                }

                if (typeof profileData.weekly_settings === 'string') {
                    profileData.weekly_settings = JSON.parse(profileData.weekly_settings);
                }

                // Парсим социальные сети для вывода
                if (typeof profileData.social_links === 'string') {
                    try { profileData.social_links = JSON.parse(profileData.social_links); } catch (e) { }
                }

                setProfile(profileData);
                const { data: servicesData } = await supabase.from("services").select("*").eq("user_id", profileData.id);
                setServices(servicesData || []);

                if (profileData.role === 'owner') {
                    const { data: empData } = await supabase.from("employees").select("*").eq("salon_id", profileData.id);
                    setEmployees(empData || []);
                }
            }

            setClientName(localStorage.getItem('nx_name') || "");
            setClientPhone(localStorage.getItem('nx_phone') || "");
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
            const startDay = new Date(selectedDate); startDay.setHours(0, 0, 0, 0);
            const endDay = new Date(selectedDate); endDay.setHours(23, 59, 59, 999);
            const dayOfWeek = startDay.getDay();

            let query = supabase.from("appointments").select("start_time, service:services(duration)").eq("master_id", profile.id).gte("start_time", startDay.toISOString()).lte("start_time", endDay.toISOString()).eq("status", "active");
            if (selectedEmployee) query = query.eq("employee_id", selectedEmployee.id);
            const { data: busy } = await query;

            const busyIntervals = (busy || []).map(b => {
                const d = new Date(b.start_time);
                const startMins = d.getHours() * 60 + d.getMinutes();
                const serviceData = b.service as any;
                const duration = (Array.isArray(serviceData) ? serviceData[0]?.duration : serviceData?.duration) || 60;
                return { start: startMins, end: startMins + duration };
            });

            const rawBreaks = typeof profile.breaks === 'string' ? JSON.parse(profile.breaks) : (profile.breaks || []);
            const breakIntervals = rawBreaks.map((br: any) => {
                const [sH, sM] = br.start.split(':').map(Number);
                const [eH, eM] = br.end.split(':').map(Number);
                return { start: sH * 60 + sM, end: eH * 60 + eM };
            });

            let wStartH, wStartM, wEndH, wEndM;

            if (profile.weekly_settings && profile.weekly_settings[dayOfWeek] && profile.weekly_settings[dayOfWeek].active) {
                [wStartH, wStartM] = profile.weekly_settings[dayOfWeek].start.split(':').map(Number);
                [wEndH, wEndM] = profile.weekly_settings[dayOfWeek].end.split(':').map(Number);
            } else {
                [wStartH, wStartM] = (profile.work_start_time || "09:00").split(':').map(Number);
                [wEndH, wEndM] = (profile.work_end_time || "20:00").split(':').map(Number);
            }

            const workStartMins = wStartH * 60 + wStartM;
            const workEndMins = wEndH * 60 + wEndM;

            const step = profile.schedule_step || 30;
            const serviceDuration = selectedService.duration || 60;

            const slots: string[] = [];
            let currentMins = workStartMins;

            const isToday = startDay.toDateString() === now.toDateString();
            const currentNowMins = now.getHours() * 60 + now.getMinutes();

            while (currentMins + serviceDuration <= workEndMins) {
                const slotStart = currentMins;
                const slotEnd = currentMins + serviceDuration;
                let isValid = true;

                if (isToday && slotStart <= currentNowMins) isValid = false;

                if (isValid) {
                    for (const b of busyIntervals) {
                        if (slotStart < b.end && slotEnd > b.start) { isValid = false; break; }
                    }
                }
                if (isValid) {
                    for (const br of breakIntervals) {
                        if (slotStart < br.end && slotEnd > br.start) { isValid = false; break; }
                    }
                }

                if (isValid) {
                    const h = Math.floor(slotStart / 60).toString().padStart(2, '0');
                    const m = (slotStart % 60).toString().padStart(2, '0');
                    slots.push(`${h}:${m}`);
                }
                currentMins += step;
            }
            setAvailableSlots(slots);
        };
        generateSlots();
    }, [selectedDate, profile, selectedEmployee, selectedService]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTime || !profile) return;
        setBookingStatus("submitting");

        localStorage.setItem('nx_name', clientName);
        localStorage.setItem('nx_phone', clientPhone);

        const [h, m] = selectedTime.split(":").map(Number);
        const startDateTime = new Date(selectedDate!);
        startDateTime.setHours(h, m, 0, 0);
        const startTimeStr = startDateTime.toISOString();

        let busyQuery = supabase.from("appointments").select("id").eq("master_id", profile.id).eq("start_time", startTimeStr).eq("status", "active");
        if (selectedEmployee) busyQuery = busyQuery.eq("employee_id", selectedEmployee.id);
        const { data: busy } = await busyQuery.maybeSingle();

        if (busy) { setBookingStatus("conflict"); return; }

        const { error } = await supabase.from("appointments").insert({
            master_id: profile.id, service_id: selectedService.id, employee_id: selectedEmployee?.id,
            client_name: clientName, client_phone: clientPhone, start_time: startTimeStr, status: 'active'
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

        localStorage.setItem('nx_name', clientName);
        localStorage.setItem('nx_phone', clientPhone);

        const { error } = await supabase.from('waitlist').insert({
            master_id: profile.id, date: selectedDate.toISOString(), client_name: clientName, client_phone: clientPhone
        });

        if (!error) setWaitlistStatus("success");
        else alert("Ошибка. Попробуйте позже.");
    };

    const resetBooking = () => {
        setBookingStatus("idle"); setSelectedEmployee(null); setSelectedService(null);
        setSelectedDate(undefined); setSelectedTime(null); setShowWaitlist(false); setWaitlistStatus("idle");
    };

    const handleBack = () => {
        if (showWaitlist) setShowWaitlist(false);
        else if (selectedDate) { setSelectedDate(undefined); setSelectedTime(null); }
        else if (selectedService) setSelectedService(null);
        else if (selectedEmployee) setSelectedEmployee(null);
    };

    const toggleCategory = (cat: string) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

    if (loading) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>;
    if (!profile) return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-stone-500 font-bold">Профиль не найден. Возможно, ссылка устарела.</div>;

    if (bookingStatus === "success") {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center text-stone-800 p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[340px] flex flex-col items-center bg-white p-8 rounded-[32px] shadow-sm border border-stone-100">
                    <div className="bg-emerald-50 p-6 rounded-full mb-6 border border-emerald-100"><CheckCircle className="w-16 h-16 text-emerald-500" /></div>
                    <h1 className="text-2xl font-black mb-3 tracking-tight text-stone-900">Вы успешно записаны</h1>
                    <p className="text-stone-500 mb-8 text-sm font-bold leading-relaxed">
                        Ждем вас <span className="text-stone-900">{format(selectedDate!, "d MMMM", { locale: ru })} в {selectedTime}</span>
                        {selectedEmployee && <><br /><span className="text-rose-500 mt-2 block">Специалист: {selectedEmployee.name}</span></>}
                    </p>
                    <div className="space-y-3 w-full">
                        <button onClick={() => router.push('/my-bookings')} className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-black py-4 rounded-2xl active:scale-[0.97] transition-all shadow-md shadow-rose-500/20">Мои записи</button>
                    </div>
                </div>
            </div>
        );
    }

    if (waitlistStatus === "success") {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center text-stone-800 p-6 font-sans text-center antialiased">
                <div className="w-full max-w-[340px] flex flex-col items-center bg-white p-8 rounded-[32px] shadow-sm border border-stone-100">
                    <div className="bg-orange-50 p-6 rounded-full mb-6 border border-orange-100"><BellRing className="w-16 h-16 text-orange-400" /></div>
                    <h1 className="text-2xl font-black mb-3 tracking-tight text-stone-900">Вы в листе ожидания</h1>
                    <p className="text-stone-500 mb-8 text-sm font-bold leading-relaxed">Если появится окно на <span className="text-stone-900">{format(selectedDate!, "d MMMM", { locale: ru })}</span>, мы свяжемся с вами.</p>
                    <button onClick={resetBooking} className="w-full bg-stone-100 text-stone-700 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all hover:bg-stone-200">Вернуться в начало</button>
                </div>
            </div>
        );
    }

    const filteredServices = services.filter(service => {
        if (selectedEmployee) return !service.employee_id || service.employee_id === selectedEmployee.id;
        return true;
    });

    const groupedServices = filteredServices.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Общие';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {});

    // Безопасный парсинг ссылок
    const sLinks = profile?.social_links || {};

    return (
        <div
            className="min-h-screen bg-[#FAF9F6] text-stone-800 px-4 sm:px-5 pb-4 font-sans flex flex-col antialiased"
            style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}
        >
            <div className="max-w-md mx-auto w-full space-y-6 flex-1">

                {/* HEADER КЛИЕНТА (Название бизнеса) */}
                <div className="flex items-center gap-3 pt-2">
                    {(selectedEmployee || selectedService || showWaitlist) && (
                        <button onClick={handleBack} className="p-3 bg-white rounded-full border border-stone-200 shadow-sm active:scale-95 shrink-0 transition-all text-stone-600"><ChevronLeft className="w-5 h-5" /></button>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-black tracking-tight text-stone-900 truncate">{profile.business_name}</h1>
                        <p className="text-[11px] text-rose-500 font-bold tracking-widest mt-0.5 uppercase">Онлайн-запись</p>
                    </div>
                    <button onClick={() => router.push('/my-bookings')} className="p-3 bg-rose-50 rounded-full border border-rose-100 active:scale-95 transition-all shrink-0"><CalendarDays className="w-5 h-5 text-rose-500" /></button>
                </div>

                {/* БЛОК: СОЦИАЛЬНЫЕ СЕТИ (Появляется, если заполнена хотя бы одна) */}
                {(!selectedEmployee && !selectedService && !showWaitlist) && (sLinks.whatsapp || sLinks.telegram || sLinks.instagram || sLinks.vk) && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in duration-500 -mt-2 mb-2">
                        {sLinks.whatsapp && (
                            <a href={sLinks.whatsapp.startsWith('http') ? sLinks.whatsapp : `https://${sLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/20 transition-colors">
                                WhatsApp
                            </a>
                        )}
                        {sLinks.telegram && (
                            <a href={sLinks.telegram.startsWith('http') ? sLinks.telegram : `https://${sLinks.telegram}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-[#229ED9]/10 text-[#229ED9] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#229ED9]/20 transition-colors">
                                Telegram
                            </a>
                        )}
                        {sLinks.instagram && (
                            <a href={sLinks.instagram.startsWith('http') ? sLinks.instagram : `https://${sLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">
                                Instagram
                            </a>
                        )}
                        {sLinks.vk && (
                            <a href={sLinks.vk.startsWith('http') ? sLinks.vk : `https://${sLinks.vk}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-[#0077FF]/10 text-[#0077FF] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0077FF]/20 transition-colors">
                                ВКонтакте
                            </a>
                        )}
                    </div>
                )}

                {/* БЛОК: ПОРТФОЛИО */}
                {profile?.portfolio_urls && profile.portfolio_urls.length > 0 && !selectedService && !showWaitlist && (
                    <div className="mb-6 animate-in fade-in duration-500">
                        <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-3 ml-2 font-black">Галерея работ</p>
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
                            {profile.portfolio_urls.map((url: string, idx: number) => (
                                <img key={idx} src={url} alt="Работа мастера" className="w-40 h-40 md:w-48 md:h-48 object-cover rounded-[24px] shadow-sm border border-stone-100 shrink-0 snap-center" />
                            ))}
                        </div>
                    </div>
                )}

                {profile.role === 'owner' && !selectedEmployee ? (
                    <div className="space-y-3">
                        <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-3 ml-2 font-black">1. Выберите специалиста</p>
                        {employees.map((emp) => (
                            <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white rounded-[28px] p-5 border border-stone-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-4 hover:border-rose-200">
                                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100"><User className="w-6 h-6 text-rose-400" /></div>
                                <div><h3 className="font-black text-base text-stone-900">{emp.name}</h3>{emp.specialty && <p className="text-xs text-rose-400 font-bold mt-1">{emp.specialty}</p>}</div>
                            </div>
                        ))}
                    </div>
                ) : !selectedService ? (
                    <div className="space-y-4">
                        {selectedEmployee && <div className="bg-rose-50 p-4 rounded-2xl text-sm text-rose-600 font-bold flex items-center gap-2 border border-rose-100 shadow-sm"><User className="w-5 h-5" /> Выбран мастер: {selectedEmployee.name}</div>}
                        <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-3 ml-2 font-black">Выберите услугу</p>

                        {Object.keys(groupedServices).length === 0 ? <p className="text-stone-400 text-sm font-bold pl-2">Услуг пока нет</p> :
                            (Object.entries(groupedServices) as [string, any[]][]).map(([category, items]) => (
                                <div key={category} className="mb-3 bg-white rounded-[28px] border border-stone-100 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-5 hover:bg-stone-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {expandedCategories[category] ? <FolderOpen className="w-5 h-5 text-rose-400" /> : <Folder className="w-5 h-5 text-stone-400" />}
                                            <span className="font-black text-stone-900 text-lg">{category}</span>
                                        </div>
                                        <span className="bg-stone-100 text-stone-500 px-2.5 py-1 rounded-lg text-xs font-black">{items.length}</span>
                                    </button>

                                    {expandedCategories[category] && (
                                        <div className="px-3 pb-3 pt-1 space-y-2 animate-in fade-in slide-in-from-top-2">
                                            {items.map(service => (
                                                <div key={service.id} onClick={() => setSelectedService(service)} className="bg-stone-50 rounded-[24px] p-4 border border-stone-100 active:scale-[0.98] transition-all cursor-pointer flex flex-col group hover:border-rose-200 hover:bg-white shadow-sm">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <h3 className="font-black text-base text-stone-900 leading-tight group-hover:text-rose-500 transition-colors">{service.name}</h3>
                                                        <span className="text-stone-900 font-black bg-white px-3 py-1.5 rounded-xl text-sm shrink-0 border border-stone-200 shadow-sm">{service.price} ₽</span>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                                                        <Clock className="w-3.5 h-3.5" /> {service.duration || 60} мин.
                                                    </div>
                                                    {service.image_urls && service.image_urls.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x mt-3">
                                                            {service.image_urls.map((url: string, idx: number) => (<img key={idx} src={url} alt="Услуга" className="w-16 h-16 object-cover rounded-xl shrink-0 snap-center shadow-sm border border-stone-100" />))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm flex justify-between items-center gap-4">
                            <div>
                                <h3 className="font-black text-lg text-stone-900 leading-tight">{selectedService.name}</h3>
                                <p className="text-stone-400 text-xs font-bold mt-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedService.duration || 60} мин.</p>
                            </div>
                            <span className="text-stone-900 font-black bg-stone-50 border border-stone-200 px-4 py-2 rounded-2xl text-base">{selectedService.price} ₽</span>
                        </div>

                        {!showWaitlist ? (
                            <>
                                <p className="text-[11px] text-stone-400 uppercase tracking-widest ml-2 font-black">Выберите дату и время</p>
                                <div className="bg-white rounded-[32px] p-5 border border-stone-100 shadow-sm overflow-x-auto w-full flex justify-center">
                                    <style>{`.rdp { --rdp-cell-size: min(12vw, 42px); --rdp-accent-color: #f43f5e; --rdp-background-color: #FAF9F6; margin: 0 auto; width: 100%; max-width: 100%; display: flex; justify-content: center; font-family: inherit; } .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: var(--rdp-accent-color); color: white; font-weight: 800; border-radius: 12px; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--rdp-background-color); border-radius: 12px; color: #f43f5e; } .rdp-day { border-radius: 12px; font-size: min(4vw, 15px); font-weight: 700; color: #292524; } .rdp-caption_label { font-size: min(4.5vw, 17px); font-weight: 800; color: #292524; } .rdp-head_cell { font-size: min(3.5vw, 13px); font-weight: 800; color: #78716c; text-transform: uppercase; } .rdp-day_outside { color: #d6d3d1; } .rdp-day_disabled { color: #e7e5e4; opacity: 0.5; }`}</style>
                                    <DayPicker
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        locale={ru}
                                        disabled={[
                                            { before: startOfToday() },
                                            (date) => {
                                                if (profile?.weekly_settings) {
                                                    const daySetting = profile.weekly_settings[date.getDay()];
                                                    if (daySetting) return !daySetting.active;
                                                }
                                                return profile?.disabled_days ? profile.disabled_days.split(',').map(Number).includes(date.getDay()) : false;
                                            }
                                        ]}
                                    />
                                </div>

                                {selectedDate && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2 animate-in fade-in slide-in-from-bottom-2">
                                        {availableSlots.length > 0 ? availableSlots.map(t => (
                                            <button key={t} onClick={() => setSelectedTime(t)} className={`py-4 rounded-2xl text-sm font-black transition-all ${selectedTime === t ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-rose-200 active:scale-95 shadow-sm"}`}>{t}</button>
                                        )) : (
                                            <div className="col-span-3 sm:col-span-4 mt-2">
                                                <div className="text-center text-rose-500 font-bold text-sm py-4 bg-rose-50 border border-rose-100 rounded-2xl mb-3 shadow-sm">Нет свободных мест</div>
                                                <button onClick={() => setShowWaitlist(true)} className="w-full bg-white border border-stone-200 text-stone-900 font-black py-4 rounded-2xl active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-stone-50">
                                                    <BellRing className="w-5 h-5 text-rose-400" /> Сообщить, если освободится
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTime && (
                                    <form onSubmit={handleBooking} className="space-y-4 pt-6 mt-6 border-t border-stone-200 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-3">
                                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400 shadow-sm" placeholder="Ваше имя" /></div>
                                            <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400 shadow-sm" placeholder="+7 (999) 000-00-00" /></div>
                                        </div>

                                        {bookingStatus === "conflict" && <p className="text-orange-500 font-bold text-sm text-center bg-orange-50 py-3 rounded-xl border border-orange-100">Это время только что заняли. Выберите другое.</p>}

                                        <button type="submit" disabled={bookingStatus === "submitting"} className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-black py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50 mt-2">{bookingStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Подтвердить запись"}</button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleWaitlist} className="space-y-5 pt-6 mt-6 border-t border-stone-200 animate-in fade-in">
                                <p className="text-sm text-stone-500 font-bold mb-2 leading-relaxed">Оставьте контакты, и мы сообщим вам, если освободится место на <span className="text-stone-900">{format(selectedDate!, "d MMMM", { locale: ru })}</span>.</p>
                                <div className="space-y-3">
                                    <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" /><input required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all placeholder-stone-400 shadow-sm" placeholder="Ваше имя" /></div>
                                    <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" /><input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all placeholder-stone-400 shadow-sm" placeholder="+7 (999) 000-00-00" /></div>
                                </div>
                                <button type="submit" disabled={waitlistStatus === "submitting"} className="w-full bg-orange-400 text-white font-black py-4 rounded-2xl active:scale-[0.97] text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-orange-500/20 mt-2">{waitlistStatus === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Встать в лист ожидания"}</button>
                            </form>
                        )}
                    </div>
                )}

                {/* NEXIO BRANDING FOOTER */}
                <div className="pt-10 pb-8 flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center">
                        <img src="/logo.svg" alt="Nexio Logo" className="w-8 h-8 mb-2 grayscale opacity-80" />
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Powered by Nexio</span>
                    </div>
                </div>
            </div>
        </div>
    );
}