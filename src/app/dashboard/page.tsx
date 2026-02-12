"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Clock, Phone, User, Save, Copy } from "lucide-react";
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
    { id: 1, label: "Пн" },
    { id: 2, label: "Вт" },
    { id: 3, label: "Ср" },
    { id: 4, label: "Чт" },
    { id: 5, label: "Пт" },
    { id: 6, label: "Сб" },
    { id: 0, label: "Вс" },
];

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Данные профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramUsername, setTelegramUsername] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); // Память для ID
    const [profileUrl, setProfileUrl] = useState("");     // Память для ссылки
    
    // График работы
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);

    // Данные
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    // Новая услуга
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
            fetchServices(user.id);
            fetchAppointments(user.id);
            setLoading(false);
        };
        checkUser();
    }, [router]);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (data) {
            setBusinessName(data.business_name || "");
            setTelegramUsername(data.telegram_username || "");
            setTelegramChatId(data.telegram_chat_id || ""); // Подгружаем ID
            
            // Генерируем ссылку на профиль
            setProfileUrl(`${window.location.origin}/book/${data.username}`);
            
            setWorkStart(data.work_start_hour || 9);
            setWorkEnd(data.work_end_hour || 21);
            
            if (data.disabled_days) {
                setDisabledDays(data.disabled_days.split(',').map(Number));
            } else {
                setDisabledDays([]);
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
            .select(`
                id, client_name, client_phone, start_time, 
                service:services (name, price)
            `)
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
            telegram_chat_id: telegramChatId, // Сохраняем ID мастера
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };

        const { error } = await supabase.from("profiles").upsert(updates);
        
        if (error) {
            console.error("Ошибка сохранения:", error);
            alert("ОШИБКА: " + error.message);
        } else {
            alert("Настройки успешно сохранены!");
        }
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => 
            prev.includes(dayId) 
                ? prev.filter(d => d !== dayId) 
                : [...prev, dayId]
        );
    };

    const handleAddService = async () => {
        if (!user || !newServiceName || !newServicePrice) return;
        const { error } = await supabase.from("services").insert({
            user_id: user.id,
            name: newServiceName,
            price: Number(newServicePrice),
            duration: Number(newServiceDuration) || 60,
        });

        if (!error) {
            setNewServiceName("");
            setNewServicePrice("");
            setNewServiceDuration("");
            fetchServices(user.id);
        }
    };

    const handleDeleteService = async (id: string) => {
        await supabase.from("services").delete().eq("id", id);
        fetchServices(user.id);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Панель управления</h1>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" /> Выйти
                </button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ЛЕВАЯ КОЛОНКА */}
                <div className="space-y-8">
                    
                    {/* Блок со ссылкой (НОВОЕ) */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center gap-2">
                            <Save className="w-5 h-5" /> Ваша ссылка для клиентов
                        </h2>
                        <div className="flex gap-2">
                            <input 
                                readOnly 
                                value={profileUrl} 
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 outline-none"
                            />
                            <button 
                                onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!")}}
                                className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg transition-colors"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            Ближайшие записи
                        </h2>
                        {appointments.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">Записей пока нет</p>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map((app) => (
                                    <div key={app.id} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-emerald-400 font-bold text-lg">{format(new Date(app.start_time), "HH:mm")}</span>
                                                <span className="text-slate-400 text-sm">{format(new Date(app.start_time), "d MMM", { locale: ru })}</span>
                                            </div>
                                            <div className="flex flex-col text-sm text-slate-300">
                                                <span>{app.client_name}</span>
                                                <a href={`tel:${app.client_phone}`} className="text-blue-400">{app.client_phone}</a>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-xs font-medium mb-1 inline-block">
                                                {app.service?.name}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА */}
                <div className="space-y-8">
                    
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">👤 Мой Бизнес</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Название</label>
                                <input
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Telegram Username</label>
                                <input
                                    value={telegramUsername}
                                    onChange={(e) => setTelegramUsername(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Telegram Chat ID (для уведомлений)</label>
                                <input
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    placeholder="Введите ваш ID"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Узнать ID можно в боте @userinfobot</p>
                            </div>

                            {/* ГРАФИК ВНУТРИ ПРОФИЛЯ ДЛЯ КОМПАКТНОСТИ */}
                            <div className="pt-4 border-t border-slate-700">
                                <label className="block text-sm text-slate-400 mb-3 text-center">Часы и выходные</label>
                                <div className="flex gap-2 mb-4">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <span className="self-center">—</span>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-center gap-1">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={`w-8 h-8 rounded text-[10px] font-bold transition-all ${
                                                disabledDays.includes(day.id) 
                                                ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/20 transition-all"
                            >
                                <Save className="w-5 h-5" /> Сохранить профиль
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-emerald-400">🛍 Услуги</h2>
                        <div className="bg-slate-900/50 p-4 rounded-xl mb-6 border border-slate-700">
                            <div className="space-y-3">
                                <input
                                    value={newServiceName}
                                    onChange={(e) => setNewServiceName(e.target.value)}
                                    placeholder="Название услуги"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={newServicePrice}
                                        onChange={(e) => setNewServicePrice(e.target.value)}
                                        placeholder="Цена"
                                        className="w-1/2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={newServiceDuration}
                                        onChange={(e) => setNewServiceDuration(e.target.value)}
                                        placeholder="Мин."
                                        className="w-1/2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleAddService}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg"
                                >
                                    + Добавить услугу
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {services.map((service) => (
                                <div key={service.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                    <div>
                                        <p className="font-medium text-sm">{service.name}</p>
                                        <p className="text-xs text-emerald-400">{service.price} ₽ • {service.duration} мин</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
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