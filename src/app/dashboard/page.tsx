"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, Loader2, Link as LinkIcon, User, Bot, ExternalLink, AlertCircle, bug } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>(""); // Для выявления ошибок

    // Данные профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        
        const init = async () => {
            setLoading(true);
            try {
                // 1. Проверяем платформу
                if (!tg?.initData) {
                    setIsBrowser(true);
                    setDebugInfo("Платформа: Обычный браузер (Safari/Chrome)");
                } else {
                    tg.ready();
                    tg.expand();
                    setDebugInfo("Платформа: Telegram Mini App");
                }

                // 2. Обработка токена (startapp)
                const startParam = tg?.initDataUnsafe?.start_param;
                if (startParam && startParam.length > 30) {
                    setDebugInfo(prev => prev + "\nНайден токен: " + startParam.substring(0, 10) + "...");
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ 
                        refresh_token: startParam 
                    });
                    
                    if (refreshError) {
                        setDebugInfo(prev => prev + "\nОшибка токена: " + refreshError.message);
                    } else {
                        setDebugInfo(prev => prev + "\nСессия успешно восстановлена");
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }

                // 3. Проверка пользователя
                const { data: { user: authUser } } = await supabase.auth.getUser();
                
                if (!authUser) {
                    setDebugInfo(prev => prev + "\nПользователь не найден. Редирект на вход...");
                    if (tg?.initData) router.push("/login");
                    setLoading(false);
                    return;
                }

                // 4. Если в Safari — генерим ссылку возврата
                if (!tg?.initData) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.refresh_token) {
                        const botName = "my_cool_booking_bot";
                        setReturnLink(`https://t.me/${botName}?startapp=${session.refresh_token}`);
                    }
                }

                setUser(authUser);
                await loadData(authUser.id);
            } catch (err: any) {
                setDebugInfo(prev => prev + "\nКритическая ошибка: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    const loadData = async (userId: string) => {
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
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 font-sans">
            {/* ПАНЕЛЬ ОТЛАДКИ (Удали её, когда всё заработает) */}
            <div className="mb-4 p-3 bg-black/50 border border-yellow-500/50 rounded-xl text-[10px] font-mono text-yellow-200">
                <div className="flex items-center gap-2 mb-1 border-b border-yellow-500/30 pb-1">
                    <AlertCircle className="w-3 h-3" /> СТАТУС ОТЛАДКИ
                </div>
                {debugInfo.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>

            {isBrowser ? (
                <div className="flex flex-col items-center justify-center pt-10 text-center">
                    <Bot className="w-16 h-16 text-blue-500 mb-6" />
                    <h1 className="text-2xl font-bold mb-2">Доступ подтвержден</h1>
                    <p className="text-slate-400 mb-8 max-w-xs">Нажмите кнопку ниже, чтобы войти в кабинет через Telegram.</p>
                    {returnLink && (
                        <a href={returnLink} className="w-full bg-blue-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg">
                            <ExternalLink className="w-5 h-5" /> Открыть в ТГ
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
                        {/* Здесь остальной интерфейс: Название бизнеса, Услуги, Записи */}
                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                            <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-4">Настройки</h2>
                            <div className="space-y-3">
                                <input value={businessName} readOnly className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-400" />
                                <p className="text-[10px] text-slate-500">Данные загружены для: {user?.email}</p>
                            </div>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}