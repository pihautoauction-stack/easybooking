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
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);

    // Данные профиля
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        const init = async () => {
            setLoading(true);

            // 1. ПРОВЕРКА СРЕДЫ
            if (!tg?.initData) {
                setIsBrowser(true);
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.refresh_token) {
                    const botName = "my_cool_booking_bot";
                    setReturnLink(`tg://resolve?domain=${botName}&appname=app&startapp=${session.refresh_token}`);
                }
                setLoading(false);
                return; 
            }

            // 2. TELEGRAM SETUP
            tg.ready();
            tg.expand();

            // 3. ОБРАБОТКА ТОКЕНА (Убираем ошибку "Мастер не найден")
            const startParam = tg?.initDataUnsafe?.start_param;
            if (startParam && startParam.length > 40) {
                const { error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                if (!error) {
                    // ОЧИЩАЕМ URL ОТ ТОКЕНА МГНОВЕННО
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }

            // 4. ПРОВЕРКА ВХОДА
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push("/login");
                return;
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
            id: user.id, business_name: businessName, telegram_chat_id: telegramChatId.trim(), updated_at: new Date(),
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

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Удалить?")) {
            await supabase.from("appointments").delete().eq("id", id);
            await loadData(user.id);
        }
    }

    // Правильная ссылка для клиентов (использует твой ID из базы)
    const clientUrl = user ? `https://t.me/my_cool_booking_bot/app?startapp=${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    if (isBrowser) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                <Bot className="w-16 h-16 text-blue-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Вход подтвержден!</h1>
                <p className="text-slate-400 mb-8 max-w-xs">Нажмите кнопку, чтобы открыть кабинет «Зимняя Вишня» в Telegram.</p>
                {returnLink && (
                    <a href={returnLink} className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                        <ExternalLink className="w-5 h-5" /> Открыть в ТГ
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 font-sans">
            <header className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 sticky top-4 z-10 shadow-xl backdrop-blur-md">
                <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-slate-400 p-2"><LogOut className="w-5 h-5" /></button>
            </header>

            <main className="grid gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-5 rounded-2xl border border-blue-500/30">
                    <h2 className="text-xs font-bold uppercase text-blue-300 mb-2 flex items-center gap-2 tracking-wider"><LinkIcon className="w-3 h-3" /> Ссылка для клиентов</h2>
                    <div className="flex gap-2">
                        <input readOnly value={clientUrl} className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-[10px] text-slate-300 outline-none font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(clientUrl); alert("Скопировано!"); }} className="bg-blue-600 px-4 rounded-xl"><Copy className="w-4 h-4 text-white" /></button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="w-5 h-5 text-purple-400"/> Профиль</h2>
                    <div className="space-y-4">
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Название..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 py-4 rounded-xl font-bold">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}</button>
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-600 px-4 rounded-xl"><Plus className="w-5 h-5 text-white" /></button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-xl border border-slate-600/50">
                                <span className="text-sm font-medium">{s.name} <span className="text-emerald-400 ml-1 font-bold">{s.price} ₽</span></span>
                                <button onClick={async () => { if(confirm("Удалить?")) { await supabase.from("services").delete().eq("id", s.id); await loadData(user.id); } }} className="text-slate-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Записи</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-slate-500 text-center py-4 text-sm">Новых записей нет</p> : appointments.map(app => (
                            <div key={app.id} className="p-4 bg-slate-700/40 rounded-xl border border-slate-600 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-bold font-mono">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-slate-300 text-sm">{app.client_name}</div>
                                    <div className="text-slate-500 text-xs">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                </div>
                                <button onClick={() => handleDeleteRecord(app.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}