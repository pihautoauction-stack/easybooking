"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus, 
    Loader2, Briefcase, CalendarDays, UserCircle, Phone, X, MessageCircle, 
    RefreshCw, Users, Search, Ban, BarChart3, ImagePlus, CheckCircle2, Clock, Coffee, UserPlus, Archive, Edit3, Camera
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Tab = 'appointments' | 'services' | 'clients' | 'analytics' | 'profile';

const NAV_ITEMS = [
    { id: 'appointments', icon: CalendarDays, label: 'Журнал' },
    { id: 'services', icon: Briefcase, label: 'Услуги' },
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'analytics', icon: BarChart3, label: 'Аналитика' },
    { id: 'profile', icon: UserCircle, label: 'Настройки' }
];

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<Tab>('appointments');
    const [journalView, setJournalView] = useState<'active' | 'archive'>('active');

    // Настройки профиля
    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState("");
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    
    const [workStartTime, setWorkStartTime] = useState("09:00");
    const [workEndTime, setWorkEndTime] = useState("20:00");
    const [scheduleStep, setScheduleStep] = useState(30);
    const [breaks, setBreaks] = useState<{start: string, end: string}[]>([]);
    
    const [newBreakStart, setNewBreakStart] = useState("13:00");
    const [newBreakEnd, setNewBreakEnd] = useState("14:00");
    
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); 
    
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [saving, setSaving] = useState(false);
    
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newDuration, setNewDuration] = useState("60");
    const [newServiceEmpId, setNewServiceEmpId] = useState(""); 
    const [addingService, setAddingService] = useState(false);
    
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpSpec, setNewEmpSpec] = useState("");
    const [addingEmp, setAddingEmp] = useState(false);

    const [activeServiceFilter, setActiveServiceFilter] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    // ПОРТФОЛИО
    const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

    // РУЧНАЯ ЗАПИСЬ
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualName, setManualName] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualService, setManualService] = useState("");
    const [manualEmployee, setManualEmployee] = useState("");
    const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [manualTime, setManualTime] = useState("12:00");
    const [addingManual, setAddingManual] = useState(false);

    // CRM
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientNote, setClientNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) { setUser(session.user); loadData(session.user.id); } 
            else { router.replace("/login"); }
        });

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { router.replace("/login"); return; }
                setUser(session.user);
                await loadData(session.user.id);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };

        init();
        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase.channel('public:appointments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { loadData(user.id, true); }).subscribe();
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') loadData(user.id, true); };
        const handleFocus = () => loadData(user.id, true);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        const silentInterval = setInterval(() => { loadData(user.id, true); }, 15000);

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
                setUsername(p.username || "");
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
                if (p.work_start_time) setWorkStartTime(p.work_start_time);
                if (p.work_end_time) setWorkEndTime(p.work_end_time);
                if (p.schedule_step) setScheduleStep(p.schedule_step);
                if (p.breaks) setBreaks(typeof p.breaks === 'string' ? JSON.parse(p.breaks) : p.breaks || []);
                // Загружаем портфолио
                if (p.portfolio_urls) setPortfolioUrls(typeof p.portfolio_urls === 'string' ? JSON.parse(p.portfolio_urls) : p.portfolio_urls);
            }
            
            const { data: s } = await supabase.from("services").select("*, employee:employees(name)").eq("user_id", userId).order('created_at');
            setServices(s || []);
            
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            setEmployees(e || []);
            
            const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, service:services(name, price, duration), employee:employees(name)")
                .eq("master_id", userId).gte('start_time', ninetyDaysAgo.toISOString()).order('start_time', { ascending: true });
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
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        try {
            const { error } = await supabase.from("profiles").upsert({
                id: user.id, business_name: businessName, username: cleanUsername || null, disabled_days: disabledDays.join(','), 
                work_start_time: workStartTime, work_end_time: workEndTime,
                schedule_step: scheduleStep, breaks: breaks, portfolio_urls: portfolioUrls, updated_at: new Date(),
            });
            if (error) throw error;
            setUsername(cleanUsername);
            alert("Настройки успешно сохранены!");
        } catch (err: any) {
            if (err.code === '23505') alert("Этот короткий никнейм уже занят! Придумайте другой.");
            else alert("Ошибка: " + err.message);
        } finally { setSaving(false); }
    };

    // ФУНКЦИИ ПОРТФОЛИО
    const handleUploadPortfolioImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; 
        setUploadingPortfolio(true);
        try {
            const fileName = `portfolio_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
            const filePath = `${user.id}/${fileName}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const newUrls = [...portfolioUrls, data.publicUrl];
            setPortfolioUrls(newUrls);
            await supabase.from('profiles').update({ portfolio_urls: newUrls }).eq('id', user.id);
        } catch (err: any) { alert("Ошибка загрузки: " + err.message); } finally { setUploadingPortfolio(false); }
    };

    const handleRemovePortfolioImage = async (urlToRemove: string) => {
        if (!confirm("Удалить фото из портфолио?")) return;
        const newUrls = portfolioUrls.filter(url => url !== urlToRemove);
        setPortfolioUrls(newUrls);
        await supabase.from('profiles').update({ portfolio_urls: newUrls }).eq('id', user.id);
    };

    const handleAddBreak = () => { if (newBreakStart && newBreakEnd) { setBreaks([...breaks, { start: newBreakStart, end: newBreakEnd }]); setNewBreakStart("13:00"); setNewBreakEnd("14:00"); } };
    const handleRemoveBreak = (index: number) => setBreaks(breaks.filter((_, i) => i !== index));

    const handleAddService = async () => {
        if (!newName || !newPrice || !newDuration) return;
        setAddingService(true);
        const insertData: any = { user_id: user.id, name: newName, price: Number(newPrice), duration: Number(newDuration), image_urls: [] };
        if (role === 'owner' && newServiceEmpId) insertData.employee_id = newServiceEmpId;
        await supabase.from("services").insert(insertData);
        setNewName(""); setNewPrice(""); setNewDuration("60"); setNewServiceEmpId(""); await loadData(user.id); setAddingService(false);
    };

    const handleDeleteService = async (id: string) => { if (confirm("Удалить эту услугу?")) { await supabase.from("services").delete().eq("id", id); await loadData(user.id); } };
    const handleAddEmployee = async () => {
        if (!newEmpName) return; setAddingEmp(true);
        await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec });
        setNewEmpName(""); setNewEmpSpec(""); await loadData(user.id); setAddingEmp(false);
    };
    const handleDeleteEmployee = async (id: string) => { if (confirm("Удалить сотрудника?")) { await supabase.from("employees").delete().eq("id", id); await loadData(user.id); } };
    const handleDeleteRecord = async (id: string) => { if (confirm("Точно удалить запись?")) { await supabase.from("appointments").delete().eq("id", id); await loadData(user.id); setSelectedApp(null); } };

    const handleCompleteRecord = async (app: any) => {
        if (confirm("Успешно завершить визит? Он будет перемещен в Архив.")) {
            await supabase.from("appointments").update({ status: 'completed' }).eq("id", app.id);
            let targetClientId = app.client_id;
            if (!targetClientId && app.client_phone) {
                const { data: existingClient } = await supabase.from("clients").select("id, visits_count, total_revenue").eq("master_id", user.id).eq("phone", app.client_phone).maybeSingle();
                if (existingClient) targetClientId = existingClient.id;
            }
            const price = Number(app.service?.price || 0);
            if (targetClientId) {
                const client = clients.find(c => c.id === targetClientId);
                if (client) await supabase.from("clients").update({ visits_count: client.visits_count + 1, total_revenue: Number(client.total_revenue) + price }).eq("id", targetClientId);
            } else if (app.client_phone) {
                await supabase.from("clients").insert({ master_id: user.id, name: app.client_name, phone: app.client_phone, visits_count: 1, total_revenue: price, is_blacklisted: false, notes: "" });
            }
            await loadData(user.id, true); setSelectedApp(null); setJournalView('archive');
        }
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (confirm(currentStatus ? "Разблокировать клиента?" : "Добавить в ЧС?")) { await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId); await loadData(user.id, true); }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingImageId(serviceId);
        try {
            const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
            const filePath = `${user.id}/${fileName}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            await supabase.from('services').update({ image_urls: [...(currentUrls || []), data.publicUrl] }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingImageId(null); }
    };
    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        await supabase.from('services').update({ image_urls: currentUrls.filter(url => url !== urlToRemove) }).eq('id', serviceId); await loadData(user.id, true);
    };

    const handleAddManualBooking = async (e: React.FormEvent) => {
        e.preventDefault(); if (!manualName || !manualService || !manualDate || !manualTime) return; setAddingManual(true);
        try {
            await supabase.from('appointments').insert({
                master_id: user.id, service_id: manualService, employee_id: manualEmployee || null,
                client_name: manualName, client_phone: manualPhone, start_time: new Date(`${manualDate}T${manualTime}:00`).toISOString(), status: 'active'
            });
            setShowManualModal(false); setManualName(""); setManualPhone(""); setManualService(""); await loadData(user.id, true); setJournalView('active');
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setAddingManual(false); }
    };

    const handleSaveClientNote = async () => {
        if (!selectedClient) return; setSavingNote(true);
        try {
            await supabase.from('clients').update({ notes: clientNote }).eq('id', selectedClient.id);
            setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, notes: clientNote } : c));
            setSelectedClient({ ...selectedClient, notes: clientNote });
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setSavingNote(false); }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${username || user.id}` : "";
    
    const serviceFilteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const activeApps = serviceFilteredAppointments.filter(a => a.status === 'active');
    const archivedApps = serviceFilteredAppointments.filter(a => a.status === 'completed').reverse();
    const displayApps = journalView === 'active' ? activeApps : archivedApps;

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const totalVisits = clients.reduce((acc, c) => acc + Number(c.visits_count || 0), 0);

    const getWhatsAppLink = (app: any) => {
        if (!app.client_phone) return "#";
        const dateStr = format(new Date(app.start_time), "d MMMM", { locale: ru });
        const timeStr = format(new Date(app.start_time), "HH:mm");
        const text = `Здравствуйте, ${app.client_name}! 🌸\n\nНапоминаю о вашей записи на услугу "${app.service?.name}".\n\n🗓 Дата: ${dateStr}\n⏰ Время: ${timeStr}\n\nБуду вас ждать!`;
        return `https://wa.me/${getCleanPhone(app.client_phone)}?text=${encodeURIComponent(text)}`;
    };

    const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

    if (loading) return ( <div className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-rose-400" /></div> );

    return (
        <div className="flex h-[100dvh] bg-[#FAF9F6] text-stone-800 font-sans selection:bg-rose-200 antialiased overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="hidden md:flex w-72 bg-white border-r border-stone-200 flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-6 flex items-center gap-3 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                        <span className="font-bold text-white tracking-tight text-sm">EB</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-black text-stone-900 tracking-tight text-sm leading-tight">EasyBooking</h2>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-tight mt-0.5">Premium</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {NAV_ITEMS.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id ? 'bg-rose-50 text-rose-600 shadow-sm border-l-4 border-rose-400' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 border-l-4 border-transparent'}`}>
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-rose-500' : 'text-stone-400'}`} />{tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-stone-100">
                    <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                            {isSyncing ? <RefreshCw className="w-3 h-3 text-stone-400 animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>}
                        </div>
                        <span className="text-xs font-bold text-stone-600 truncate">{businessName || "Настройте профиль"}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 transition-all shadow-sm"><LogOut className="w-4 h-4" /> Выйти</button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                
                {/* MOBILE HEADER */}
                <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200 px-5 py-3.5 flex justify-between items-center transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="font-bold text-white text-xs tracking-tight">EB</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-sm font-black tracking-tight text-stone-900">Кабинет</h1>
                                <div className="relative flex h-2 w-2 items-center justify-center">
                                    {isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-stone-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                </div>
                            </div>
                            <span className="text-[10px] text-stone-400 truncate max-w-[140px] font-bold leading-none">{businessName || "Настройте профиль"}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-stone-400 hover:text-rose-500 p-2 bg-stone-50 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
                </header>

                <header className="hidden md:flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-stone-200 px-8 py-5 z-10 shrink-0">
                    <h1 className="text-2xl font-black tracking-tight text-stone-900">{NAV_ITEMS.find(t => t.id === activeTab)?.label}</h1>
                    <div className="flex items-center gap-4"><span className="text-xs font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-3 py-1.5 rounded-lg">{format(new Date(), "d MMMM, EEEE", { locale: ru })}</span></div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        
                        {/* 🟢 ЖУРНАЛ */}
                        {activeTab === 'appointments' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                                        <button onClick={() => setJournalView('active')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${journalView === 'active' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Активные</button>
                                        <button onClick={() => setJournalView('archive')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${journalView === 'archive' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><Archive className="w-4 h-4"/> Архив</button>
                                    </div>
                                    <button onClick={() => setShowManualModal(true)} className="bg-gradient-to-r from-rose-400 to-orange-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:opacity-90">
                                        <Plus className="w-4 h-4"/> Ручная запись
                                    </button>
                                </div>

                                {services.length > 0 && appointments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 mb-2">
                                        <button onClick={() => setActiveServiceFilter(null)} className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-[0.97] border ${activeServiceFilter === null ? 'bg-stone-800 text-white border-transparent shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>Все</button>
                                        {services.map(s => <button key={s.id} onClick={() => setActiveServiceFilter(s.id)} className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-[0.97] border ${activeServiceFilter === s.id ? 'bg-stone-800 text-white border-transparent shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>{s.name}</button>)}
                                    </div>
                                )}

                                {displayApps.length === 0 ? (
                                    <div className="text-center py-20 bg-white border border-stone-200 rounded-[32px] shadow-sm">
                                        <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            {journalView === 'active' ? <CalendarIcon className="w-7 h-7 text-stone-300" /> : <Archive className="w-7 h-7 text-stone-300" />}
                                        </div>
                                        <p className="text-stone-400 text-sm font-bold">{journalView === 'active' ? 'Нет активных записей' : 'Архив пуст'}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {displayApps.map(app => (
                                            <div key={app.id} onClick={() => setSelectedApp(app)} className={`rounded-[28px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border ${journalView === 'archive' ? 'border-l-4 border-l-emerald-300 border-y-stone-100 border-r-stone-100 opacity-80 shadow-sm' : 'border-l-4 border-l-rose-400 border-y-stone-100 border-r-stone-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-rose-200 hover:shadow-md'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className={`font-black text-2xl tracking-tight ${journalView === 'archive' ? 'text-stone-400' : 'text-stone-800'}`}>{format(new Date(app.start_time), "HH:mm")}</div>
                                                            <div className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] text-stone-500 font-black uppercase tracking-widest">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                            {journalView === 'archive' && <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] rounded-lg font-black uppercase tracking-widest">Завершено</div>}
                                                        </div>
                                                        <h3 className="text-stone-800 text-base font-black tracking-tight">{app.client_name}</h3>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-stone-500 pt-4 mt-2 border-t border-stone-50">
                                                    <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-2 py-1 rounded-md font-bold text-xs"><Briefcase className="w-3.5 h-3.5" /><span className="truncate">{app.service?.name || "Услуга удалена"}</span></div>
                                                    {app.employee?.name && <span className="text-stone-400 font-bold text-[11px] truncate max-w-[100px]">{app.employee.name}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🔵 УСЛУГИ */}
                        {activeTab === 'services' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-6">
                                        {role === 'owner' && (
                                            <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm">
                                                <h2 className="text-lg font-black tracking-tight mb-5 text-stone-800">Команда</h2>
                                                <div className="flex flex-col gap-3 mb-6">
                                                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Имя" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 placeholder-stone-400" />
                                                    <div className="flex gap-2">
                                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} placeholder="Должность" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 placeholder-stone-400" />
                                                        <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="bg-stone-800 text-white w-12 rounded-xl active:scale-[0.92] transition-all disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md hover:bg-black">
                                                            {addingEmp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {employees.map(emp => (
                                                        <div key={emp.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                                                            <div><p className="text-sm font-bold text-stone-800">{emp.name}</p>{emp.specialty && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">{emp.specialty}</p>}</div>
                                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-rose-500 bg-white p-2 rounded-lg shadow-sm hover:bg-rose-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm">
                                            <h2 className="text-lg font-black tracking-tight mb-5 text-stone-800">Добавить услугу</h2>
                                            <div className="flex flex-col gap-3">
                                                {role === 'owner' && (
                                                    <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 appearance-none">
                                                        <option value="">Общая услуга</option>
                                                        {employees.map(emp => <option key={emp.id} value={emp.id}>Только: {emp.name}</option>)}
                                                    </select>
                                                )}
                                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 placeholder-stone-400" />
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">Мин</span>
                                                        <input value={newDuration} onChange={e => setNewDuration(e.target.value)} type="number" placeholder="60" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 placeholder-stone-400" />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₽</span>
                                                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-8 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all text-stone-800 placeholder-stone-400" />
                                                    </div>
                                                </div>
                                                <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="w-full mt-2 bg-gradient-to-r from-rose-400 to-orange-300 text-white p-3.5 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-rose-500/20 flex justify-center items-center">
                                                    {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-4">
                                        <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-2 mb-2 hidden lg:block">Все услуги</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {services.length === 0 ? <p className="text-center text-stone-400 text-sm py-4 col-span-full font-bold">Услуг пока нет</p> : services.map(s => (
                                                <div key={s.id} className="bg-white p-5 rounded-[28px] border border-stone-200 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-colors">
                                                    <div>
                                                        <div className="flex justify-between items-start gap-3 mb-3">
                                                            <span className="text-base font-black tracking-tight text-stone-800 leading-tight group-hover:text-rose-500 transition-colors">{s.name}</span>
                                                            <span className="text-emerald-600 font-black text-lg bg-emerald-50 px-2.5 py-1 rounded-xl shrink-0">{s.price} ₽</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> {s.duration || 60} мин</span>
                                                            {s.employee?.name && <span className="text-[10px] bg-rose-50 text-rose-500 px-2 py-1 rounded-md font-black uppercase tracking-widest truncate">Мастер: {s.employee.name}</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    {s.image_urls && s.image_urls.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x mb-2">
                                                            {s.image_urls.map((url: string, idx: number) => (
                                                                <div key={idx} className="relative shrink-0 snap-center">
                                                                    <img src={url} alt="Услуга" className="w-16 h-16 object-cover rounded-xl shadow-sm border border-stone-100" />
                                                                    <button onClick={() => handleRemoveImage(s.id, url, s.image_urls)} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md active:scale-95"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-4 border-t border-stone-50">
                                                        <label className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl transition-all active:scale-[0.92] cursor-pointer font-bold text-xs uppercase tracking-widest flex items-center gap-2 flex-1 justify-center">
                                                            {uploadingImageId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImagePlus className="w-4 h-4" /> Фотографии</>}
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, s.id, s.image_urls || [])} />
                                                        </label>
                                                        <button onClick={() => handleDeleteService(s.id)} className="text-stone-400 hover:text-rose-500 bg-stone-50 hover:bg-rose-50 p-2.5 rounded-xl active:scale-[0.92] transition-all shrink-0"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🟡 КЛИЕНТЫ (CRM) */}
                        {activeTab === 'clients' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                                <div className="relative max-w-xl mx-auto md:max-w-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                    <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или телефону..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredClients.length === 0 ? <p className="text-stone-400 text-center py-10 font-bold text-sm col-span-full">Клиенты не найдены</p> : filteredClients.map(client => (
                                        <div 
                                            key={client.id} 
                                            onClick={() => { setSelectedClient(client); setClientNote(client.notes || ""); }}
                                            className={`p-5 rounded-[28px] border transition-all cursor-pointer hover:shadow-md ${client.is_blacklisted ? 'border-rose-100 bg-rose-50/50' : 'bg-white border-stone-200 shadow-sm hover:border-rose-200'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${client.is_blacklisted ? 'text-stone-400' : 'text-stone-800'}`}>{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-md font-black uppercase tracking-widest">В ЧС</span>}</h3>
                                                    <p className="text-stone-500 font-bold text-sm mt-0.5">{client.phone}</p>
                                                </div>
                                                <button onClick={(e) => handleToggleBlacklist(client.id, client.is_blacklisted, e)} className={`p-2.5 rounded-xl active:scale-[0.92] transition-all shadow-sm ${client.is_blacklisted ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100' : 'text-stone-400 bg-stone-50 hover:bg-rose-50 hover:text-rose-500 border border-stone-100'}`}><Ban className="w-4 h-4" /></button>
                                            </div>
                                            
                                            {client.notes && (
                                                <div className="mb-4 bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-xs font-medium text-orange-800 line-clamp-2 leading-relaxed">
                                                    <Edit3 className="w-3 h-3 inline mr-1 mb-0.5 opacity-60" />{client.notes}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-100">
                                                <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Визиты</p><p className="text-lg font-black tracking-tight text-stone-800">{client.visits_count}</p></div>
                                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Доход</p><p className="text-lg font-black tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 🟢 АНАЛИТИКА */}
                        {activeTab === 'analytics' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="col-span-2 bg-gradient-to-br from-emerald-400 to-emerald-500 p-6 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                        <p className="text-xs text-emerald-100 font-black uppercase tracking-widest mb-1 relative z-10">Общий доход</p>
                                        <p className="text-4xl font-black tracking-tight relative z-10">{totalRevenue} <span className="text-2xl opacity-80">₽</span></p>
                                    </div>
                                    <div className="col-span-2 bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                                        <p className="text-xs text-rose-500 font-black uppercase tracking-widest mb-1">Всего визитов</p>
                                        <p className="text-4xl font-black tracking-tight text-stone-800">{totalVisits}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                                    <h3 className="text-xl font-black tracking-tight text-stone-800 mb-6 flex items-center gap-2">Топ-5 клиентов</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                            <div key={c.id} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-4 sm:p-5 rounded-2xl hover:border-rose-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white' : i === 1 ? 'bg-gradient-to-br from-stone-300 to-stone-400 text-white' : i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' : 'bg-white text-stone-400 border border-stone-200'}`}>{i + 1}</div>
                                                    <div>
                                                        <span className="text-base font-bold text-stone-800 block">{c.name}</span>
                                                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Визитов: {c.visits_count}</span>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-black tracking-tight text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">{c.total_revenue} ₽</span>
                                            </div>
                                        ))}
                                        {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-center text-stone-400 text-sm py-4 col-span-full font-bold">Пока нет данных для топа</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🟣 ПРОФИЛЬ И НАСТРОЙКИ (С ПОРТФОЛИО) */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                
                                <div className="bg-gradient-to-br from-rose-400 to-orange-300 p-8 rounded-[32px] shadow-xl shadow-rose-500/20 relative overflow-hidden text-white">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>
                                    <h2 className="text-xs font-black uppercase text-rose-100 mb-4 tracking-widest relative z-10">Ваша ссылка для записи</h2>
                                    <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                        <input readOnly value={clientLink} className="flex-1 bg-black/10 border border-white/20 rounded-2xl p-4 text-sm font-bold text-white outline-none truncate font-mono shadow-inner placeholder-white/50" />
                                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-white text-rose-500 px-8 py-4 rounded-2xl active:scale-[0.96] transition-all shadow-md font-black flex justify-center items-center gap-2 hover:bg-stone-50"><Copy className="w-5 h-5" /> Скопировать</button>
                                    </div>
                                    <p className="text-[11px] text-rose-100 mt-4 relative z-10 font-bold uppercase tracking-widest">Разместите эту ссылку в Instagram, WhatsApp или VK.</p>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                                    <h2 className="text-xl font-black tracking-tight mb-8 text-stone-800">Настройки кабинета</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Ваше Имя / Название</label>
                                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Например: Anna Nails" className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Короткая ссылка (Никнейм)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">.../book/</span>
                                                    <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="anna-nails" className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pr-4 pl-20 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2 pt-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block ml-1 mb-2">Рабочие дни (Зеленые)</label>
                                                <div className="flex justify-between gap-1.5 sm:gap-2">
                                                    {DAYS.map((d) => (
                                                        <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3.5 sm:py-4 rounded-2xl text-[11px] sm:text-xs font-black transition-all active:scale-95 ${!disabledDays.includes(d.id) ? "bg-emerald-400 text-white shadow-md shadow-emerald-400/20" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}>{d.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6 lg:border-l lg:border-stone-100 lg:pl-12">
                                            <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest"><Clock className="w-4 h-4 text-rose-400"/> Расписание</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-widest ml-1">Начало работы</label>
                                                    <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-base font-black outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 text-center transition-all shadow-sm hover:border-rose-300" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-widest ml-1">Конец работы</label>
                                                    <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-base font-black outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 text-center transition-all shadow-sm hover:border-rose-300" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Сетка времени</label>
                                                <div className="relative">
                                                    <select value={scheduleStep} onChange={e => setScheduleStep(Number(e.target.value))} className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 appearance-none transition-all cursor-pointer hover:bg-stone-100">
                                                        <option value={15}>Каждые 15 минут</option>
                                                        <option value={30}>Каждые 30 минут</option>
                                                        <option value={60}>Каждый час</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 font-bold">▼</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-4 border-t border-stone-100">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Перерывы</label>
                                                {breaks.map((br, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-stone-50 border border-stone-200 p-3 rounded-2xl shadow-sm">
                                                        <span className="flex-1 font-black text-stone-800 text-center tracking-wider">{br.start} — {br.end}</span>
                                                        <button onClick={() => handleRemoveBreak(idx)} className="p-2.5 bg-white border border-stone-200 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm"><X className="w-4 h-4"/></button>
                                                    </div>
                                                ))}

                                                <div className="flex gap-2 items-center bg-stone-50 p-2 rounded-2xl border border-stone-200">
                                                    <input type="time" value={newBreakStart} onChange={e => setNewBreakStart(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-rose-400" />
                                                    <span className="text-stone-400 font-black">-</span>
                                                    <input type="time" value={newBreakEnd} onChange={e => setNewBreakEnd(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-rose-400" />
                                                    <button onClick={handleAddBreak} className="bg-stone-800 text-white p-3 rounded-xl font-bold active:scale-95 transition-all shadow-sm hover:bg-black"><Plus className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* БЛОК ПОРТФОЛИО */}
                                    <div className="mt-8 pt-8 border-t border-stone-100">
                                        <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest mb-4"><Camera className="w-4 h-4 text-rose-400"/> Галерея работ</h3>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-4">Эти фотографии будут видны всем клиентам на вашей странице записи</p>
                                        
                                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                            {portfolioUrls.map((url, idx) => (
                                                <div key={idx} className="relative shrink-0 snap-center">
                                                    <img src={url} alt="Портфолио" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-[24px] shadow-sm border border-stone-200" />
                                                    <button onClick={() => handleRemovePortfolioImage(url)} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-2 shadow-md border border-rose-100 hover:bg-rose-50 active:scale-95 transition-all"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            
                                            <label className="shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-[24px] border-2 border-dashed border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95">
                                                {uploadingPortfolio ? <Loader2 className="w-6 h-6 animate-spin text-rose-400" /> : (
                                                    <>
                                                        <Plus className="w-8 h-8 text-rose-400 mb-2" />
                                                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Добавить</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadPortfolioImage} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-stone-100">
                                        <button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto md:min-w-[240px] md:float-right bg-stone-900 text-white py-4 px-8 rounded-2xl font-black text-base shadow-lg shadow-stone-900/20 active:scale-[0.98] transition-all flex items-center justify-center hover:bg-black">
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить настройки"}
                                        </button>
                                        <div className="clear-both"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white/90 backdrop-blur-xl border-t border-stone-200 pb-safe pt-2 px-2">
                    <div className="flex justify-between items-center max-w-sm mx-auto pb-4 pt-1">
                        {NAV_ITEMS.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all w-16 active:scale-95 ${activeTab === tab.id ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}>
                                <div className="p-1.5"><tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-rose-500/10 stroke-2' : 'stroke-[1.5]'}`} /></div>
                                <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* МОДАЛКА КЛИЕНТА... */}
            {selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full active:scale-90 transition-all border border-stone-100"><X className="w-5 h-5" /></button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                                <UserCircle className="w-8 h-8 text-rose-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-stone-800 leading-tight">{selectedClient.name}</h2>
                                <p className="text-sm font-bold text-stone-500 mt-0.5">{selectedClient.phone}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Всего визитов</p><p className="text-2xl font-black tracking-tight text-stone-800">{selectedClient.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Общий доход</p><p className="text-2xl font-black tracking-tight text-emerald-600">{selectedClient.total_revenue} ₽</p></div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5"/> Заметки мастера</label>
                            <textarea 
                                value={clientNote} 
                                onChange={e => setClientNote(e.target.value)} 
                                placeholder="Любит кофе без сахара, формула окрашивания 6.0 + 3%..."
                                className="w-full bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-400/30 transition-all text-stone-800 placeholder-orange-700/40 min-h-[120px] resize-none"
                            />
                            <button onClick={handleSaveClientNote} disabled={savingNote} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md hover:bg-black disabled:opacity-50">
                                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить заметку"}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> История визитов</label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {appointments.filter(a => a.client_phone === selectedClient.phone).reverse().map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">{format(new Date(app.start_time), "d MMMM yyyy", { locale: ru })}</p>
                                            <p className="text-[10px] text-stone-500 font-bold mt-0.5">{app.service?.name}</p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                            {app.status === 'completed' ? 'Был' : 'Записан'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛКИ ЗАПИСИ (РУЧНАЯ И ДЕТАЛИ) ... */}
            {/* Оставляю их без изменений чтобы не раздувать сообщение */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowManualModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full active:scale-90 transition-all border border-stone-100"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black tracking-tight mb-8 text-stone-800 flex items-center gap-3"><UserPlus className="w-7 h-7 text-rose-500 bg-rose-50 p-1.5 rounded-xl"/> Новая запись</h2>
                        <form onSubmit={handleAddManualBooking} className="space-y-5">
                            <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Имя *</label><input required value={manualName} onChange={e => setManualName(e.target.value)} className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800" /></div>
                            <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Телефон</label><input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800" /></div>
                            <div>
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Услуга *</label>
                                <select required value={manualService} onChange={e => setManualService(e.target.value)} className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 appearance-none"><option value="" disabled>Выберите услугу...</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} мин)</option>)}</select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Дата *</label><input required type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800" /></div>
                                <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Время *</label><input required type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full mt-1.5 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800" /></div>
                            </div>
                            <button type="submit" disabled={addingManual} className="w-full mt-4 bg-gradient-to-r from-rose-400 to-orange-400 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 hover:opacity-90 flex justify-center">
                                {addingManual ? <Loader2 className="w-6 h-6 animate-spin" /> : "Заблокировать время"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedApp(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full active:scale-90 transition-all border border-stone-100"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black tracking-tight mb-8 text-stone-800">Детали визита</h2>
                        <div className="space-y-6">
                            <div className="bg-stone-50 p-5 rounded-[24px] border border-stone-100 shadow-inner">
                                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Клиент</p>
                                <p className="text-2xl font-black tracking-tight text-stone-800">{selectedApp.client_name}</p>
                                <p className="text-sm font-bold text-rose-500 mt-1">{selectedApp.client_phone || "Без номера"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-y border-stone-100 py-6">
                                <div><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Время</p><p className="text-base font-bold text-stone-800">{format(new Date(selectedApp.start_time), "d MMMM", { locale: ru })}</p><p className="text-sm font-black text-rose-500 bg-rose-50 inline-block px-2 py-1 rounded-md mt-1">{format(new Date(selectedApp.start_time), "HH:mm")}</p></div>
                                <div><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Услуга</p><p className="text-base font-bold text-stone-800 leading-tight">{selectedApp.service?.name}</p></div>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/30"><CheckCircle2 className="w-6 h-6" /> Завершить визит</button>}
                                {selectedApp.client_phone && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-stone-900 hover:bg-black text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md"><Phone className="w-5 h-5" /> Звонок</a>
                                        <a href={`https://wa.me/${getCleanPhone(selectedApp.client_phone)}?text=Здравствуйте!`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/30"><MessageCircle className="w-5 h-5" /> Написать</a>
                                    </div>
                                )}
                                <button onClick={() => handleDeleteRecord(selectedApp.id)} className={`w-full bg-white text-rose-500 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-2 border border-rose-200 hover:bg-rose-50 shadow-sm`}><Trash2 className="w-5 h-5" /> {selectedApp.status === 'completed' ? 'Удалить из архива' : 'Отменить запись'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}