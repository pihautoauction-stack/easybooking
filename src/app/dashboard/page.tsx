"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Calendar, Copy, Plus, Loader2, Link as LinkIcon, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    // Профиль
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Inputs
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            // Проверка на наличие метода перед вызовом
            if (window.Telegram.WebApp.setHeaderColor) {
                window.Telegram.WebApp.setHeaderColor("#17212b");
            }
        }

        const init = async () => {
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
                if (tgUser && !telegramChatId) {
                    setTelegramChatId(tgUser.id.toString());
                }
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUser(user);
            await loadData(user.id);
            setLoading(false);
        };
        init();
    }, []);

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
        
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showPopup) {
             window.Telegram.WebApp.showPopup({
                title: error ? "Ошибка" : "Успешно",
                message: error ? error.message : "Настройки сохранены",
                buttons: [{type: "ok"}]
             });
        } else {
            alert(error ? error.message : "Настройки сохранены!");
        }
    };

    const handleVerifyBot = async () => {
        if (!telegramChatId) return;
        setVerifying(true);
        const res = await fetch('/api/notify', {
            method: 'POST',
            body: JSON.stringify({ masterId: user.id, isTest: true }),
            headers: { 'Content-Type': 'application/json' }
        });
        setVerifying(false);
        if (res.ok) alert("✅ Отправлено! Проверь личку с ботом.");
        else alert("❌ Ошибка. Нажми /start в боте.");
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

    if (loading) return <div className="min-h-screen bg-[#17212b] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    return (
        <div className="min-h-screen pb-24 font-sans text-sm bg-[#17212b] text-white">
            
            <div className="px-4 py-3 flex justify-between items-center border-b border-white/5 bg-[#232e3c]">
                <h1 className="font-bold text-lg text-white">Кабинет</h1>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-[#708499] hover:text-red-400">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            <main className="p-4 space-y-6">
                
                <div className="bg-[#232e3c] p-4 rounded-xl shadow-sm border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[#708499] text-xs font-bold uppercase tracking-wider">Ссылка для записи</span>
                        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Активна
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-[#17212b] rounded-lg p-3 text-xs text-white truncate font-mono border border-white/5">
                            {profileUrl}
                        </div>
                        <button 
                            onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} 
                            className="bg-[#5288c1] hover:bg-[#4a7db3] px-3 rounded-lg flex items-center justify-center text-white"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-[#232e3c] p-4 rounded-xl shadow-sm border border-white/5 space-y-4">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-[#64b5ef]" /> Профиль
                    </h2>
                    
                    <input 
                        value={businessName} 
                        onChange={e => setBusinessName(e.target.value)} 
                        placeholder="Название (напр. Барбершоп)" 
                        className="w-full bg-[#17212b] border border-white/5 rounded-lg p-3 text-white outline-none focus:border-[#5288c1] transition-colors" 
                    />

                    <div>
                        <div className="flex gap-2">
                            <input 
                                value={telegramChatId} 
                                onChange={e => setTelegramChatId(e.target.value)} 
                                placeholder="Telegram ID" 
                                className="flex-1 bg-[#17212b] border border-white/5 rounded-lg p-3 text-emerald-400 font-mono text-xs outline-none" 
                            />
                            <button onClick={handleVerifyBot} disabled={verifying || !telegramChatId} className="bg-[#2b3847] px-3 rounded-lg border border-white/5">
                                {verifying ? <Loader2 className="w-4 h-4 animate-spin text-[#708499]" /> : <Bot className="w-4 h-4 text-[#64b5ef]" />}
                            </button>
                        </div>
                        <p className="text-[#708499] text-[10px] mt-1.5 ml-1">ID для уведомлений (определяется авто)</p>
                    </div>

                    <div className="pt-2">
                        <p className="text-[#708499] text-[10px] uppercase font-bold mb-2">Рабочие дни</p>
                        <div className="flex justify-between gap-1 mb-3">
                            {DAYS.map((d) => {
                                const isWorking = !disabledDays.includes(d.id);
                                return (
                                    <button key={d.id} onClick={() => toggleDay(d.id)} 
                                        className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${
                                            isWorking ? "bg-[#50a14f] text-white" : "bg-[#17212b] text-[#708499]"
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex gap-2 text-xs">
                            <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="flex-1 bg-[#17212b] p-2 rounded-lg text-white border border-white/5 outline-none">{[...Array(24)].map((_, i) => <option key={i} value={i}>с {i}:00</option>)}</select>
                            <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="flex-1 bg-[#17212b] p-2 rounded-lg text-white border border-white/5 outline-none">{[...Array(24)].map((_, i) => <option key={i} value={i}>до {i}:00</option>)}</select>
                        </div>
                    </div>
                </div>

                <div className="bg-[#232e3c] p-4 rounded-xl shadow-sm border border-white/5">
                    <h2 className="text-white font-bold mb-3 flex items-center gap-2"><Plus className="w-5 h-5 text-pink-400"/> Услуги</h2>
                    <div className="flex gap-2 mb-4">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-[#17212b] rounded-lg p-3 text-white border border-white/5 outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-[#17212b] rounded-lg p-3 text-white border border-white/5 outline-none" />
                        <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="bg-pink-600 px-3 rounded-lg flex items-center justify-center text-white">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-[#17212b] p-3 rounded-lg border border-white/5">
                                <span className="text-white">{s.name} <span className="text-emerald-400 font-bold ml-1">{s.price} ₽</span></span>
                                <button onClick={async () => { if(confirm("Удалить?")) { await supabase.from("services").delete().eq("id", s.id); loadData(user.id); }}} className="text-[#708499]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="bg-[#232e3c] p-4 rounded-xl shadow-sm border border-white/5 mb-8">
                    <h2 className="text-white font-bold mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400"/> Записи</h2>
                    <div className="space-y-3">
                        {appointments.length === 0 ? <p className="text-[#708499] text-center text-xs py-2">Записей пока нет</p> : appointments.map(app => (
                            <div key={app.id} className="p-3 bg-[#17212b] rounded-lg border border-white/5 flex justify-between items-center">
                                <div>
                                    <div className="text-emerald-400 font-bold">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="text-white text-sm">{app.client_name}</div>
                                    <div className="text-[#708499] text-xs">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                </div>
                                <button onClick={() => handleDeleteRecord(app.id)} className="text-[#708499]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#232e3c] border-t border-white/5">
                <button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="w-full bg-[#5288c1] active:bg-[#4a7db3] text-white py-3.5 rounded-xl font-bold text-base shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}
                </button>
            </div>
        </div>
    );
} 