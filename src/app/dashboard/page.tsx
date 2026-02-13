"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Trash2, LogOut, Calendar, Copy, Plus, Loader2, 
  Link as LinkIcon, User, Briefcase, ChevronRight, 
  Clock, Check
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 

    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
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
            if (tg.setHeaderColor) tg.setHeaderColor('#000000');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
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
        await supabase.from("profiles").upsert(updates);
        setSaving(false);
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({ message: "✅ Профиль сохранен" });
        }
    };

    const handleAddService = async () => {
        if (!newName || !newPrice || !user) return;
        setAddingService(true);
        await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) });
        setNewName(""); setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            
            {/* ХЕДЕР */}
            <div className="px-5 pt-6 pb-4 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
                <h1 className="text-xl font-bold tracking-tight">Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-2 bg-[#1c1c1e] rounded-full hover:bg-red-900/20 transition-colors">
                    <LogOut className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <main className="px-4 pt-6 space-y-6">
                
                {/* ССЫЛКА */}
                <div className="bg-[#111111] p-5 rounded-3xl border border-white/5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3 text-blue-500">
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ссылка для клиента</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-[#1c1c1e] rounded-xl p-3 text-sm text-gray-300 truncate font-mono border border-white/5">
                            {profileUrl}
                        </div>
                        <button 
                            onClick={() => {navigator.clipboard.writeText(profileUrl); if(window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({message:"Ссылка скопирована"});}} 
                            className="bg-blue-600 px-4 rounded-xl font-bold flex items-center justify-center active:scale-95 transition-all"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* НАСТРОЙКИ */}
                <section className="bg-[#111111] p-5 rounded-3xl border border-white/5 space-y-5">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <User className="text-blue-500 w-5 h-5"/> Профиль
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Имя / Название</label>
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Напр. Барбершоп" className="w-full bg-[#1c1c1e] rounded-xl p-3.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600 text-sm border border-white/5" />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-1 block mb-2">Рабочие дни</label>
                        <div className="grid grid-cols-7 gap-1">
                            {DAYS.map((d) => {
                                const isWorking = !disabledDays.includes(d.id);
                                return (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} 
                                        className={`py-3 rounded-lg text-[10px] font-bold transition-all ${isWorking ? "bg-blue-600 text-white" : "bg-[#1c1c1e] text-gray-600"}`}>
                                        {d.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Начало</label>
                            <div className="relative">
                                <select value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-[#1c1c1e] rounded-xl p-3.5 outline-none text-center font-bold appearance-none text-sm border border-white/5">
                                    {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Конец</label>
                             <div className="relative">
                                <select value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-[#1c1c1e] rounded-xl p-3.5 outline-none text-center font-bold appearance-none text-sm border border-white/5">
                                    {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* УСЛУГИ */}
                <section className="bg-[#111111] p-5 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Briefcase className="text-pink-500 w-5 h-5"/> Услуги
                    </div>
                    
                    <div className="flex gap-2">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-[#1c1c1e] rounded-xl p-3.5 text-sm outline-none placeholder:text-gray-600 border border-white/5" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-[#1c1c1e] rounded-xl p-3.5 text-sm outline-none text-center placeholder:text-gray-600 border border-white/5" />
                        <button onClick={handleAddService} disabled={addingService || !newName} className="bg-pink-600 px-3.5 rounded-xl flex items-center justify-center shadow-lg shadow-pink-900/20 active:scale-95 transition-all">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-[#1c1c1e]/50 p-3.5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-medium text-sm text-gray-200">{s.name}</p>
                                    <p className="text-pink-500 text-xs font-bold mt-0.5">{s.price} ₽</p>
                                </div>
                                <button onClick={async () => { if(confirm("Удалить?")) { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }}} className="text-gray-600 hover:text-red-500 p-2 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ЗАПИСИ */}
                <section className="bg-[#111111] p-5 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Calendar className="text-emerald-500 w-5 h-5"/> Записи
                    </div>
                    <div className="space-y-2">
                        {appointments.length === 0 ? <p className="text-center text-gray-700 text-xs py-4">Пока нет записей</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-gradient-to-br from-[#1c1c1e] to-[#111111] rounded-2xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-500 font-bold text-lg font-mono">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-sm font-medium text-gray-200">{app.client_name}</div>
                                    <div className="text-gray-500 text-[10px] font-bold mt-1 bg-black/30 inline-block px-2 py-0.5 rounded text-center">{format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.service?.name}</div>
                                </div>
                                <button onClick={async () => { if(confirm("Удалить?")) { await supabase.from("appointments").delete().eq("id", app.id); loadData(user.id); }}} className="text-gray-600 hover:text-red-500 p-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* ПЛАВАЮЩАЯ КНОПКА СОХРАНЕНИЯ */}
            <div className="fixed bottom-6 left-4 right-4 z-50">
                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}
                </button>
            </div>
        </div>
    );
}