"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Settings, Calendar, Save, Copy, Plus, Loader2, Link as LinkIcon, User, Bot, ExternalLink, Bug } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);
    const [debug, setDebug] = useState("Инициализация...");

    const [businessName, setBusinessName] = useState("");
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;

        const init = async () => {
            try {
                // 1. ПРОВЕРКА SAFARI
                if (!tg?.initData) {
                    setIsBrowser(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.refresh_token) {
                        setReturnLink(`tg://resolve?domain=my_cool_booking_bot&appname=app&startapp=${session.refresh_token}`);
                    }
                    setLoading(false);
                    return;
                }

                // 2. TELEGRAM: РАБОТА С СЕССИЕЙ
                tg.ready();
                const startParam = tg.initDataUnsafe?.start_param;

                // Сначала пробуем восстановить сессию по токену
                if (startParam && startParam.length > 40) {
                    setDebug("Восстановление доступа...");
                    const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: startParam });
                    if (refreshData?.session) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }

                // Теперь проверяем, кто мы
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (!authUser) {
                    // Если после всех проверок юзера нет — только тогда на логин
                    setDebug("Доступ запрещен. Редирект...");
                    router.replace("/login");
                    return;
                }

                // Если юзер есть — грузим данные (например, "Зимняя Вишня")
                setUser(authUser);
                await loadData(authUser.id);
                setDebug("Готово!");

            } catch (err: any) {
                setDebug("Ошибка: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    const loadData = async (userId: string) => {
        // ID мастера: 3b81f648-1dde-426c-9d10-0bc5b7d258bd
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) setBusinessName(p.business_name || "");
        
        const { data: s } = await supabase.from("services").select("*").eq("user_id", userId);
        setServices(s || []);

        const { data: a } = await supabase.from("appointments").select("*, service:services(name)").eq("master_id", userId);
        setAppointments(a || []);
    };

    const clientLink = user ? `https://t.me/my_cool_booking_bot/app?startapp=${user.id}` : "";

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <div className="text-[10px] font-mono text-slate-500">{debug}</div>
        </div>
    );

    if (isBrowser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                <Bot className="w-16 h-16 text-blue-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Вход подтвержден!</h1>
                <p className="text-slate-400 mb-8 max-w-xs">Откройте Telegram, чтобы управлять «{businessName || "Салоном"}».</p>
                {returnLink && (
                    <a href={returnLink} className="w-full max-w-xs bg-blue-600 py-4 rounded-2xl font-bold shadow-lg">Открыть Кабинет</a>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="text-blue-500 w-5 h-5" /> Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400"><LogOut className="w-5 h-5" /></button>
            </header>
            
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30 mb-6">
                <h2 className="text-xs font-bold uppercase text-blue-300 mb-2">Ссылка для записи</h2>
                <div className="flex gap-2">
                    <input readOnly value={clientLink} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-[10px] outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl"><Copy className="w-4 h-4 text-white" /></button>
                </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль мастера</h2>
                <div className="space-y-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                         <span className="text-[10px] text-slate-500 block mb-1">Название:</span>
                         <span className="text-sm font-medium">{businessName || "Не указано"}</span>
                    </div>
                    <button className="w-full bg-slate-700 py-4 rounded-xl text-slate-400 text-sm">Настройки профиля (в разработке)</button>
                </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-800 flex items-center gap-2 text-[8px] font-mono text-slate-700">
                <Bug className="w-2 h-2" /> DEBUG: {debug}
            </div>
        </div>
    );
}