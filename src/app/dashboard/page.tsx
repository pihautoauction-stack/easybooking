"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, 
    Loader2, Link as LinkIcon, User, Bot, ExternalLink, 
    Clock, CheckCircle2, Bug, AlertCircle 
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);
    const [debug, setDebug] = useState("Запуск...");

    // Состояния данных (на базе твоих таблиц)
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    
    // Состояния кнопок
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

        // СЛУШАТЕЛЬ АВТОРИЗАЦИИ: чтобы окно входа исчезало мгновенно
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUser(session.user);
                loadData(session.user.id);
            }
        });

        const init = async () => {
            try {
                if (!tg?.initData) {
                    setIsBrowser(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.refresh_token) {
                        setReturnLink(`tg://resolve?domain=my_cool_booking_bot&appname=app&startapp=${session.refresh_token}`);
                    }
                    setLoading(false);
                    return;
                }

                tg.ready();
                tg.expand();

                const startParam = tg.initDataUnsafe?.start_param;
                // UUID мастера = 36 символов. Токен > 40 символов.
                if (startParam && startParam.length > 40) {
                    setDebug("Авторизация по ключу...");
                    const { data, error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                    if (!error && data.session) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setDebug("Доступ открыт.");
                    }
                }

                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    router.replace("/login");
                } else {
                    setUser(authUser);
                    await loadData(authUser.id);
                }
            } catch (err: any) {
                setDebug("Ошибка: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        init();
        return () => subscription.unsubscribe();
    }, [router]);

    const loadData = async (userId: string) => {
        // Загрузка профиля (например, 'Салон красоты "Зимняя Вишня"')
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
            .gte('start_time', new Date().toISOString())
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
        alert(error ? error.message : "Данные обновлены! ✅");
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
        if (confirm("Удалить эту услугу?")) {
            await supabase.from("services").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Отменить запись клиента?")) {
            await supabase.from("appointments").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const toggleDay = (dayId: number) => {
        setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const clientLink = user ? `https://t.me/my_cool_booking_bot/app?startapp=${user.id}` : "";

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{debug}</div>
        </div>
    );

    if (isBrowser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                <CheckCircle2 className="w-16 h-16 text-blue-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Авторизация успешна!</h1>
                <p className="text-slate-400 mb-8 max-w-xs">Нажмите кнопку ниже, чтобы войти в кабинет в Telegram.</p>
                {returnLink && (
                    <a href={returnLink} className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <ExternalLink className="w-5 h-5" /> Открыть Кабинет
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-24 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 sticky top-4 z-20 backdrop-blur-md">
                <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-500 hover:text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
            </header>

            <main className="grid gap-6">
                {/* ССЫЛКА ДЛЯ КЛИЕНТОВ */}
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30 shadow-lg">
                    <h2 className="text-xs font-bold uppercase text-blue-300 mb-3 flex items-center gap-2 tracking-widest"><LinkIcon className="w-3 h-3" /> Ссылка для клиентов</h2>
                    <div className="flex gap-2">
                        <input readOnly value={clientLink} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-[10px] text-slate-300 outline-none font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl active:scale-90 transition-all"><Copy className="w-4 h-4 text-white" /></button>
                    </div>
                </div>

                {/* ПРОФИЛЬ И ГРАФИК */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль мастера</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Название бизнеса</label>
                            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-all" />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-700">
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1">Рабочие дни (зеленые — работаете)</label>
                            <div className="flex justify-between gap-1 mb-4">
                                {DAYS.map((d) => (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all border ${!disabledDays.includes(d.id) ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "bg-slate-800 text-slate-600 border-slate-700"}`}>{d.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> С какого часа</label>
                                <input type="number" min="0" max="23" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> До какого часа</label>
                                <input type="number" min="0" max="23" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm" />
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить профиль"}</button>
                    </div>
                </div>

                {/* УСЛУГИ */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Ваши услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Что делаем?" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена ₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-600 px-4 rounded-xl active:scale-90 transition-all">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-white" />}
                        </button>
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

                {/* ЗАПИСИ */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Клиенты на сегодня</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-slate-500 text-center py-6 text-sm italic">Записей пока нет. Поделитесь ссылкой!</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-bold font-mono text-xl leading-none mb-1">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-slate-200 text-sm font-semibold">{app.client_name}</div>
                                    <div className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-tighter">
                                        {format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.service?.name}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <a href={`tel:${app.client_phone}`} className="text-[10px] text-blue-400 font-mono underline">{app.client_phone}</a>
                                    <button onClick={() => handleDeleteRecord(app.id)} className="text-slate-600 hover:text-red-400 p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="mt-8 pt-4 border-t border-slate-800/50 flex flex-col items-center gap-3">
                <div className="px-3 py-1 bg-black/30 rounded-full border border-yellow-500/20 text-[8px] font-mono text-yellow-500/50 flex items-center gap-1">
                    <Bug className="w-2 h-2" /> DEBUG: {debug}
                </div>
            </footer>
        </div>
    );
}