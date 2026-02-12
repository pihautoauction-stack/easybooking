"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Поля профиля
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState(""); 
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [profileUrl, setProfileUrl] = useState("");     
    
    // График
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Новая услуга
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS_OF_WEEK = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUser(user);
            await loadData(user.id);
            setLoading(false);
        };
        checkUser();
    }, [router]);

    const loadData = async (userId: string) => {
        // Профиль
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            setUsername(p.username || "");
            setTelegramChatId(p.telegram_chat_id || "");
            setWorkStart(p.work_start_hour || 9);
            setWorkEnd(p.work_end_hour || 21);
            if (p.username) setProfileUrl(`${window.location.origin}/book/${p.username}`);
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
        }

        // Услуги
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);

        // Записи
        const { data: a } = await supabase.from("appointments")
            .select(`id, client_name, client_phone, start_time, service:services (name)`)
            .eq("master_id", userId)
            .order('start_time', { ascending: true });
        setAppointments(a || []);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        
        const updates = {
            id: user.id,
            business_name: businessName,
            username: username.toLowerCase().trim(),
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(), // Теперь это поле есть в базе!
        };

        const { error } = await supabase.from("profiles").upsert(updates);
        
        if (error) {
            alert("Ошибка сохранения: " + error.message);
        } else {
            setProfileUrl(`${window.location.origin}/book/${username}`);
            alert("Настройки сохранены!");
        }
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        await supabase.from("services").insert({
            user_id: user.id, name: newName, price: Number(newPrice)
        });
        setNewName(""); setNewPrice("");
        loadData(user.id);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="text-blue-500" /> Панель мастера</h1>
                <button onClick={() => {supabase.auth.signOut(); router.push("/");}} className="text-slate-400 hover:text-red-400 flex items-center gap-2">
                    <LogOut className="w-5 h-5" /> Выйти
                </button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ЛЕВАЯ КОЛОНКА */}
                <div className="space-y-6">
                    {/* ССЫЛКА */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-lg font-bold mb-4 text-blue-400 flex items-center gap-2"><ExternalLink className="w-5 h-5" /> Ссылка</h2>
                        <div className="flex gap-2">
                            <input readOnly value={profileUrl || "Сначала сохраните никнейм..."} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-blue-300 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 px-4 rounded-lg"><Copy className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400" /> Записи</h2>
                            <button onClick={async () => { if(confirm("Очистить всё?")) { await supabase.from("appointments").delete().eq("master_id", user.id); loadData(user.id); } }} className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded-lg uppercase font-bold">Очистить</button>
                        </div>
                        <div className="space-y-3">
                            {appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center group">
                                    <div>
                                        <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm — d MMM", { locale: ru })}</div>
                                        <div className="text-sm">{app.client_name} <span className="text-slate-500 text-xs">({app.client_phone})</span></div>
                                        <div className="text-xs text-blue-300 mt-1">{app.service?.name}</div>
                                    </div>
                                    <button onClick={async () => { await supabase.from("appointments").delete().eq("id", app.id); loadData(user.id); }} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            ))}
                            {appointments.length === 0 && <p className="text-slate-500 text-center text-sm">Нет активных записей</p>}
                        </div>
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА */}
                <div className="space-y-6">
                    {/* НАСТРОЙКИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-lg font-bold mb-6 text-blue-400">Настройки</h2>
                        <div className="space-y-4">
                            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="Никнейм (eng)" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" />
                            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Название бизнеса" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" />
                            <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" />
                            
                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-xs text-slate-500 uppercase block mb-3">График работы</label>
                                <div className="flex gap-2 mb-4">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}</select>
                                    <span className="self-center text-slate-500">—</span>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}</select>
                                </div>
                                <div className="flex justify-between gap-1">
                                    {DAYS_OF_WEEK.map((d) => (
                                        <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${disabledDays.includes(d.id) ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-slate-700 text-slate-300"}`}>{d.label}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all shadow-lg">Сохранить всё</button>
                        </div>
                    </div>

                    {/* УСЛУГИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-4 text-emerald-400 flex items-center gap-2"><Plus className="w-5 h-5"/> Услуги</h2>
                        <div className="flex gap-2 mb-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-1 bg-slate-900 p-2 rounded text-sm border border-slate-600 outline-none" />
                            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена" type="number" className="w-24 bg-slate-900 p-2 rounded text-sm border border-slate-600 outline-none" />
                            <button onClick={handleAddService} className="bg-emerald-600 px-4 rounded font-bold hover:bg-emerald-500 text-white">OK</button>
                        </div>
                        <div className="space-y-2">
                            {services.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-slate-700/20 p-3 rounded-lg border border-slate-600">
                                    <span className="text-sm font-medium">{s.name} <span className="text-emerald-400 ml-2">{s.price} ₽</span></span>
                                    <button onClick={async () => { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}