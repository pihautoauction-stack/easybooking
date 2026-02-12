"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, ExternalLink, AtSign, Plus, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState(""); 
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [profileUrl, setProfileUrl] = useState("");     
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [newServiceName, setNewServiceName] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [newServiceDuration, setNewServiceDuration] = useState("");

    const DAYS_OF_WEEK = [{ id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" }, { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" }];

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
            .eq("master_id", userId).order('start_time', { ascending: true });
        if (data) setAppointments(data as any);
    };

    const handleSaveProfile = async () => {
        const updates = { id: user.id, business_name: businessName, username: username.toLowerCase().trim(), telegram_chat_id: telegramChatId.trim(), work_start_hour: workStart, work_end_hour: workEnd, disabled_days: disabledDays.join(','), updated_at: new Date() };
        const { error } = await supabase.from("profiles").upsert(updates);
        if (!error) { setProfileUrl(`${window.location.origin}/book/${username}`); alert("Сохранено!"); }
    };

    const deleteAppointment = async (id: string) => {
        if (confirm("Удалить эту запись?")) {
            await supabase.from("appointments").delete().eq("id", id);
            fetchAppointments(user.id);
        }
    };

    const clearAllAppointments = async () => {
        if (confirm("Вы уверены, что хотите ОЧИСТИТЬ ВСЕ записи? Это нельзя отменить.")) {
            await supabase.from("appointments").delete().eq("master_id", user.id);
            fetchAppointments(user.id);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="text-blue-500" /> Панель мастера</h1>
                <button onClick={() => {supabase.auth.signOut(); router.push("/");}} className="text-slate-400 hover:text-red-400 flex items-center gap-2 text-sm"><LogOut className="w-4 h-4" /> Выйти</button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* ССЫЛКА */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Ссылка для записи</h2>
                        <div className="flex gap-2">
                            <input readOnly value={profileUrl || "Укажите никнейм..."} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-blue-300 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* БЛИЖАЙШИЕ ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="text-blue-400 w-5 h-5" /> Записи</h2>
                            <button onClick={clearAllAppointments} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded tracking-tighter transition-all">Очистить всё</button>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {appointments.length === 0 ? <p className="text-center text-slate-500 py-10">Пока пусто</p> : appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 flex justify-between items-center group">
                                    <div>
                                        <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm — d MMM", { locale: ru })}</div>
                                        <div className="text-sm text-slate-200">{app.client_name}</div>
                                        <div className="text-[10px] text-slate-500">{app.service?.name}</div>
                                    </div>
                                    <button onClick={() => deleteAppointment(app.id)} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* НАСТРОЙКИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-6 text-blue-400">Настройки кабинета</h2>
                        <div className="space-y-4">
                            <div><label className="text-[10px] uppercase text-slate-500 mb-1 block">Никнейм для ссылки</label>
                            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="tritontri" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" /></div>
                            <div><label className="text-[10px] uppercase text-slate-500 mb-1 block">Название салона</label>
                            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" /></div>
                            <div><label className="text-[10px] uppercase text-slate-500 mb-1 block">Telegram Chat ID</label>
                            <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" /></div>
                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20">Сохранить изменения</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}