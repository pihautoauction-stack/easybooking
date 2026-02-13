"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, Calendar, Copy, Plus, Loader2, Link as LinkIcon, User, Briefcase, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingService, setAddingService] = useState(false);
    const [user, setUser] = useState<any>(null);
    
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
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#0f0f0f');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#0f0f0f');
        }

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUser(user);

            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tgId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
                if (tgId) setTelegramChatId(tgId.toString());
            }

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

    // ФУНКЦИЯ ДОБАВЛЕНИЯ УСЛУГИ (КОТОРОЙ НЕ ХВАТАЛО)
    const handleAddService = async () => {
        if (!newName || !newPrice || !user) return;
        setAddingService(true);
        await supabase.from("services").insert({ 
            user_id: user.id, 
            name: newName, 
            price: Number(newPrice) 
        });
        setNewName(""); 
        setNewPrice("");
        await loadData(user.id);
        setAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить услугу?")) {
            await supabase.from("services").delete().eq("id", id);
            await loadData(user!.id);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Удалить запись клиента?")) {
            await supabase.from("appointments").delete().eq("id", id);
            await loadData(user!.id);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
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
        await supabase.from("profiles").upsert(updates);
        setSaving(false);
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({ message: "Настройки сохранены ✨" });
        }
    };

    const profileUrl = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white font-sans pb-32">
            <div className="px-6 pt-8 pb-4 flex justify-between items-end">
                <div>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Telegram Mini App</p>
                    <h1 className="text-3xl font-bold tracking-tight">Кабинет</h1>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <LogOut className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <main className="px-4 space-y-6">
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/10 p-6 rounded-[32px] border border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500 rounded-xl"><LinkIcon className="w-4 h-4 text-white" /></div>
                        <span className="font-semibold text-sm">Ссылка для записи</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black/20 rounded-2xl p-4 text-[12px] text-blue-200 truncate font-mono border border-white/5">{profileUrl}</div>
                        <button onClick={() => {navigator.clipboard.writeText(profileUrl); alert("Скопировано!");}} className="bg-white text-black px-5 rounded-2xl active:scale-90 transition-all"><Copy className="w-4 h-4" /></button>
                    </div>
                </div>

                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5 space-y-6">
                    <h2 className="text-lg font-bold flex items-center gap-3"><User className="text-blue-400 w-5 h-5"/> Мастер</h2>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Имя или Название студии" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 transition-all" />
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-[11px] text-gray-500 uppercase font-bold block mb-4 px-1 text-center">Часы работы</label>
                        <div className="flex gap-3 items-center justify-center">
                            <select value={workStart} onChange={(e) => setWorkStart(Number(e.target.value))} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none appearance-none font-bold text-center w-24">{[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f0f0f]">{i}:00</option>)}</select>
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                            <select value={workEnd} onChange={(e) => setWorkEnd(Number(e.target.value))} className="bg-white/5 p-4 rounded-2xl border border-white/10 outline-none appearance-none font-bold text-center w-24">{[...Array(24)].map((_, i) => <option key={i} value={i} className="bg-[#0f0f0f]">{i}:00</option>)}</select>
                        </div>
                    </div>
                </section>

                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-3"><Briefcase className="text-pink-400 w-5 h-5"/> Услуги</h2>
                    <div className="flex gap-2 mb-6">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название" className="flex-[2] bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none" />
                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="₽" type="number" className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none" />
                        <button onClick={handleAddService} disabled={addingService} className="bg-pink-500 p-4 rounded-2xl active:scale-90 transition-all">
                            {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div>
                                    <p className="font-bold text-sm">{s.name}</p>
                                    <p className="text-emerald-400 text-xs font-mono">{s.price} ₽</p>
                                </div>
                                <button onClick={() => handleDeleteService(s.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-3"><Calendar className="text-emerald-400 w-5 h-5"/> Записи</h2>
                    <div className="space-y-4">
                        {appointments.length === 0 ? <p className="text-gray-600 text-center py-4 text-sm italic">Записей нет</p> : appointments.map(app => (
                            <div key={app.id} className="p-5 bg-white/5 rounded-[24px] border border-white/5 flex justify-between items-center">
                                <div className="space-y-1">
                                    <div className="text-emerald-400 font-black text-xl font-mono">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="font-bold text-sm">{app.client_name}</div>
                                    <div className="text-gray-500 text-[11px]">{app.service?.name}</div>
                                </div>
                                <button onClick={() => handleDeleteRecord(app.id)} className="p-2 text-gray-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/90 to-transparent">
                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-400 text-white py-5 rounded-[24px] font-bold text-lg shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Сохранить профиль"}
                </button>
            </div>
        </div>
    );
}