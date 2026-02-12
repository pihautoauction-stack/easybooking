"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Clock, Phone, User, Save, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
}

interface Appointment {
    id: string;
    client_name: string;
    client_phone: string;
    start_time: string;
    service: {
        name: string;
        price: number;
    };
}

const DAYS_OF_WEEK = [
    { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
    { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
];

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Данные профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramUsername, setTelegramUsername] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [profileUrl, setProfileUrl] = useState("");     
    
    // График работы
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);

    // Данные
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    // Состояния для новых услуг
    const [newServiceName, setNewServiceName] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [newServiceDuration, setNewServiceDuration] = useState("");

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);
            await fetchProfile(user.id);
            await fetchServices(user.id);
            await fetchAppointments(user.id);
            setLoading(false);
        };
        checkUser();
    }, [router]);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (data) {
            setBusinessName(data.business_name || "");
            setTelegramUsername(data.telegram_username || "");
            setTelegramChatId(data.telegram_chat_id || "");
            setWorkStart(data.work_start_hour || 9);
            setWorkEnd(data.work_end_hour || 21);
            
            // ПРАВИЛЬНАЯ ГЕНЕРАЦИЯ ССЫЛКИ
            if (data.username) {
                setProfileUrl(`${window.location.origin}/book/${data.username}`);
            }

            if (data.disabled_days) {
                setDisabledDays(data.disabled_days.split(',').map(Number));
            }
        }
    };

    const fetchServices = async (userId: string) => {
        const { data } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        if (data) setServices(data);
    };

    const fetchAppointments = async (userId: string) => {
        const { data } = await supabase
            .from("appointments")
            .select(`id, client_name, client_phone, start_time, service:services (name, price)`)
            .eq("master_id", userId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        if (data) setAppointments(data as any);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        const updates = {
            id: user.id,
            business_name: businessName,
            telegram_username: telegramUsername.replace("@", ""),
            telegram_chat_id: telegramChatId,
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };

        const { error } = await supabase.from("profiles").upsert(updates);
        if (error) alert("Ошибка: " + error.message);
        else alert("Настройки сохранены!");
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
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

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="text-blue-500" /> Панель управления
                </h1>
                <button onClick={() => {supabase.auth.signOut(); router.push("/");}} className="text-slate-400 hover:text-white flex items-center gap-2">
                    <LogOut className="w-5 h-5" /> Выйти
                </button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* БЛОК ССЫЛКИ */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                            <ExternalLink className="w-5 h-5" /> Ссылка для клиентов
                        </h2>
                        {profileUrl ? (
                            <div className="flex gap-2">
                                <input readOnly value={profileUrl} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300" />
                                <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg">
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">Загрузка ссылки...</p>
                        )}
                    </div>

                    {/* ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4">Ближайшие записи</h2>
                        {appointments.length === 0 ? <p className="text-slate-500 py-4 text-center">Записей нет</p> : (
                            <div className="space-y-3">
                                {appointments.map((app) => (
                                    <div key={app.id} className="bg-slate-700/50 p-4 rounded-xl flex justify-between items-center border border-slate-600">
                                        <div>
                                            <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm")} — {format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                            <div className="text-sm text-slate-300">{app.client_name} ({app.client_phone})</div>
                                        </div>
                                        <div className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">{app.service?.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* ПРОФИЛЬ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400 font-bold">Настройки профиля</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Название бизнеса</label>
                                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Telegram Chat ID (узнать в @userinfobot)</label>
                                <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Например: 12345678" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                            </div>
                            
                            <div className="pt-4 border-t border-slate-700">
                                <label className="block text-sm text-slate-400 mb-2">Часы работы</label>
                                <div className="flex gap-2 items-center">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <span>до</span>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between gap-1 mt-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button key={day.id} onClick={() => toggleDay(day.id)} className={`flex-1 py-2 rounded text-[10px] font-bold ${disabledDays.includes(day.id) ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-slate-700 text-slate-300"}`}>
                                        {day.label}
                                    </button>
                                ))}
                            </div>

                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                                <Save className="w-5 h-5" /> Сохранить всё
                            </button>
                        </div>
                    </div>

                    {/* УСЛУГИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-emerald-400">Услуги</h2>
                        <div className="space-y-2 mb-4">
                            <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Название" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                            <div className="flex gap-2">
                                <input value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="Цена" type="number" className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                                <input value={newServiceDuration} onChange={(e) => setNewServiceDuration(e.target.value)} placeholder="Мин" type="number" className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                            </div>
                            <button onClick={handleAddService} className="w-full bg-emerald-600 py-2 rounded-lg text-sm font-bold">+ Добавить</button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {services.map((s) => (
                                <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg border border-slate-600">
                                    <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-emerald-400">{s.price} ₽ • {s.duration} м</p></div>
                                    <button onClick={() => handleDeleteService(s.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}