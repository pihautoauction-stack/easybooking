"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Trash2, LogOut, Calendar, Copy, Plus, Loader2, 
  Link as LinkIcon, User, Briefcase, Clock 
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
            // Черный хедер, чтобы сливался с фоном
            if (tg.setHeaderColor) tg.setHeaderColor('#000000');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
        }

        const init = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) { router.push("/login"); return; }
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
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').filter((d: string) => d !== "").map(Number));
        }
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);
        const { data: a } = await supabase.from("appointments").select(`*, service:services (name)`).eq("master_id", userId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
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
            window.Telegram.WebApp.showPopup({ message: "✅ Сохранено" });
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
            {/* ШАПКА */}
            <header className="px-5 pt-6 pb-4 flex justify-between items-center bg-black/80 backdrop-blur sticky top-0 z-50">
                <h1 className="text-xl font-bold">Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-2 bg-[#1c1c1e] rounded-full text-gray-400">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="px-4 space-y-6">
                {/* ССЫЛКА */}
                <div className="bg-[#111] p-5 rounded-3xl">
                    <div className="flex items-center gap-2 mb-3 text-blue-500 text-xs font-bold uppercase">
                        <LinkIcon className="w-4 h-4" /> Ваша ссылка
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-[#1c1c1e] rounded-xl p-3 text-sm text-gray-300 truncate font-mono">
                            {profileUrl}
                        </div>
                        <button onClick={() => {navigator.clipboard.writeText(profileUrl); if(window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({message:"Скопировано"});}} className="bg-blue-600 px-4 rounded-xl flex items-center justify-center font-bold">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* НАСТРОЙКИ */}
                <section className="bg-[#111] p-5 rounded-3xl space-y-5">
                    <h2 className="text-lg font-bold flex items-center gap-2"><User className="text-blue-500 w-5 h-5"/> Профиль</h2>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Имя / Студия</label>
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название" className="w-full bg-[#1c1c1e] rounded-xl p-3.5 text-white placeholder:text-gray-600 text-sm" />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-1 block mb-2">График работы</label>
                        <div className="grid grid-cols-7 gap-1">
                            {DAYS.map((d) => (
                                <button key={d.id} onClick={() => toggleDay(d.id)} 
                                    className={`py-3 rounded-lg text-[10px] font-bold ${!disabledDays.includes(d.id) ? "bg-blue-600 text-white" : "bg-[#1c1c1e] text-gray-600"}`}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Начало</label>
                            <select value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-[#1c1c1e] rounded-xl p-3.5 text-center font-bold text-sm appearance-none">
                                {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                            </select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Конец</label>
                            <select value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-[#1c1c1e] rounded-xl p-3.5 text-center font-bold text-sm appearance-none">
                                {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                {/* УСЛУГИ */}
                <section className="bg-[#111] p-5 rounded-3xl space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Briefcase className="text-pink-500 w-5 h-5"/> Услуги</h2>
                    <div className="flex gap-2">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Услуга" className="flex-[2] bg-[#1c1c1e] rounded-xl p-3.5 text-sm placeholder:text-gray-600" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-[#1c1c1e] rounded-xl p-3.5 text-sm text-center placeholder:text-gray-600" />
                        <button onClick={handleAddService} disabled={addingService || !newName} className="bg-pink-600 px-4 rounded-xl flex items-center justify-center">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-[#1c1c1e] p-3.5 rounded-xl">
                                <div><p className="font-medium text-sm">{s.name}</p><p className="text-pink-500 text-xs font-bold">{s.price} ₽</p></div>
                                <button onClick={() => { if(confirm("Удалить?")) { supabase.from("services").delete().eq("id", s.id).then(() => loadData(user.id)) }}} className="text-gray-600 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ЗАПИСИ */}
                <section className="bg-[#111] p-5 rounded-3xl space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="text-emerald-500 w-5 h-5"/> Записи</h2>
                    <div className="space-y-2">
                        {appointments.length === 0 ? <p className="text-center text-gray-700 text-xs py-4">Нет записей</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-[#1c1c1e] rounded-2xl flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-500 font-bold text-lg">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-sm text-gray-200">{app.client_name}</div>
                                    <div className="text-gray-600 text-[10px] uppercase font-bold mt-1">{format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.service?.name}</div>
                                </div>
                                <button onClick={() => { if(confirm("Удалить?")) { supabase.from("appointments").delete().eq("id", app.id).then(() => loadData(user.id)) }}} className="text-gray-600 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed bottom-6 left-4 right-4 z-50">
                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}
                </button>
            </div>
        </div>
    );
}