"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, ExternalLink, AtSign, Plus, Clock } from "lucide-react";
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
        if (!error) { setProfileUrl(`${window.location.origin}/book/${username}`); alert("Настройки сохранены!"); }
    };

    const addService = async () => {
        if (!newServiceName || !newServicePrice) return;
        await supabase.from("services").insert({ user_id: user.id, name: newServiceName, price: Number(newServicePrice), duration: Number(newServiceDuration) || 60 });
        setNewServiceName(""); setNewServicePrice(""); fetchServices(user.id);
    };

    const deleteService = async (id: string) => {
        await supabase.from("services").delete().eq("id", id);
        fetchServices(user.id);
    };

    const clearAll = async () => {
        if (confirm("УДАЛИТЬ ВООБЩЕ ВСЕ ЗАПИСИ?")) {
            await supabase.from("appointments").delete().eq("master_id", user.id);
            fetchAppointments(user.id);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="text-blue-500" /> Панель мастера</h1>
                <button onClick={() => {supabase.auth.signOut(); router.push("/");}} className="text-slate-400 hover:text-red-400 flex items-center gap-2"><LogOut className="w-4 h-4" /> Выйти</button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-sm font-bold uppercase text-blue-400 mb-4 tracking-widest">Ссылка для клиентов</h2>
                        <div className="flex gap-2">
                            <input readOnly value={profileUrl} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-blue-300 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 px-4 rounded-lg"><Copy className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Ближайшие записи</h2>
                            <button onClick={clearAll} className="text-[10px] text-red-400 border border-red-500/30 px-2 py-1 rounded uppercase font-bold">Очистить всё</button>
                        </div>
                        <div className="space-y-3">
                            {appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 flex justify-between items-center group">
                                    <div>
                                        <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm — d MMM", { locale: ru })}</div>
                                        <div className="text-sm text-slate-200">{app.client_name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{app.service?.name}</div>
                                    </div>
                                    <button onClick={async () => { await supabase.from("appointments").delete().eq("id", app.id); fetchAppointments(user.id); }} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-6 text-blue-400">Настройки кабинета</h2>
                        <div className="space-y-4">
                            <div><label className="text-[10px] uppercase text-slate-500 block mb-1">Никнейм для ссылки</label>
                            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" /></div>
                            <div><label className="text-[10px] uppercase text-slate-500 block mb-1">Telegram Chat ID</label>
                            <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" /></div>
                            
                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-[10px] uppercase text-slate-500 block mb-3">Часы работы</label>
                                <div className="flex gap-2">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all">Сохранить изменения</button>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-4 text-emerald-400">Мои услуги</h2>
                        <div className="space-y-3 mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700">
                            <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Название услуги" className="w-full bg-slate-800 border-none rounded p-2 text-sm" />
                            <div className="flex gap-2">
                                <input value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="Цена ₽" type="number" className="w-1/2 bg-slate-800 border-none rounded p-2 text-sm" />
                                <input value={newServiceDuration} onChange={(e) => setNewServiceDuration(e.target.value)} placeholder="Мин" type="number" className="w-1/2 bg-slate-800 border-none rounded p-2 text-sm" />
                            </div>
                            <button onClick={addService} className="w-full bg-emerald-600 py-2 rounded text-sm font-bold transition-colors">+ Добавить</button>
                        </div>
                        <div className="space-y-2">
                            {services.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg border border-slate-600">
                                    <div className="text-sm font-medium">{s.name} — <span className="text-emerald-400">{s.price} ₽</span></div>
                                    <button onClick={() => deleteService(s.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}