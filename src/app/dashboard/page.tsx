"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, ExternalLink, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Профиль
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState(""); 
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [profileUrl, setProfileUrl] = useState("");     
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [{id:1,l:"Пн"},{id:2,l:"Вт"},{id:3,l:"Ср"},{id:4,l:"Чт"},{id:5,l:"Пт"},{id:6,l:"Сб"},{id:0,l:"Вс"}];

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push("/login");
            setUser(user);
            const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (p) {
                setBusinessName(p.business_name || ""); setUsername(p.username || ""); setTelegramChatId(p.telegram_chat_id || "");
                setWorkStart(p.work_start_hour || 9); setWorkEnd(p.work_end_hour || 21);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
                if (p.username) setProfileUrl(`${window.location.origin}/book/${p.username}`);
            }
            fetchData(user.id);
        };
        load();
    }, []);

    const fetchData = async (uid: string) => {
        const { data: s } = await supabase.from("services").select("*").eq("user_id", uid).order('created_at');
        setServices(s || []);
        const { data: a } = await supabase.from("appointments").select(`id, client_name, client_phone, start_time, service:services(name)` ).eq("master_id", uid).order('start_time');
        setAppointments(a as any || []);
        setLoading(false);
    };

    const saveProfile = async () => {
        await supabase.from("profiles").upsert({ 
            id: user.id, business_name: businessName, username: username.toLowerCase().trim(), 
            telegram_chat_id: telegramChatId.trim(), work_start_hour: workStart, work_end_hour: workEnd, 
            disabled_days: disabledDays.join(',') 
        });
        setProfileUrl(`${window.location.origin}/book/${username}`);
        alert("Настройки сохранены!");
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl font-bold">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="text-blue-500" /> Панель мастера</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="text-slate-400 hover:text-red-400 flex items-center gap-2"><LogOut className="w-4 h-4" /> Выйти</button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* ССЫЛКА */}
                    <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/30">
                        <h2 className="text-sm font-bold uppercase text-blue-400 mb-4 flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Ваша ссылка</h2>
                        <div className="flex gap-2">
                            <input readOnly value={profileUrl || "Укажите ник в настройках..."} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-blue-300 outline-none" />
                            <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-blue-600 px-4 rounded-lg"><Copy className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">Ближайшие записи</h2>
                            <button onClick={async () => { if(confirm("Удалить ВСЕ записи?")) { await supabase.from("appointments").delete().eq("master_id", user.id); fetchData(user.id); } }} className="text-[10px] text-red-400 border border-red-500/30 px-2 py-1 rounded font-bold uppercase">Очистить всё</button>
                        </div>
                        <div className="space-y-3">
                            {appointments.length === 0 ? <p className="text-slate-500 text-center py-4 text-sm italic">Записей пока нет</p> : appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 flex justify-between items-center group">
                                    <div>
                                        <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm — d MMM", { locale: ru })}</div>
                                        <div className="text-sm">{app.client_name} ({app.client_phone})</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{app.service?.name}</div>
                                    </div>
                                    <button onClick={async () => { await supabase.from("appointments").delete().eq("id", app.id); fetchData(user.id); }} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* НАСТРОЙКИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <h2 className="text-lg font-bold mb-6 text-blue-400">Настройки кабинета</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Никнейм для ссылки (английские буквы)</label>
                                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="tritontri" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Название бизнеса / Имя мастера</label>
                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Салон Чапман" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Telegram Chat ID</label>
                                <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" />
                            </div>
                            
                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-[10px] text-slate-500 uppercase block mb-3">Часы работы и выходные</label>
                                <div className="flex gap-2 mb-4">
                                    <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <span className="self-center text-slate-500">до</span>
                                    <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs">
                                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between gap-1">
                                    {DAYS.map(d => (
                                        <button key={d.id} onClick={() => setDisabledDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${disabledDays.includes(d.id) ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-slate-700 text-slate-300"}`}>{d.l}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={saveProfile} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all">Сохранить изменения</button>
                        </div>
                    </div>

                    {/* УСЛУГИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-4 text-emerald-400">Услуги</h2>
                        <div className="space-y-3 mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-700">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="w-full bg-slate-800 border-none rounded p-2 text-sm outline-none" />
                            <div className="flex gap-2">
                                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена ₽" type="number" className="flex-1 bg-slate-800 border-none rounded p-2 text-sm outline-none" />
                                <button onClick={async () => { if(!newName || !newPrice) return; await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) }); fetchData(user.id); setNewName(""); setNewPrice(""); }} className="bg-emerald-600 px-6 rounded font-bold hover:bg-emerald-500 transition-colors"><Plus className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {services.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-slate-700/20 p-3 rounded-lg border border-slate-600 group">
                                    <div className="flex-1">
                                        <input className="bg-transparent border-none p-0 text-sm font-medium w-full focus:ring-0 outline-none" defaultValue={s.name} onBlur={async (e) => { await supabase.from("services").update({ name: e.target.value }).eq("id", s.id); fetchData(user.id); }} />
                                        <div className="text-xs text-emerald-400 mt-1">
                                            <input type="number" className="bg-transparent border-none p-0 w-16 focus:ring-0 outline-none" defaultValue={s.price} onBlur={async (e) => { await supabase.from("services").update({ price: Number(e.target.value) }).eq("id", s.id); fetchData(user.id); }} /> ₽
                                        </div>
                                    </div>
                                    <button onClick={async () => { await supabase.from("services").delete().eq("id", s.id); fetchData(user.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}