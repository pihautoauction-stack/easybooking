"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Clock, Phone, User, Save, Copy, ExternalLink, AtSign } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Состояния профиля
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState(""); // Тот самый ник для ссылки
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [profileUrl, setProfileUrl] = useState("");     
    
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

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

    const handleSaveProfile = async () => {
        if (!user) return;
        if (!username) { alert("Придумайте ник для ссылки!"); return; }

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
            alert("Настройки сохранены!");
        }
    };

    // ... функции fetchServices, fetchAppointments, handleAddService, toggleDay (оставь как были)
    const fetchServices = async (userId: string) => {
        const { data } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        if (data) setServices(data);
    };

    const fetchAppointments = async (userId: string) => {
        const { data } = await supabase.from("appointments").select(`id, client_name, client_phone, start_time, service:services (name, price)` )
            .eq("master_id", userId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
        if (data) setAppointments(data as any);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className="space-y-8">
                    {/* ССЫЛКА */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                            <ExternalLink className="w-5 h-5" /> Ваша ссылка для клиентов
                        </h2>
                        {profileUrl ? (
                            <div className="flex gap-2">
                                <input readOnly value={profileUrl} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-blue-300 outline-none" />
                                <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg">
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 animate-pulse">Укажите ник ниже, чтобы создать ссылку...</p>
                        )}
                    </div>

                    {/* ТАБЛИЦА ЗАПИСЕЙ (appointments.map...) */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-4 text-slate-200">Ближайшие записи</h2>
                        <div className="space-y-3">
                            {appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                    <div>
                                        <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm")}</div>
                                        <div className="text-sm">{app.client_name}</div>
                                    </div>
                                    <div className="text-xs bg-blue-900/50 p-2 rounded text-blue-200">{app.service?.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* НАСТРОЙКИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-semibold mb-6 text-blue-400">Настройки кабинета</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Никнейм для ссылки (английские буквы)</label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="например: tatyana-nails" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Название салона / Имя мастера</label>
                                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Telegram Chat ID (из @userinfobot)</label>
                                <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500" />
                            </div>

                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                <Save className="w-5 h-5" /> Сохранить профиль
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}