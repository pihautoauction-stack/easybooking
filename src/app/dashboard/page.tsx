"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, 
    Loader2, Link as LinkIcon, User, Bot, ExternalLink, 
    Clock, CheckCircle2, Bug 
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
                if (tg.setHeaderColor) tg.setHeaderColor('#050505');

                const startParam = tg.initDataUnsafe?.start_param;
                if (startParam && startParam.length > 40) {
                    const { data, error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                    if (!error && data.session) {
                        window.history.replaceState({}, document.title, window.location.pathname);
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
            id: user.id, business_name: businessName, telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart.toString(), work_end_hour: workEnd.toString(),
            disabled_days: disabledDays.join(','), updated_at: new Date(),
        });
        setSaving(false);
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({ message: error ? error.message : "Настройки сохранены! ✅" });
        } else {
            alert(error ? error.message : "Сохранено!");
        }
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

    // Экран загрузки (Glass Style)
    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        </div>
    );

    // Экран Safari (Glass Style)
    if (isBrowser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#0a0f1c] flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full">
                    <CheckCircle2 className="w-16 h-16 text-blue-500 mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <h1 className="text-2xl font-bold mb-2">Вход успешен</h1>
                    <p className="text-white/50 mb-8 text-sm">Откройте приложение в Telegram.</p>
                    {returnLink && (
                        <a href={returnLink} className="w-full bg-blue-600/90 backdrop-blur-md hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 transition-transform active:scale-95 border border-blue-400/20">
                            <ExternalLink className="w-5 h-5" /> Открыть Кабинет
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white p-4 pb-24 font-sans selection:bg-blue-500/30">
            
            {/* Стеклянный Хедер */}
            <header className="flex justify-between items-center mb-6 bg-white/[0.03] p-4 rounded-3xl border border-white/10 sticky top-4 z-20 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <h1 className="text-lg font-bold flex items-center gap-2 drop-shadow-md"><Settings className="w-5 h-5 text-blue-400" /> Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))} className="text-white/40 hover:text-red-400 p-2 transition-colors bg-white/5 rounded-full"><LogOut className="w-5 h-5" /></button>
            </header>

            <main className="grid gap-5">
                {/* ССЫЛКА */}
                <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                    <h2 className="text-[11px] font-bold uppercase text-blue-400/80 mb-3 tracking-widest flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Ссылка для клиентов</h2>
                    <div className="flex gap-2">
                        <input readOnly value={clientLink} className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white/70 outline-none font-mono focus:border-blue-500/50 transition-colors" />
                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Скопировано!"); }} className="bg-blue-600/80 backdrop-blur-md px-5 rounded-2xl active:scale-95 transition-all border border-blue-400/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]"><Copy className="w-5 h-5 text-white" /></button>
                    </div>
                </div>

                {/* ПРОФИЛЬ */}
                <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"/> Профиль мастера</h2>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider ml-1">Название бизнеса</label>
                            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Мой салон..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/20" />
                        </div>
                        
                        <div className="pt-2">
                            <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider block mb-3 ml-1">Рабочие дни</label>
                            <div className="flex justify-between gap-1 mb-4">
                                {DAYS.map((d) => (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3.5 rounded-2xl text-xs font-bold transition-all border ${!disabledDays.includes(d.id) ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-black/40 text-white/30 border-white/5 hover:bg-white/5"}`}>{d.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Открытие</label>
                                <input type="number" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-500/50 transition-all text-center" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Закрытие</label>
                                <input type="number" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-500/50 transition-all text-center" />
                            </div>
                        </div>

                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-white text-black py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all mt-2">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : "Сохранить профиль"}</button>
                    </div>
                </div>

                {/* УСЛУГИ */}
                <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]"/> Ваши услуги</h2>
                    <div className="flex gap-2 mb-6">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-black/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-pink-500/50 transition-all placeholder:text-white/20" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-pink-500/50 transition-all text-center placeholder:text-white/20" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-500/80 backdrop-blur-md px-5 rounded-2xl active:scale-95 transition-all border border-pink-400/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-5 h-5 text-white" />}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-sm font-medium text-white/90">{s.name} <span className="text-pink-400 ml-2 font-bold px-2 py-1 bg-pink-500/10 rounded-lg">{s.price} ₽</span></span>
                                <button onClick={() => handleDeleteService(s.id)} className="text-white/30 hover:text-red-400 p-2 bg-white/5 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ЗАПИСИ */}
                <div className="bg-white/[0.03] backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"/> Клиенты на подходе</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-white/30 text-center py-8 text-sm">Записей пока нет.</p> : appointments.map(app => (
                            <div key={app.id} className="p-5 bg-black/40 rounded-2xl border border-white/5 flex justify-between items-center backdrop-blur-sm">
                                <div>
                                    <div className="text-emerald-400 font-bold font-mono text-2xl leading-none mb-2 drop-shadow-md">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-white/90 text-sm font-semibold">{app.client_name}</div>
                                    <div className="text-white/40 text-[10px] mt-1.5 font-bold uppercase tracking-widest">
                                        {format(new Date(app.start_time), "d MMM", { locale: ru })} • {app.service?.name}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <a href={`tel:${app.client_phone}`} className="text-[11px] text-blue-400 font-mono bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">{app.client_phone}</a>
                                    <button onClick={() => handleDeleteRecord(app.id)} className="text-white/30 hover:text-red-400 p-2 bg-white/5 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}