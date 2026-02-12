"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState(""); 
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);
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
                setWorkStart(p.work_start_hour); setWorkEnd(p.work_end_hour);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
            }
            fetchData(user.id);
        };
        load();
    }, []);

    const fetchData = async (uid: string) => {
        const { data: s } = await supabase.from("services").select("*").eq("user_id", uid);
        setServices(s || []);
        const { data: a } = await supabase.from("appointments").select(`id, client_name, start_time`).eq("master_id", uid).order('start_time');
        setAppointments(a || []);
        setLoading(false);
    };

    const saveProfile = async () => {
        await supabase.from("profiles").upsert({ id: user.id, business_name: businessName, username: username.toLowerCase().trim(), telegram_chat_id: telegramChatId, work_start_hour: workStart, work_end_hour: workEnd, disabled_days: disabledDays.join(',') });
        alert("Сохранено!");
    };

    if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400"><Settings /> Панель мастера</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="text-slate-400 hover:text-red-400 flex items-center gap-2"><LogOut className="w-4 h-4" /> Выйти</button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* ЗАПИСИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Ближайшие записи</h2>
                            <button onClick={async () => { if(confirm("Очистить всё?")) { await supabase.from("appointments").delete().eq("master_id", user.id); fetchData(user.id); } }} className="text-[10px] text-red-400 border border-red-500/30 px-2 py-1 rounded font-bold uppercase">Очистить всё</button>
                        </div>
                        {appointments.map(app => (
                            <div key={app.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm — d MMM", { locale: ru })}</div>
                                    <div className="text-sm">{app.client_name}</div>
                                </div>
                                <button onClick={async () => { await supabase.from("appointments").delete().eq("id", app.id); fetchData(user.id); }} className="text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* НАСТРОЙКИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-6 text-blue-400">Настройки кабинета</h2>
                        <div className="space-y-4">
                            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Никнейм для ссылки" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" />
                            <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none" />
                            <div className="flex gap-1">
                                {DAYS.map(d => (
                                    <button key={d.id} onClick={() => setDisabledDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${disabledDays.includes(d.id) ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300"}`}>{d.l}</button>
                                ))}
                            </div>
                            <button onClick={saveProfile} className="w-full bg-blue-600 py-3 rounded-xl font-bold">Сохранить</button>
                        </div>
                    </div>

                    {/* УСЛУГИ */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-lg font-bold mb-4 text-emerald-400">Услуги</h2>
                        <div className="flex gap-2 mb-4">
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-1 bg-slate-900 p-2 rounded text-sm" />
                            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" className="w-20 bg-slate-900 p-2 rounded text-sm" />
                            <button onClick={async () => { await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) }); fetchData(user.id); setNewName(""); setNewPrice(""); }} className="bg-emerald-600 px-4 rounded">+</button>
                        </div>
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between p-2 bg-slate-700/20 rounded mb-2 text-sm">
                                <span>{s.name} — {s.price} ₽</span>
                                <button onClick={async () => { await supabase.from("services").delete().eq("id", s.id); fetchData(user.id); }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}