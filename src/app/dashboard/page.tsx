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
    
    // Состояния для редиректа
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);

    // Данные профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        
        // ПРОВЕРКА СРЕДЫ: Если нет initData, значит это Safari/Chrome
        if (!tg?.initData) {
            setIsBrowser(true);
        } else {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#0f172a');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#0f172a');
        }

        const init = async () => {
            // 1. Пробуем поймать токен из URL (если мы уже в Telegram)
            const startParam = tg?.initDataUnsafe?.start_param;
            if (startParam && startParam.length > 30) {
                await supabase.auth.refreshSession({ refresh_token: startParam });
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // 2. Проверяем сессию
            const { data: { user: authUser } } = await supabase.auth.getUser();
            
            if (!authUser) {
                // Если нет юзера и мы в ТГ — на логин
                if (tg?.initData) {
                    router.push("/login");
                } 
                // Если нет юзера и мы в Safari — Next.js сам отправит на /login по логике Dashboard
                setLoading(false);
                return;
            }

            // 3. Если мы в SAFARI и залогинены — готовим ссылку для прыжка в ТГ
            if (!tg?.initData) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.refresh_token) {
                    const botUsername = "my_cool_booking_bot"; // Твой бот
                    // Эта ссылка откроет бота и передаст токен
                    setReturnLink(`https://t.me/${botUsername}?startapp=${session.refresh_token}`);
                }
            }

            setUser(authUser);
            await loadData(authUser.id);
            setLoading(false);
        };

        init();
    }, [router]);

    const loadData = async (userId: string) => {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            setTelegramChatId(p.telegram_chat_id || "");
            setWorkStart(p.work_start_hour || 9);
            setWorkEnd(p.work_end_hour || 21);
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
        }
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
        setServices(s || []);
        const { data: a } = await supabase.from("appointments").select(`id, client_name, client_phone, start_time, service:services (name)` boat).eq("master_id", userId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
        setAppointments(a || []);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: user.id, business_name: businessName, telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart, work_end_hour: workEnd,
            disabled_days: disabledDays.join(','), updated_at: new Date(),
        });
        setSaving(false);
        alert(error ? error.message : "Настройки сохранены!");
    };

    const handleVerifyBot = async () => {
        if (!telegramChatId) return;
        setVerifying(true);
        await fetch('/api/notify', { method: 'POST', body: JSON.stringify({ masterId: user.id, isTest: true }), headers: { 'Content-Type': 'application/json' } });
        setVerifying(false);
        alert("Проверьте уведомление в Telegram!");
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
        if (confirm("Удалить запись?")) {
            await supabase.from("appointments").delete().eq("id", id);
            loadData(user.id);
        }
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    // --- ЛОВУШКА SAFARI: Если мы в браузере, ВСЕГДА показываем только кнопку перехода ---
    if (isBrowser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                     <Bot className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Вход выполнен!</h1>
                <p className="text-slate-400 mb-8 max-w-xs">Чтобы управлять записями, перейдите в Telegram.</p>
                
                {returnLink ? (
                    <a 
                        href={returnLink} 
                        className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Открыть Кабинет в ТГ
                    </a>
                ) : (
                    <div className="text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Синхронизация...</span>
                    </div>
                )}

                <button 
                    onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
                    className="mt-10 text-slate-500 text-sm underline"
                >
                    Выйти из аккаунта
                </button>
            </div>
        );
    }

    // --- ОБЫЧНЫЙ ДАШБОРД (ТОЛЬКО ДЛЯ TELEGRAM) ---
    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md sticky top-4 z-10">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Settings className="text-blue-500 w-5 h-5" /> Кабинет
                </h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 p-2">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="grid gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30 shadow-lg">
                    <h2 className="text-xs font-bold uppercase text-blue-300 mb-3 flex items-center gap-2 tracking-wider">
                        <LinkIcon className="w-3 h-3" /> Ваша ссылка для клиентов
                    </h2>
                    <div className="flex gap-2">
                        <input readOnly value={profileUrl} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 outline-none font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(profileUrl); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl">
                            <Copy className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Настройки */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль</h2>
                    <div className="space-y-4">
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название бизнеса" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                        <input value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Ваш Telegram ID" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-emerald-400 font-mono" />
                        <button onClick={handleVerifyBot} className="text-[10px] uppercase bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
                            <Bot className="w-3 h-3" /> Проверить уведомления
                        </button>
                        
                        <div className="pt-4 border-t border-slate-700">
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-3">Рабочие дни</label>
                            <div className="flex justify-between gap-1 mb-4">
                                {DAYS.map((d) => (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all border ${!disabledDays.includes(d.id) ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-800 text-slate-600 border-slate-700"}`}>
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Сохранить настройки</>}
                        </button>
                    </div>
                </div>

                {/* Услуги */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-600 px-4 rounded-xl">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-white" />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-xl">
                                <span className="text-sm font-medium">{s.name} <span className="text-emerald-400 ml-1 font-bold">{s.price} ₽</span></span>
                                <button onClick={() => handleDeleteRecord(s.id)} className="text-slate-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Записи */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Предстоящие записи</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-slate-500 text-center py-4 text-sm">Новых записей нет</p> : appointments.map(app => (
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