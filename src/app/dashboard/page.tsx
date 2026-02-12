"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Clock, Phone, User, Save } from "lucide-react";
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
    
    // График работы
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); // 0 = Воскресенье

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
            fetchProfile(user.id);
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
            setWorkStart(data.work_start_hour || 9);
            setWorkEnd(data.work_end_hour || 21);
            
            // Превращаем строку "0,6" обратно в массив цифр [0, 6]
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
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                id, client_name, client_phone, start_time, 
                service:services (name, price)
            `)
            .eq("master_id", userId)
            .gte('start_time', new Date().toISOString()) // Только будущие записи
            .order('start_time', { ascending: true });

        if (data) setAppointments(data as any);
    };

   const handleSaveProfile = async () => {
        if (!user) return;
        
        const updates = {
            id: user.id,
            business_name: businessName,
            telegram_username: telegramUsername.replace("@", ""),
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };

        // ТЕПЕРЬ МЫ ПРОВЕРЯЕМ ОШИБКУ
        const { error } = await supabase.from("profiles").upsert(updates);
        
        if (error) {
            console.error("Ошибка сохранения:", error);
            alert("ОШИБКА: " + error.message); // Покажет, почему не сохраняет
        } else {
            alert("Настройки успешно сохранены!");
        }
    };
    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => 
            prev.includes(dayId) 
                ? prev.filter(d => d !== dayId) // Если был - убираем (делаем рабочим)
                : [...prev, dayId]              // Если не был - добавляем (делаем выходным)
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

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

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
                    
                    {/* 1. Блок Записей */}
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

                    {/* 2. Блок Настройки Графика */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-6 text-orange-400 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            График работы
                        </h2>
                        
                        <div className="space-y-6">
                            {/* Часы работы */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-slate-400 mb-2">Начало дня</label>
                                    <select 
                                        value={workStart} 
                                        onChange={(e) => setWorkStart(Number(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3"
                                    >
                                        {[...Array(24)].map((_, i) => (
                                            <option key={i} value={i}>{i}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-slate-400 mb-2">Конец дня</label>
                                    <select 
                                        value={workEnd} 
                                        onChange={(e) => setWorkEnd(Number(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3"
                                    >
                                        {[...Array(24)].map((_, i) => (
                                            <option key={i} value={i}>{i}:00</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Выходные дни */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-3">Выберите ВЫХОДНЫЕ дни:</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isSelected = disabledDays.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                onClick={() => toggleDay(day.id)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    isSelected 
                                                    ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА */}
                <div className="space-y-8">
                    
                    {/* 3. Профиль */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">👤 Мой Бизнес</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Название</label>
                                <input
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Telegram Username</label>
                                <input
                                    value={telegramUsername}
                                    onChange={(e) => setTelegramUsername(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3"
                                />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Сохранить все настройки
                            </button>
                        </div>
                    </div>

                    {/* 4. Услуги */}
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
                                    + Добавить
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {services.map((service) => (
                                <div key={service.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                    <div>
                                        <p className="font-medium">{service.name}</p>
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