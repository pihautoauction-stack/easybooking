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
            // Устанавливаем правильные цвета хедера и фона
            if (tg.setHeaderColor) tg.setHeaderColor('#0f172a');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#0f172a');
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
        
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: error ? "Ошибка" : "Успешно",
                message: error ? error.message : "Профиль сохранен!",
                buttons: [{ type: "ok" }]
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
        </div>
    );

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30 pb-32">
            
            {/* Header */}
            <header className="px-5 pt-6 pb-4 flex justify-between items-center bg-[#0f172a] sticky top-0 z-50 border-b border-white/5">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        EasyBooking
                    </h1>
                </div>
                <button 
                    onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                    className="p-2 bg-slate-800/50 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="px-4 pt-6 space-y-6">
                
                {/* Ссылка (Визитка) */}
                <div className="relative group overflow-hidden bg-gradient-to-br from-blue-900/40 to-indigo-900/40 p-5 rounded-3xl border border-white/10 shadow-lg">
                    <div className="flex items-center gap-2 mb-3 text-blue-300">
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Ваша ссылка</span>
                    </div>
                    <div className="flex gap-2 relative z-10">
                        <div className="flex-1 bg-black/30 backdrop-blur-md rounded-xl p-3 text-sm text-blue-100 truncate font-mono border border-white/5">
                            {profileUrl}
                        </div>
                        <button 
                            onClick={() => {navigator.clipboard.writeText(profileUrl); if(window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({message:"Ссылка скопирована!"});}}
                            className="bg-blue-500 hover:bg-blue-400 text-white px-4 rounded-xl active:scale-95 transition-all font-bold"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Настройки Профиля */}
                <section className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl space-y-5">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <User className="text-blue-400 w-5 h-5"/> Профиль
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Название / Имя</label>
                            <input 
                                value={businessName} 
                                onChange={e => setBusinessName(e.target.value)} 
                                placeholder="Напр. Барбершоп TopGun" 
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-blue-500/50 transition-all text-sm placeholder:text-slate-600" 
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1 block mb-2">Рабочие дни</label>
                            <div className="grid grid-cols-7 gap-1">
                                {DAYS.map((d) => {
                                    const isWorking = !disabledDays.includes(d.id);
                                    return (
                                        <button 
                                            key={d.id} 
                                            onClick={() => toggleDay(d.id)}
                                            className={`py-2.5 rounded-lg text-[10px] font-bold transition-all border ${
                                                isWorking 
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                                : "bg-slate-950 border-transparent text-slate-600"
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> С</label>
                                <div className="relative">
                                    <select 
                                        value={workStart} 
                                        onChange={e => setWorkStart(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 outline-none appearance-none font-bold text-center text-sm"
                                    >
                                        {[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f172a]">{i}:00</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none"><ChevronRight className="w-3 h-3 text-slate-600 rotate-90"/></div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> До</label>
                                <div className="relative">
                                    <select 
                                        value={workEnd} 
                                        onChange={e => setWorkEnd(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 outline-none appearance-none font-bold text-center text-sm"
                                    >
                                        {[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f172a]">{i}:00</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none"><ChevronRight className="w-3 h-3 text-slate-600 rotate-90"/></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Услуги */}
                <section className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Briefcase className="text-pink-400 w-5 h-5"/> Услуги
                    </h2>
                    
                    <div className="flex gap-2 mb-5">
                        <input 
                            value={newName} 
                            onChange={e => setNewName(e.target.value)} 
                            placeholder="Название" 
                            className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm outline-none focus:border-pink-500/30 transition-all" 
                        />
                        <input 
                            value={newPrice} 
                            onChange={e => setNewPrice(e.target.value)} 
                            placeholder="₽" 
                            type="number" 
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm outline-none focus:border-pink-500/30 transition-all text-center" 
                        />
                        <button 
                            onClick={handleAddService} 
                            disabled={addingService || !newName}
                            className="bg-pink-600 hover:bg-pink-500 p-3.5 rounded-xl active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-pink-600/20"
                        >
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-5 h-5 text-white" />}
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {services.length === 0 && <p className="text-center text-slate-600 text-xs py-4">Нет услуг</p>}
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-950/50 p-3.5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-semibold text-sm text-slate-100">{s.name}</p>
                                    <p className="text-emerald-400 text-xs font-bold mt-0.5">{s.price} ₽</p>
                                </div>
                                <button 
                                    onClick={async () => { if(confirm("Удалить услугу?")) { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }}}
                                    className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Записи */}
                <section className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calendar className="text-emerald-400 w-5 h-5"/> Записи
                    </h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? (
                            <div className="text-center py-6 text-slate-600">
                                <p className="text-xs">Записей пока нет</p>
                            </div>
                        ) : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-black text-lg font-mono tracking-tight">
                                        {format(new Date(app.start_time), "HH:mm")}
                                    </div>
                                    <div className="font-bold text-sm text-slate-200">{app.client_name}</div>
                                    <div className="text-slate-500 text-[10px] uppercase font-bold mt-0.5">{app.service?.name}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-slate-500 text-[10px] font-bold bg-slate-950 px-2 py-1 rounded-md">{format(new Date(app.start_time), "d MMM", { locale: ru })}</span>
                                    <button 
                                        onClick={async () => { if(confirm("Удалить запись?")) { await supabase.from("appointments").delete().eq("id", app.id); loadData(user.id); }}}
                                        className="text-slate-600 hover:text-red-400 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Плавающая кнопка сохранения */}
            <div className="fixed bottom-4 left-4 right-4 z-40">
                <button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}
                </button>
            </div>
        </div>
    );
}