"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Clock, Phone, User, Save, Copy, ExternalLink, AtSign, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Состояния профиля
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

    // Услуги
    const [newServiceName, setNewServiceName] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [newServiceDuration, setNewServiceDuration] = useState("");

    const DAYS_OF_WEEK = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUser(user);
            await fetchProfile(user.id);
            await fetchServices(user.id);
            await fetchAppointments(user.id);
            setLoading(false);
        };
        checkUser();
    }, [router]);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (data) {
            setBusinessName(data.business_name || "");
            setUsername(data.username || "");
            setTelegramChatId(data.telegram_chat_id || "");
            setWorkStart(data.work_start_hour || 9);
            setWorkEnd(data.work_end_hour || 21);
            if (data.username) setProfileUrl(`${window.location.origin}/book/${data.username}`);
            if (data.disabled_days) setDisabledDays(data.disabled_days.split(',').map(Number));
        }
    };

    const fetchServices = async (userId: string) => {
        const { data } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        if (data) setServices(data);
    };

    const fetchAppointments = async (userId: string) => {
        const { data } = await supabase.from("appointments").select(`id, client_name, client_phone, start_time, service:services (name, price)` )
            .eq("master_id", userId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
        if (data) setAppointments(data as any);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        if (!username) { alert("Никнейм обязателен для работы ссылки!"); return; }

        const updates = {
            id: user.id,
            business_name: businessName,
            username: username.toLowerCase().trim(),
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };

        const { error } = await supabase.from("profiles").upsert(updates);
        if (error) alert("Ошибка: " + error.message);
        else {
            setProfileUrl(`${window.location.origin}/book/${username}`);
            alert("Все настройки сохранены!");
        }
    };

    const handleAddService = async () => {
        if (!user || !newServiceName || !newServicePrice) return;
        await supabase.from("services").insert({
            user_id: user.id, name: newServiceName, price: Number(newServicePrice), duration: Number(newServiceDuration) || 60,
        });
        setNewServiceName(""); setNewServicePrice(""); setNewServiceDuration("");
        fetchServices(user.id);
    };

    const handleDeleteService = async (id: string) => {
        await supabase.from("services").delete().eq("id", id);
        fetchServices(user.id);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            {/* ШАПКА */}
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Панель управления</h1>
                </div>
                <button 
                    onClick={() => {supabase.auth.signOut(); router.push("/");}} 
                    className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" /> Выйти
                </button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ЛЕВАЯ КОЛОНКА */}
                <div className="space-y-8">
                    {/* ССЫЛКА */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                            <ExternalLink className="w-5 h-5" /> Ваша ссылка для клиентов
                        </h2>
                        <div className="flex gap-2">
                            <input readOnly value={profileUrl || "Укажите никнейм в настройках..."} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-blue-300 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg transition-colors">
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" /> Ближайшие записи
                        </h2>
                        {appointments.length === 0 ? <p className="text-slate-500 py-8 text-center">Записей пока нет</p> : (
                            <div className="space-y-3">
                                {appointments.map(app => (
                                    <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                        <div>
                                            <div className="text-emerald-400 font-bold text-lg">{format(new Date(app.start_time), "HH:mm")}</div>
                                            <div className="text-slate-300 text-sm">{app.client_name}</div>
                                            <div className="text-slate-500 text-xs">{app.client_phone}</div>
                                        </div>
                                        <div className="bg-blue-900/50 px-3 py-1 rounded-full text-blue-200 text-xs border border-blue-500/30">
                                            {app.service?.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА */}
                <div className="space-y-8">
                    {/* НАСТРОЙКИ ПРОФИЛЯ + ГРАФИК */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-semibold mb-6 text-blue-400 flex items-center gap-2">
                            <User className="w-5 h-5" /> Настройки профиля
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Уникальный ник (для ссылки)</label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="tritontri" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Название бизнеса</label>
                                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Telegram Chat ID</label>
                                <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500" />
                            </div>

                            {/* ГРАФИК РАБОТЫ */}
                            <div className="pt-5 border-t border-slate-700">
                                <label className="block text-xs text-slate-500 mb-3 uppercase tracking-wider">Часы работы и выходные</label>
                                <div className="flex gap-3 mb-4">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <span className="self-center text-slate-600">—</span>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between gap-1">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button key={day.id} onClick={() => toggleDay(day.id)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${disabledDays.includes(day.id) ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all">
                                <Save className="w-5 h-5" /> Сохранить всё
                            </button>
                        </div>
                    </div>

                    {/* УСЛУГИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Услуги
                        </h2>
                        <div className="space-y-3 mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700">
                            <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Название услуги" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm" />
                            <div className="flex gap-2">
                                <input value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="Цена (₽)" type="number" className="w-1/2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm" />
                                <input value={newServiceDuration} onChange={(e) => setNewServiceDuration(e.target.value)} placeholder="Мин." type="number" className="w-1/2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm" />
                            </div>
                            <button onClick={handleAddService} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-sm font-bold transition-colors">Добавить</button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {services.map((s) => (
                                <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-4 rounded-xl border border-slate-600">
                                    <div>
                                        <p className="font-medium">{s.name}</p>
                                        <p className="text-xs text-emerald-400">{s.price} ₽ • {s.duration} мин</p>
                                    </div>
                                    <button onClick={() => handleDeleteService(s.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}