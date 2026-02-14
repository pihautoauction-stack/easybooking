"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Settings, Calendar as CalendarIcon, Save, Copy, Plus, 
    Loader2, Link as LinkIcon, User, ExternalLink, 
    Clock, CheckCircle2, Scissors, CalendarDays, UserCircle, Phone, X, MessageCircle, RefreshCw, Users, Search, Ban, BarChart3, TrendingUp, ImagePlus
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Tab = 'appointments' | 'services' | 'clients' | 'analytics' | 'profile';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [returnLink, setReturnLink] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<Tab>('appointments');

    // Настройки профиля
    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    
    // Списки
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); 
    
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [saving, setSaving] = useState(false);
    
    // Услуги
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [addingService, setAddingService] = useState(false);
    
    // Сотрудники
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpSpec, setNewEmpSpec] = useState("");
    const [addingEmp, setAddingEmp] = useState(false);

    const [activeServiceFilter, setActiveServiceFilter] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) { setUser(session.user); loadData(session.user.id); }
        });

        const init = async () => {
            try {
                if (!tg?.initData) {
                    setIsBrowser(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.refresh_token) setReturnLink(`tg://resolve?domain=my_cool_booking_bot&appname=app&startapp=${session.refresh_token}`);
                    setLoading(false); return;
                }
                tg.ready(); tg.expand();
                if (tg.setHeaderColor) tg.setHeaderColor('#050505');
                if (tg.setBackgroundColor) tg.setBackgroundColor('#050505');

                const startParam = tg.initDataUnsafe?.start_param;
                if (startParam && startParam.length > 40) {
                    const { data, error } = await supabase.auth.refreshSession({ refresh_token: startParam });
                    if (!error && data.session) window.history.replaceState({}, document.title, window.location.pathname);
                }

                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) router.replace("/login");
                else { setUser(authUser); await loadData(authUser.id); }
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };

        init();
        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase.channel('public:appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { loadData(user.id, true); }).subscribe();
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') loadData(user.id, true); };
        const handleFocus = () => loadData(user.id, true);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        const silentInterval = setInterval(() => { loadData(user.id, true); }, 10000);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            clearInterval(silentInterval);
        };
    }, [user?.id]);

    const loadData = async (userId: string, isSilent = false) => {
        if (!isSilent) setIsSyncing(true);
        try {
            const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
            if (p) {
                setRole(p.role || "solo");
                setBusinessName(p.business_name || "");
                setTelegramChatId(p.telegram_chat_id || "");
                setWorkStart(Number(p.work_start_hour) || 9);
                setWorkEnd(Number(p.work_end_hour) || 21);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
            }
            
            const { data: s } = await supabase.from("services").select("*").eq("user_id", userId).order('created_at');
            setServices(s || []);
            
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            setEmployees(e || []);
            
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, service:services(name, price), employee:employees(name)")
                .eq("master_id", userId)
                .gte('start_time', new Date(Date.now() - 86400000).toISOString())
                .order('start_time', { ascending: true });
            setAppointments(a || []);

            const { data: c } = await supabase.from("clients").select("*").eq("master_id", userId).order('created_at', { ascending: false });
            setClients(c || []);
            
            if (selectedApp && a && !a.find((app: any) => app.id === selectedApp.id)) setSelectedApp(null);
        } catch (error) { console.error(error); } finally {
            if (!isSilent) setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: user.id, business_name: businessName, telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart.toString(), work_end_hour: workEnd.toString(),
            disabled_days: disabledDays.join(','), updated_at: new Date(),
        });
        setSaving(false);
        if (window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({ message: error ? error.message : "Настройки сохранены! ✅" });
        else alert(error ? error.message : "Сохранено!");
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        setAddingService(true);
        const { error } = await supabase.from("services").insert({ user_id: user.id, name: newName, price: Number(newPrice), image_urls: [] });
        if (error) alert("Ошибка сохранения услуги: " + error.message);
        setNewName(""); setNewPrice(""); await loadData(user.id); setAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить эту услугу? (Существующие записи не удалятся)")) {
            await supabase.from("services").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const handleAddEmployee = async () => {
        if (!newEmpName) return;
        setAddingEmp(true);
        const { error } = await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec });
        if (error) alert("Ошибка сохранения сотрудника: " + error.message);
        setNewEmpName(""); setNewEmpSpec(""); await loadData(user.id); setAddingEmp(false);
    };

    const handleDeleteEmployee = async (id: string) => {
        if (confirm("Удалить сотрудника?")) { await supabase.from("employees").delete().eq("id", id); await loadData(user.id); }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Точно отменить запись клиента?")) {
            try {
                const { error } = await supabase.from("appointments").delete().eq("id", id);
                if (error) throw error; 
                await loadData(user.id); setSelectedApp(null); 
                if (window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({ message: "Успешно отменено" });
            } catch (err: any) { alert("Ошибка удаления (Supabase RLS): " + err.message); }
        }
    };

    const handleCompleteRecord = async (app: any) => {
        if (confirm("Завершить визит? Клиенту будет начислена сумма в статистику.")) {
            try {
                const { error: appError } = await supabase.from("appointments").update({ status: 'completed' }).eq("id", app.id);
                if (appError) throw appError;
                if (app.client_id && app.service?.price) {
                    const client = clients.find(c => c.id === app.client_id);
                    if (client) {
                        await supabase.from("clients").update({ visits_count: client.visits_count + 1, total_revenue: Number(client.total_revenue) + Number(app.service.price) }).eq("id", app.client_id);
                    }
                }
                await loadData(user.id, true); setSelectedApp(null);
                if (window.Telegram?.WebApp?.showPopup) window.Telegram.WebApp.showPopup({ message: "Визит завершен!" });
            } catch (err: any) { alert("Ошибка: " + err.message); }
        }
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean) => {
        if (confirm(currentStatus ? "Разблокировать клиента?" : "В черный список?")) {
            try { await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId); await loadData(user.id, true); } 
            catch (err: any) { alert("Ошибка: " + err.message); }
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadingImageId(serviceId);
        try {
            const fileExt = file.name.split('.').pop(); const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('gallery').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const newUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('services').update({ image_urls: newUrls }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка загрузки фото: " + err.message); } finally { setUploadingImageId(null); }
    };

    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        try {
            const newUrls = currentUrls.filter(url => url !== urlToRemove);
            await supabase.from('services').update({ image_urls: newUrls }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка удаления фото: " + err.message); }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    const clientLink = user ? `https://t.me/my_cool_booking_bot/app?startapp=${user.id}` : "";
    const filteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const totalVisits = clients.reduce((acc, c) => acc + Number(c.visits_count || 0), 0);

    if (loading) return ( <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white"><div className="p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)]"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" /></div></div> );

    if (isBrowser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#0a0f1c] flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 rounded-3xl sm:rounded-[2rem] shadow-2xl flex flex-col items-center w-full max-w-sm">
                    <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mb-4 sm:mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <h1 className="text-xl sm:text-2xl font-bold mb-2">Вход успешен</h1>
                    <p className="text-white/50 mb-6 sm:mb-8 text-xs sm:text-sm">Откройте приложение в Telegram.</p>
                    {returnLink && <a href={returnLink} className="w-full bg-blue-600/90 backdrop-blur-md hover:bg-blue-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform border border-blue-400/20"><ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" /> Открыть Кабинет</a>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] text-white font-sans selection:bg-blue-500/30 flex flex-col">
            
            <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3 items-center justify-center">
                        {isSyncing ? <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" /> : <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span></>}
                    </div>
                    <h1 className="text-base sm:text-lg font-bold drop-shadow-md truncate max-w-[150px] sm:max-w-[200px]">{businessName || "Ваш Кабинет"}</h1>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))} className="text-white/40 hover:text-red-400 p-1.5 sm:p-2 bg-white/5 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4 sm:w-5 sm:h-5" /></button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-5 pb-28 sm:pb-32 space-y-5">
                
                {/* 🟢 ЗАПИСИ */}
                {activeTab === 'appointments' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {services.length > 0 && appointments.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                <button onClick={() => setActiveServiceFilter(null)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border shrink-0 ${activeServiceFilter === null ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/50 border-transparent hover:bg-white/10'}`}>Все записи</button>
                                {services.map(s => <button key={s.id} onClick={() => setActiveServiceFilter(s.id)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border shrink-0 ${activeServiceFilter === s.id ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/50 border-transparent hover:bg-white/10'}`}>{s.name}</button>)}
                            </div>
                        )}

                        <div className="space-y-3 sm:space-y-4">
                            {filteredAppointments.length === 0 ? (
                                <div className="text-center py-10"><div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10"><CalendarIcon className="w-8 h-8 text-white/20" /></div><p className="text-white/40 text-sm">В этой категории пока нет записей</p></div>
                            ) : filteredAppointments.map(app => (
                                <div key={app.id} onClick={() => setSelectedApp(app)} className={`backdrop-blur-xl rounded-[1.5rem] p-4 sm:p-5 border shadow-lg relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all hover:bg-white/[0.04] ${app.status === 'completed' ? 'bg-emerald-900/10 border-emerald-500/20 opacity-70' : 'bg-white/[0.02] border-white/10'}`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -z-10 ${app.status === 'completed' ? 'bg-emerald-500/5' : 'bg-blue-500/5'}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`font-bold font-mono text-2xl drop-shadow-md ${app.status === 'completed' ? 'text-emerald-500/70' : 'text-blue-400'}`}>{format(new Date(app.start_time), "HH:mm")}</div>
                                                <div className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] sm:text-xs text-white/40 font-bold uppercase tracking-wider border border-white/5">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                {app.status === 'completed' && <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-bold uppercase tracking-wider">Завершено</div>}
                                            </div>
                                            <h3 className="text-white/90 text-sm sm:text-base font-bold">{app.client_name}</h3>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(app.id); }} className="text-white/20 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                                        <div className="flex justify-between items-center text-xs sm:text-sm text-white/60">
                                            <div className="flex items-center gap-2"><Scissors className="w-4 h-4 text-pink-400/70" /><span className="truncate">{app.service?.name || "Услуга удалена"}</span></div>
                                            {app.employee?.name && <span className="bg-white/5 px-2 py-1 rounded-md text-[10px] border border-white/5 text-white/50">{app.employee.name}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔵 УСЛУГИ */}
                {activeTab === 'services' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        <div className="bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -z-10"></div>
                            <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2"><Plus className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]"/> Добавить услугу</h2>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Стрижка, Маникюр..." className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 text-xs sm:text-sm outline-none focus:border-pink-500/50" />
                                <div className="flex gap-3">
                                    <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена ₽" type="number" className="w-full sm:w-32 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 text-xs sm:text-sm outline-none focus:border-pink-500/50 text-center" />
                                    <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="bg-pink-500/80 backdrop-blur-md px-6 rounded-xl sm:rounded-2xl active:scale-95 border border-pink-400/20 shadow-lg disabled:opacity-50 shrink-0 flex items-center justify-center"><Loader2 className={`w-5 h-5 ${addingService ? 'animate-spin' : 'hidden'} text-white`} /><Plus className={`w-5 h-5 text-white ${addingService ? 'hidden' : ''}`} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest pl-2">Список услуг ({services.length})</h3>
                            {services.map(s => (
                                <div key={s.id} className="flex flex-col bg-black/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm sm:text-base font-bold text-white/90 truncate pr-4">{s.name}</span>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-pink-400 font-bold px-3 py-1.5 bg-pink-500/10 rounded-lg border border-pink-500/10">{s.price} ₽</span>
                                            <label className="text-white/50 hover:text-blue-400 hover:bg-blue-500/10 p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer">
                                                {uploadingImageId === s.id ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-400" /> : <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, s.id, s.image_urls || [])} />
                                            </label>
                                            <button onClick={() => handleDeleteService(s.id)} className="text-white/30 hover:text-red-400 hover:bg-red-500/10 p-2 sm:p-2.5 rounded-xl transition-all"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                        </div>
                                    </div>
                                    {s.image_urls && s.image_urls.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x pt-2 border-t border-white/5">
                                            {s.image_urls.map((url: string, idx: number) => (
                                                <div key={idx} className="relative shrink-0 snap-center">
                                                    <img src={url} alt="portfolio" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                                                    <button onClick={() => handleRemoveImage(s.id, url, s.image_urls)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg active:scale-95"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟡 КЛИЕНТЫ (CRM) */}
                {activeTab === 'clients' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или номеру..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="space-y-3">
                            {filteredClients.length === 0 ? <p className="text-white/30 text-center py-8 text-sm">Клиенты не найдены</p> : filteredClients.map(client => (
                                <div key={client.id} className={`bg-white/[0.03] backdrop-blur-xl rounded-[1.5rem] p-4 sm:p-5 border shadow-lg relative overflow-hidden transition-all ${client.is_blacklisted ? 'border-red-500/30 bg-red-900/10 opacity-70' : 'border-white/10'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white/90 text-sm sm:text-base font-bold flex items-center gap-2">{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-md font-bold uppercase">Заблокирован</span>}</h3>
                                            <p className="text-indigo-400 font-mono text-xs mt-1">{client.phone}</p>
                                        </div>
                                        <button onClick={() => handleToggleBlacklist(client.id, client.is_blacklisted)} className={`p-2 rounded-xl transition-all ${client.is_blacklisted ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'}`}><Ban className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                                        <div className="bg-black/30 p-3 rounded-xl border border-white/5"><p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Визиты</p><p className="text-lg font-bold text-white/90">{client.visits_count}</p></div>
                                        <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"><p className="text-[10px] text-emerald-400/50 uppercase font-bold tracking-wider mb-1">Принес денег</p><p className="text-lg font-bold text-emerald-400">{client.total_revenue} ₽</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟢 АНАЛИТИКА И ДОХОДЫ */}
                {activeTab === 'analytics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
                                <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-wider mb-1">Общий доход</p>
                                <p className="text-2xl font-bold text-emerald-400">{totalRevenue} ₽</p>
                            </div>
                            <div className="bg-purple-500/10 p-5 rounded-3xl border border-purple-500/20 shadow-lg relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
                                <p className="text-[10px] text-purple-400/70 uppercase font-bold tracking-wider mb-1">Всего визитов</p>
                                <p className="text-2xl font-bold text-purple-400">{totalVisits}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-lg">
                            <h3 className="text-sm font-bold text-white/90 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> Топ-5 клиентов</h3>
                            <div className="space-y-3">
                                {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                    <div key={c.id} className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-300/20 text-gray-300' : i === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-white/5 text-white/40'}`}>{i + 1}</div>
                                            <span className="text-sm font-bold text-white/90">{c.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400">{c.total_revenue} ₽</span>
                                    </div>
                                ))}
                                {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-xs text-white/40 text-center py-4">Здесь появятся ваши лучшие клиенты.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* 🟣 ПРОФИЛЬ (И КОМАНДА САЛОНА) */}
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        
                        <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                            <h2 className="text-[10px] sm:text-[11px] font-bold uppercase text-blue-400/80 mb-3 tracking-widest flex items-center gap-2"><LinkIcon className="w-3 h-3" /> Ссылка для клиентов</h2>
                            <div className="flex gap-2">
                                <input readOnly value={clientLink} className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-[10px] sm:text-[11px] text-white/70 outline-none font-mono" />
                                <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-blue-600/80 backdrop-blur-md px-5 rounded-2xl active:scale-95 border border-blue-400/20 shadow-lg"><Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></button>
                            </div>
                        </div>

                        {role === 'owner' && (
                            <div className="bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
                                <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2"><Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400"/> Команда салона</h2>
                                
                                <div className="flex flex-col gap-3 mb-5">
                                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Имя мастера (напр. Анна)" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs sm:text-sm outline-none focus:border-indigo-500/50" />
                                    <div className="flex gap-3">
                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} placeholder="Специализация (Маникюр)" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs sm:text-sm outline-none focus:border-indigo-500/50" />
                                        <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="bg-indigo-500/80 backdrop-blur-md px-6 rounded-xl active:scale-95 border border-indigo-400/20 shadow-lg disabled:opacity-50 shrink-0 flex items-center justify-center">
                                            {addingEmp ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-5 h-5 text-white" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="text-sm font-bold text-white/90">{emp.name}</p>
                                                {emp.specialty && <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{emp.specialty}</p>}
                                            </div>
                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-white/30 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {employees.length === 0 && <p className="text-xs text-white/40 text-center py-2">Добавьте сотрудников, чтобы клиенты могли к ним записываться.</p>}
                                </div>
                            </div>
                        )}

                        <div className="bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl">
                            <h2 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2"><Settings className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"/> Настройки бизнеса</h2>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] sm:text-[11px] text-white/50 uppercase font-bold tracking-wider ml-1">Название</label>
                                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Мой салон..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm outline-none focus:border-blue-500/50" />
                                </div>
                                <div className="pt-2">
                                    <label className="text-[10px] sm:text-[11px] text-white/50 uppercase font-bold tracking-wider block mb-3 ml-1">Дни работы</label>
                                    <div className="flex justify-between gap-1 mb-4">
                                        {DAYS.map((d) => (
                                            <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all border ${!disabledDays.includes(d.id) ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]" : "bg-black/40 text-white/30 border-white/5 hover:bg-white/5"}`}>{d.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] sm:text-[11px] text-white/50 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Открытие (час)</label>
                                        <input type="number" min="0" max="23" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm outline-none focus:border-blue-500/50 text-center font-mono text-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] sm:text-[11px] text-white/50 uppercase font-bold ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Закрытие (час)</label>
                                        <input type="number" min="0" max="23" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm outline-none focus:border-blue-500/50 text-center font-mono text-lg" />
                                    </div>
                                </div>
                                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm sm:text-base shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 mt-2 transition-all">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить профиль"}</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 w-full z-40 bg-[#050505]/90 backdrop-blur-2xl border-t border-white/10 pb-safe pt-2 px-2 sm:px-6 pb-6">
                <div className="flex justify-between items-center max-w-sm mx-auto pt-2 px-2">
                    <button onClick={() => setActiveTab('appointments')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'appointments' ? 'text-blue-400 scale-110' : 'text-white/40 hover:text-white/70'}`}><div className={`p-2 rounded-xl transition-colors ${activeTab === 'appointments' ? 'bg-blue-500/10' : 'bg-transparent'}`}><CalendarDays className="w-5 h-5" /></div><span className="text-[9px] font-bold tracking-wider">Записи</span></button>
                    <button onClick={() => setActiveTab('services')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'services' ? 'text-pink-400 scale-110' : 'text-white/40 hover:text-white/70'}`}><div className={`p-2 rounded-xl transition-colors ${activeTab === 'services' ? 'bg-pink-500/10' : 'bg-transparent'}`}><Scissors className="w-5 h-5" /></div><span className="text-[9px] font-bold tracking-wider">Услуги</span></button>
                    <button onClick={() => setActiveTab('clients')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'clients' ? 'text-indigo-400 scale-110' : 'text-white/40 hover:text-white/70'}`}><div className={`p-2 rounded-xl transition-colors ${activeTab === 'clients' ? 'bg-indigo-500/10' : 'bg-transparent'}`}><Users className="w-5 h-5" /></div><span className="text-[9px] font-bold tracking-wider">Клиенты</span></button>
                    <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'analytics' ? 'text-emerald-400 scale-110' : 'text-white/40 hover:text-white/70'}`}><div className={`p-2 rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-emerald-500/10' : 'bg-transparent'}`}><BarChart3 className="w-5 h-5" /></div><span className="text-[9px] font-bold tracking-wider">Доход</span></button>
                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-gray-400 scale-110' : 'text-white/40 hover:text-white/70'}`}><div className={`p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-gray-500/10' : 'bg-transparent'}`}><UserCircle className="w-5 h-5" /></div><span className="text-[9px] font-bold tracking-wider">Профиль</span></button>
                </div>
            </nav>

            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedApp(null)}>
                    <div className="bg-[#0f172a] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        <h2 className="text-lg font-bold mb-6 text-white/90">Детали записи</h2>
                        
                        <div className="space-y-5">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Клиент</p>
                                <p className="text-xl font-bold text-white/90">{selectedApp.client_name}</p>
                                <p className="text-sm font-mono text-blue-400 mt-1">{selectedApp.client_phone}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4">
                                <div><p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Дата и Время</p><p className="text-base font-bold text-emerald-400">{format(new Date(selectedApp.start_time), "d MMMM", { locale: ru })}</p><p className="text-sm font-mono text-emerald-400/70">{format(new Date(selectedApp.start_time), "HH:mm")}</p></div>
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Услуга</p>
                                    <p className="text-sm font-bold text-white/90">{selectedApp.service?.name}</p>
                                    {selectedApp.employee?.name && <p className="text-[10px] text-indigo-400 uppercase tracking-widest mt-1">К мастеру: {selectedApp.employee.name}</p>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-500/10 text-emerald-400 font-bold py-3.5 rounded-2xl border border-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Завершить визит</button>}
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-blue-600/90 text-white font-bold py-3.5 rounded-2xl text-center shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"><Phone className="w-4 h-4" /></a>
                                    <a href={`https://wa.me/${getCleanPhone(selectedApp.client_phone)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-600/90 text-white font-bold py-3.5 rounded-2xl text-center shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                                </div>
                                {selectedApp.status !== 'completed' && <button onClick={() => handleDeleteRecord(selectedApp.id)} className="w-full bg-white/5 text-white/40 font-bold py-3.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-4 h-4" /> Отменить запись</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}