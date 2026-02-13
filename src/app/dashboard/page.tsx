"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, Loader2, Link as LinkIcon, User, Bot, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    // Состояния для "Ловушки Safari"
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);

    // Профиль
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    
    // График
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Новая услуга
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        // --- ПРОВЕРКА: МЫ В TELEGRAM ИЛИ В SAFARI? ---
        const tg = window.Telegram?.WebApp;
        if (!tg?.initData) {
            setIsBrowser(true);
        } else {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#0f172a');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#0f172a');
        }

        const init = async () => {
            // --- ЛОГИКА ВХОДА ЧЕРЕЗ РЕДИРЕКТ (Внутри Telegram) ---
            if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
                const tokenFromSafari = window.Telegram.WebApp.initDataUnsafe.start_param;
                if (tokenFromSafari && tokenFromSafari !== 'auth_success') {
                    const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: tokenFromSafari });
                    if (refreshData.session) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }
            }

            // 1. Проверка пользователя
            let { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                await new Promise(r => setTimeout(r, 1000));
                const { data: { user: retryUser } } = await supabase.auth.getUser();
                user = retryUser;
            }

            if (!user) { 
                router.push("/login"); 
                return; 
            }
            
            // --- ГЕНЕРАЦИЯ ПРАВИЛЬНОЙ ССЫЛКИ ДЛЯ SAFARI ---
            if (!window.Telegram?.WebApp?.initData) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.refresh_token) {
                    // Используем юзернейм твоего бота
                    const botName = "my_cool_booking_bot"; 
                    setReturnLink(`https://t.me/${botName}/app?startapp=${session.refresh_token}`);
                }
            }

            setUser(user);

            // Авто-определение Telegram ID
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
                if (tgUser && !telegramChatId) {
                    setTelegramChatId(tgUser.id.toString());
                }
            }

            await loadData(user.id);
            setLoading(false);
        };
        init();
    }, [router, telegramChatId]);

    const loadData = async (userId: string) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            if (p.telegram_chat_id) setTelegramChatId(p.telegram_chat_id);
            setWorkStart(p.work_start_hour || 9);
            setWorkEnd(p.work_end_hour || 21);
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
        }

        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);

        const { data: a } = await supabase.from("appointments")
            .select(`id, client_name, client_phone, start_time, service:services (name)`)
            .eq("master_id", userId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        setAppointments(a || []);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const updates = {
            id: user.id,
            business_name: businessName,
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart,
            work_end_hour: workEnd,
            disabled_days: disabledDays.join(','),
            updated_at: new Date(),
        };
        const { error } = await supabase.from("profiles").upsert(updates);
        setSaving(false);
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({ message: error ? `Ошибка: ${error.message}` : "Настройки сохранены! ✅" });
        } else {
            alert(error ? error.message : "Сохранено!");
        }
    };

    const handleVerifyBot = async () => {
        if (!telegramChatId) return;
        setVerifying(true);
        try {
            const res = await fetch('/api/notify', {
                method: 'POST',
                body: JSON.stringify({ masterId: user.id, isTest: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                if(window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({message: "Сообщение отправлено!"});
                else alert("Отправлено!");
            } else { alert("Ошибка. Запустите бота."); }
        } catch (e) { alert("Ошибка сети"); }
        setVerifying(false);
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        setAddingService(true);
        await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) });
        setNewName(""); setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const handleDeleteRecord = async (id: string) => {
        if (window.Telegram?.WebApp?.showConfirm) {
             window.Telegram.WebApp.showConfirm("Удалить запись?", async (confirmed: boolean) => {
                if (confirmed) { await supabase.from("appointments").delete().eq("id", id); loadData(user.id); }
             });
        } else {
            if (confirm("Удалить запись?")) { await supabase.from("appointments").delete().eq("id", id); loadData(user.id); }
        }
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    if (isBrowser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                     <Bot className="w-10 h-10 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Вход выполнен!</h1>
                <p className="text-slate-400 mb-8 max-w-xs">
                    Чтобы управлять записями, откройте приложение в Telegram.
                </p>
                {returnLink ? (
                    <a href={returnLink} className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <ExternalLink className="w-5 h-5" /> Открыть в Telegram
                    </a>
                ) : (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md sticky top-4 z-10 shadow-xl">
                <div>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <Settings className="text-blue-500 w-5 h-5" /> Кабинет
                    </h1>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 hover:text-red-400 transition-colors p-2">
                    <LogOut className="w-5 h-5" /> Выйти
                </button>
            </header>

            <main className="grid gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 blur-2xl rounded-full pointer-events-none"></div>
                    <h2 className="text-xs font-bold uppercase text-blue-300 mb-3 flex items-center gap-2 tracking-wider">
                        <LinkIcon className="w-3 h-3" /> Ваша ссылка
                    </h2>
                    <div className="flex gap-2">
                        <input readOnly value={profileUrl} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 outline-none font-mono" />
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(profileUrl); 
                                if(window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({message: "Ссылка скопирована!"});
                                else alert("Ссылка скопирована!");
                            }} 
                            className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 cursor-pointer"
                        >
                            <Copy className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                    <h2 className="text-lg font-bold mb-5 text-white flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Название бизнеса</label>
                            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Telegram ID (уведомления)</label>
                            <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="ID..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-colors text-emerald-400 font-mono" />
                            <div className="flex gap-2 items-center mt-2">
                                <button onClick={handleVerifyBot} disabled={verifying || !telegramChatId} className="text-[10px] font-bold uppercase tracking-wider bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-900/50 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                                    {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                                    Проверить связь
                                </button>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-700">
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-3">Рабочие дни</label>
                            <div className="flex justify-between gap-1 mb-4">
                                {DAYS.map((d) => {
                                    const isWorking = !disabledDays.includes(d.id);
                                    return (
                                        <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all border ${isWorking ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-800 text-slate-600 border-slate-700"}`}>
                                            {d.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex gap-2 items-center">
                                <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}</select>
                                <span className="text-slate-500">—</span>
                                <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm">{[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}</select>
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all mt-4 disabled:opacity-50">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Сохранить настройки</>}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="bg-pink-600 hover:bg-pink-500 px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-white" />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-xl border border-slate-600/50">
                                <span className="text-sm font-medium text-slate-200">{s.name} <span className="text-emerald-400 ml-1 font-bold">{s.price} ₽</span></span>
                                <button onClick={async () => { 
                                     if(window.Telegram?.WebApp?.showConfirm) {
                                        window.Telegram.WebApp.showConfirm("Удалить услугу?", async (ok) => {
                                            if(ok) { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }
                                        });
                                     } else if(confirm("Удалить?")) {
                                        await supabase.from("services").delete().eq("id", s.id); loadData(user.id);
                                     }
                                }} className="text-slate-500 hover:text-red-400 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Записи</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-slate-500 text-center py-4 text-sm">Пока пусто</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-bold text-lg font-mono">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-slate-300 text-sm font-medium">{app.client_name}</div>
                                    <div className="text-slate-500 text-xs">{format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.client_phone}</div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-blue-900/30 px-2 py-1 rounded text-[10px] text-blue-300 border border-blue-500/20 mb-2">{app.service?.name}</div>
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