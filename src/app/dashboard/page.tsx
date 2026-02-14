"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, 
    Loader2, Link as LinkIcon, User, Clock 
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Данные профиля (Салон красоты)
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg?.initData) {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#0f172a');
        }

        const checkAuth = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.replace("/login");
            } else {
                setUser(authUser);
                await loadData(authUser.id);
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const loadData = async (userId: string) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            setTelegramChatId(p.telegram_chat_id || "");
            setWorkStart(Number(p.work_start_hour) || 9);
            setWorkEnd(Number(p.work_end_hour) || 21);
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
        }
        
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);

        const { data: a } = await supabase.from("appointments")
            .select("id, client_name, client_phone, start_time, service:services (name)")
            .eq("master_id", userId)
            .order('start_time', { ascending: true });
        setAppointments(a || []);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: user.id,
            business_name: businessName,
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart.toString(),
            work_end_hour: workEnd.toString(),
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        });
        setSaving(false);
        alert(error ? error.message : "Профиль сохранен! ✅");
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        setAddingService(true);
        await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) });
        setNewName(""); setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить услугу?")) {
            await supabase.from("services").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Удалить запись?")) {
            await supabase.from("appointments").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const clientLink = user ? `https://t.me/my_cool_booking_bot/app?startapp=${user.id}` : "";

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <span className="text-slate-500 text-sm">Загрузка кабинета...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-24 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))} className="text-slate-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
            </header>

            <main className="grid gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30">
                    <h2 className="text-xs font-bold uppercase text-blue-300 mb-3 tracking-widest flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Ваша ссылка для клиентов</h2>
                    <div className="flex gap-2">
                        <input readOnly value={clientLink} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-[10px] text-slate-300 outline-none font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl active:scale-95"><Copy className="w-4 h-4 text-white" /></button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Название бизнеса</label>
                            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Салон красоты..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500" />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-700">
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1">Рабочие дни</label>
                            <div className="flex justify-between gap-1 mb-4">
                                {DAYS.map((d) => (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-lg text-xs font-bold border ${!disabledDays.includes(d.id) ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-800 text-slate-600 border-slate-700"}`}>{d.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Начало работы</label>
                                <input type="number" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Конец работы</label>
                                <input type="number" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 py-4 rounded-xl font-bold active:scale-95 transition-all">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить настройки"}</button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена ₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-600 px-4 rounded-xl">{addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-white" />}</button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-xl border border-slate-600/50">
                                <span className="text-sm font-medium">{s.name} <span className="text-emerald-400 ml-1 font-bold">{s.price} ₽</span></span>
                                <button onClick={() => handleDeleteService(s.id)} className="text-slate-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Записи</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-slate-500 text-center py-6 text-sm italic">Записей пока нет</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-bold font-mono text-xl mb-1">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-slate-200 text-sm font-semibold">{app.client_name}</div>
                                    <div className="text-slate-500 text-[10px] mt-1 font-bold uppercase">
                                        {format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.service?.name}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <span className="text-[10px] text-blue-400 font-mono">{app.client_phone}</span>
                                    <button onClick={() => handleDeleteRecord(app.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}