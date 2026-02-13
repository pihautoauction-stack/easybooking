"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Trash2, LogOut, Calendar, Copy, Plus, Loader2, 
  Link as LinkIcon, User, Briefcase, ChevronRight, 
  Clock, Check, Settings2, Bell
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    // Состояние профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Поля ввода
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#0f172a');
        }

        const init = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push("/login");
                return;
            }
            setUser(authUser);

            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tgId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
                if (tgId) setTelegramChatId(tgId.toString());
            }

            await loadData(authUser.id);
            setLoading(false);
        };
        init();
    }, [router]);

    const loadData = async (userId: string) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            if (p.telegram_chat_id) setTelegramChatId(p.telegram_chat_id);
            setWorkStart(p.work_start_hour || 9);
            setWorkEnd(p.work_end_hour || 21);
            if (p.disabled_days) {
                setDisabledDays(p.disabled_days.split(',').filter((d: string) => d !== "").map(Number));
            }
        }

        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);

        const { data: a } = await supabase.from("appointments")
            .select(`id, client_name, client_phone, start_time, service:services (name)`)
            .eq("master_id", userId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        setAppointments(a || []);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        const updates = {
            id: user.id,
            business_name: businessName,
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };

        const { error } = await supabase.from("profiles").upsert(updates);
        setSaving(false);
        
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: error ? "Ошибка" : "Успешно",
                message: error ? error.message : "Ваш профиль обновлен!",
                buttons: [{ type: "ok", text: "Отлично" }]
            });
        }
    };

    const handleAddService = async () => {
        if (!newName || !newPrice || !user) return;
        setAddingService(true);
        await supabase.from("services").insert({ 
            user_id: user.id, 
            name: newName, 
            price: Number(newPrice) 
        });
        setNewName(""); 
        setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => 
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4 text-blue-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-medium animate-pulse">Загружаем кабинет...</p>
        </div>
    );

    const profileUrl = `${window.location.origin}/book/${user?.id}`;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30 pb-32">
            
            {/* Header */}
            <header className="px-6 pt-10 pb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        EasyBooking
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        Control Center
                    </p>
                </div>
                <button 
                    onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                    className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all shadow-xl"
                >
                    <LogOut className="w-5 h-5 text-slate-400" />
                </button>
            </header>

            <main className="px-4 space-y-6">
                
                {/* Booking Link Card */}
                <div className="relative group overflow-hidden bg-gradient-to-br from-blue-600/20 to-indigo-600/10 p-6 rounded-[32px] border border-white/10 shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <LinkIcon className="w-12 h-12" />
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <Bell className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ваша визитка</span>
                    </div>
                    <div className="flex gap-2 relative z-10">
                        <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl p-4 text-[13px] text-blue-200 truncate font-mono border border-white/5 shadow-inner">
                            {profileUrl}
                        </div>
                        <button 
                            onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}}
                            className="bg-blue-500 hover:bg-blue-400 text-white px-5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Profile Settings */}
                <section className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 border border-white/5 space-y-6 shadow-xl">
                    <h2 className="text-lg font-bold flex items-center gap-3">
                        <Settings2 className="text-blue-400 w-5 h-5"/> Настройки мастера
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] text-slate-500 font-black uppercase ml-1">Название студии / Имя</label>
                            <input 
                                value={businessName} 
                                onChange={e => setBusinessName(e.target.value)} 
                                placeholder="Напр. Barber Studio" 
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 transition-all text-sm placeholder:text-slate-700 shadow-inner" 
                            />
                        </div>

                        <div>
                            <label className="text-[11px] text-slate-500 font-black uppercase ml-1 block mb-3">Рабочие дни</label>
                            <div className="grid grid-cols-7 gap-1.5">
                                {DAYS.map((d) => {
                                    const isWorking = !disabledDays.includes(d.id);
                                    return (
                                        <button 
                                            key={d.id} 
                                            onClick={() => toggleDay(d.id)}
                                            className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                                                isWorking 
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" 
                                                : "bg-slate-900/40 border-white/5 text-slate-600"
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <div className="flex-1 space-y-2">
                                <label className="text-[11px] text-slate-500 font-black uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> С</label>
                                <select 
                                    value={workStart} 
                                    onChange={e => setWorkStart(Number(e.target.value))}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 outline-none appearance-none font-bold text-center text-sm shadow-inner"
                                >
                                    {[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f172a]">{i}:00</option>)}
                                </select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[11px] text-slate-500 font-black uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> До</label>
                                <select 
                                    value={workEnd} 
                                    onChange={e => setWorkEnd(Number(e.target.value))}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 outline-none appearance-none font-bold text-center text-sm shadow-inner"
                                >
                                    {[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f172a]">{i}:00</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 border border-white/5 shadow-xl">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                        <Briefcase className="text-pink-400 w-5 h-5"/> Мои Услуги
                    </h2>
                    <div className="flex gap-2 mb-6">
                        <input 
                            value={newName} 
                            onChange={e => setNewName(e.target.value)} 
                            placeholder="Название" 
                            className="flex-[2] bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-pink-500/30 transition-all shadow-inner" 
                        />
                        <input 
                            value={newPrice} 
                            onChange={e => setNewPrice(e.target.value)} 
                            placeholder="₽" 
                            type="number" 
                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-pink-500/30 transition-all text-center shadow-inner" 
                        />
                        <button 
                            onClick={handleAddService} 
                            disabled={addingService || !newName}
                            className="bg-pink-500 hover:bg-pink-400 p-4 rounded-2xl active:scale-90 transition-all shadow-lg shadow-pink-500/20"
                        >
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {services.map(s => (
                            <div key={s.id} className="group flex justify-between items-center bg-slate-900/40 p-4 rounded-[24px] border border-white/5 hover:border-white/10 transition-all">
                                <div>
                                    <p className="font-bold text-sm text-slate-100">{s.name}</p>
                                    <p className="text-emerald-400 text-xs font-black tracking-tight mt-0.5">{s.price} ₽</p>
                                </div>
                                <button 
                                    onClick={async () => { if(confirm("Удалить услугу?")) { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }}}
                                    className="p-2 text-slate-700 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Appointments Section */}
                <section className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 border border-white/5 shadow-xl">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                        <Calendar className="text-emerald-400 w-5 h-5"/> Предстоящие записи
                    </h2>
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <div className="text-center py-10 opacity-30">
                                <Calendar className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Записей пока нет</p>
                            </div>
                        ) : appointments.map(app => (
                            <div key={app.id} className="p-5 bg-gradient-to-r from-slate-900/60 to-slate-900/30 rounded-[28px] border border-white/5 flex justify-between items-center">
                                <div className="space-y-1.5">
                                    <div className="text-emerald-400 font-black text-2xl font-mono leading-none tracking-tighter">
                                        {format(new Date(app.start_time), "HH:mm")}
                                    </div>
                                    <div className="font-bold text-[13px] text-slate-200">{app.client_name}</div>
                                    <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-500/20">
                                        <Check className="w-2.5 h-2.5" /> {app.service?.name}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-slate-500 text-[10px] font-bold">{format(new Date(app.start_time), "d MMM", { locale: ru })}</span>
                                    <button 
                                        onClick={async () => { if(confirm("Удалить запись?")) { await supabase.from("appointments").delete().eq("id", app.id); loadData(user.id); }}}
                                        className="p-2 text-slate-800 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Bottom Action Area */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent pointer-events-none">
                <button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="pointer-events-auto w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-5 rounded-[24px] font-black text-lg shadow-[0_20px_40px_rgba(37,99,235,0.2)] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                            <Check className="w-5 h-5" />
                            <span>Сохранить профиль</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}