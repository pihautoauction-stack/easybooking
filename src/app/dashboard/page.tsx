"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, Loader2, Link as LinkIcon, User, Bot, ExternalLink, AlertCircle, Bug } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>("Инициализация...");

    // Состояния данных
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
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

        const init = async () => {
            try {
                // 1. МГНОВЕННО ОПРЕДЕЛЯЕМ БРАУЗЕР
                if (!tg?.initData) {
                    setIsBrowser(true);
                    setDebugInfo("Режим: Safari. Ищу сессию...");
                    
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.refresh_token) {
                        const botName = "my_cool_booking_bot";
                        setReturnLink(`https://t.me/${botName}?startapp=${session.refresh_token}`);
                        setDebugInfo("Сессия найдена. Кнопка готова.");
                    } else {
                        setDebugInfo("Сессия не найдена. Нужно войти.");
                    }
                    setLoading(false);
                    return;
                }

                // 2. НАСТРОЙКА TELEGRAM
                tg.ready();
                tg.expand();
                setDebugInfo("Режим: Telegram. Проверяю параметры...");

                // 3. ОБРАБОТКА ТОКЕНА (Бронирование vs Вход)
                const startParam = tg?.initDataUnsafe?.start_param;
                if (startParam && startParam.length > 30) {
                    setDebugInfo("Вхожу по токену...");
                    const { error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                    if (error) {
                        setDebugInfo("Ошибка входа: " + error.message);
                    } else {
                        setDebugInfo("Вход успешен. Очищаю URL.");
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }

                // 4. ПОЛУЧЕНИЕ ЮЗЕРА
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    setDebugInfo("Юзер не найден. Иду на /login.");
                    router.push("/login");
                    return;
                }

                setDebugInfo("Загружаю данные мастера...");
                setUser(authUser);
                await loadData(authUser.id);
                
            } catch (err: any) {
                setDebugInfo("Критический сбой: " + err.message);
            } finally {
                // ГАРАНТИРОВАННО ВЫКЛЮЧАЕМ ЛОАДЕР
                setLoading(false);
            }
        };

        init();
    }, [router]);

    const loadData = async (userId: string) => {
        try {
            const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
            if (p) {
                setBusinessName(p.business_name || "");
                setTelegramChatId(p.telegram_chat_id || "");
            }
            const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
            setServices(s || []);
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service:services (name)")
                .eq("master_id", userId)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true });
            setAppointments(a || []);
        } catch (e) {
            setDebugInfo("Ошибка загрузки данных: " + (e as Error).message);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: user.id, business_name: businessName, telegram_chat_id: telegramChatId.trim(),
            updated_at: new Date(),
        });
        setSaving(false);
        alert(error ? error.message : "Сохранено!");
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        setAddingService(true);
        await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice) });
        setNewName(""); setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    // ЭКРАН ЗАГРУЗКИ (теперь он точно пропадет)
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <div className="text-[10px] font-mono text-slate-500">{debugInfo}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 font-sans">
            {/* ПАНЕЛЬ ОТЛАДКИ */}
            <div className="mb-4 p-3 bg-black/50 border border-yellow-500/50 rounded-xl text-[10px] font-mono text-yellow-200">
                <div className="flex items-center gap-2 mb-1 border-b border-yellow-500/30 pb-1">
                    <Bug className="w-3 h-3" /> DEBUG: {debugInfo}
                </div>
            </div>

            {isBrowser ? (
                <div className="flex flex-col items-center justify-center pt-10 text-center">
                    <Bot className="w-16 h-16 text-blue-500 mb-6" />
                    <h1 className="text-2xl font-bold mb-2">Вход подтвержден</h1>
                    <p className="text-slate-400 mb-8 max-w-xs">Перейдите в Telegram, чтобы управлять «Мастерской Металла».</p>
                    {returnLink && (
                        <a href={returnLink} className="w-full bg-blue-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                            <ExternalLink className="w-5 h-5" /> Открыть Кабинет в ТГ
                        </a>
                    )}
                </div>
            ) : (
                <>
                    <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                        <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Кабинет</h1>
                        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 p-2"><LogOut className="w-5 h-5" /></button>
                    </header>

                    <main className="grid gap-6">
                        <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30">
                            <h2 className="text-xs font-bold uppercase text-blue-300 mb-3 flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Ваша ссылка</h2>
                            <div className="flex gap-2">
                                <input readOnly value={profileUrl} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-xs outline-none" />
                                <button onClick={() => { navigator.clipboard.writeText(profileUrl); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl"><Copy className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                            <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль</h2>
                            <div className="space-y-4">
                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 py-4 rounded-xl font-bold">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить"}</button>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                            <div className="flex gap-2 mb-4">
                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Услуга" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                                <button onClick={handleAddService} disabled={addingService} className="bg-pink-600 px-4 rounded-xl"><Plus className="w-5 h-5 text-white" /></button>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Записи</h2>
                            <div className="space-y-3">
                                {appointments.map(app => (
                                    <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                        <div>
                                            <div className="text-emerald-400 font-bold font-mono">{format(new Date(app.start_time), "HH:mm")}</div>
                                            <div className="text-slate-300 text-sm">{app.client_name}</div>
                                        </div>
                                        <button onClick={() => handleDeleteRecord(app.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}