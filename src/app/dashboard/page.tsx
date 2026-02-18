"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus, 
    Loader2, Briefcase, CalendarDays, UserCircle, Phone, X, MessageCircle, 
    RefreshCw, Users, Search, Ban, BarChart3, ImagePlus, CheckCircle2, Clock, Coffee, UserPlus
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

    // Настройки профиля
    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
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

    // СОСТОЯНИЯ РУЧНОЙ ЗАПИСИ
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualName, setManualName] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualService, setManualService] = useState("");
    const [manualEmployee, setManualEmployee] = useState("");
    const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [manualTime, setManualTime] = useState("12:00");
    const [addingManual, setAddingManual] = useState(false);

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
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
                
                if (p.work_start_time) setWorkStartTime(p.work_start_time);
                if (p.work_end_time) setWorkEndTime(p.work_end_time);
                if (p.schedule_step) setScheduleStep(p.schedule_step);
                if (p.breaks) {
                    const parsedBreaks = typeof p.breaks === 'string' ? JSON.parse(p.breaks) : p.breaks;
                    setBreaks(parsedBreaks || []);
                }
            }
            
            const { data: s } = await supabase.from("services").select("*, employee:employees(name)").eq("user_id", userId).order('created_at');
            setServices(s || []);
            
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            setEmployees(e || []);
            
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, service:services(name, price, duration), employee:employees(name)")
                .eq("master_id", userId).gte('start_time', new Date(Date.now() - 86400000).toISOString()).order('start_time', { ascending: true });
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
            id: user.id, business_name: businessName, disabled_days: disabledDays.join(','), 
            work_start_time: workStartTime, work_end_time: workEndTime,
            schedule_step: scheduleStep, breaks: breaks, updated_at: new Date(),
        });
        setSaving(false);
        alert(error ? error.message : "Настройки успешно сохранены!");
    };

    const handleAddBreak = () => {
        if (newBreakStart && newBreakEnd) {
            setBreaks([...breaks, { start: newBreakStart, end: newBreakEnd }]);
            setNewBreakStart("13:00"); setNewBreakEnd("14:00");
        }
    };

    const handleRemoveBreak = (index: number) => setBreaks(breaks.filter((_, i) => i !== index));

    const handleAddService = async () => {
        if (!newName || !newPrice || !newDuration) return;
        setAddingService(true);
        const insertData: any = { user_id: user.id, name: newName, price: Number(newPrice), duration: Number(newDuration), image_urls: [] };
        if (role === 'owner' && newServiceEmpId) insertData.employee_id = newServiceEmpId;
        
        const { error } = await supabase.from("services").insert(insertData);
        if (error) alert("Ошибка сохранения: " + error.message);
        setNewName(""); setNewPrice(""); setNewDuration("60"); setNewServiceEmpId(""); await loadData(user.id); setAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить эту услугу?")) { await supabase.from("services").delete().eq("id", id); await loadData(user.id); }
    };

    const handleAddEmployee = async () => {
        if (!newEmpName) return;
        setAddingEmp(true);
        await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec });
        setNewEmpName(""); setNewEmpSpec(""); await loadData(user.id); setAddingEmp(false);
    };

    const handleDeleteEmployee = async (id: string) => {
        if (confirm("Удалить сотрудника?")) { await supabase.from("employees").delete().eq("id", id); await loadData(user.id); }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Точно отменить запись?")) { await supabase.from("appointments").delete().eq("id", id); await loadData(user.id); setSelectedApp(null); }
    };

    const handleCompleteRecord = async (app: any) => {
        if (confirm("Завершить визит?")) {
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
                await supabase.from("clients").insert({ master_id: user.id, name: app.client_name, phone: app.client_phone, visits_count: 1, total_revenue: price, is_blacklisted: false });
            }
            await loadData(user.id, true); setSelectedApp(null);
        }
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean) => {
        if (confirm(currentStatus ? "Разблокировать клиента?" : "Добавить в ЧС?")) {
            await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId); await loadData(user.id, true); 
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadingImageId(serviceId);
        try {
            const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
            const filePath = `${user.id}/${fileName}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            await supabase.from('services').update({ image_urls: [...(currentUrls || []), data.publicUrl] }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка загрузки: " + err.message); } finally { setUploadingImageId(null); }
    };

    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        const newUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('services').update({ image_urls: newUrls }).eq('id', serviceId); await loadData(user.id, true);
    };

    const handleAddManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualName || !manualService || !manualDate || !manualTime) return;
        setAddingManual(true);
        try {
            const startDateTime = new Date(`${manualDate}T${manualTime}:00`).toISOString();
            const { error } = await supabase.from('appointments').insert({
                master_id: user.id, service_id: manualService, employee_id: manualEmployee || null,
                client_name: manualName, client_phone: manualPhone, start_time: startDateTime, status: 'active'
            });
            if (error) throw error;
            setShowManualModal(false);
            setManualName(""); setManualPhone(""); setManualService("");
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка при добавлении: " + err.message); } finally { setAddingManual(false); }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${user.id}` : "";
    const filteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const totalVisits = clients.reduce((acc, c) => acc + Number(c.visits_count || 0), 0);

    const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

    if (loading) return ( <div className="h-screen w-full bg-[#F9FAFB] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> );

    return (
        <div className="flex h-[100dvh] bg-[#F9FAFB] text-gray-900 font-sans selection:bg-indigo-100 antialiased overflow-hidden">
            
            {/* ================= DESKTOP SIDEBAR ================= */}
            <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-6 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <span className="font-bold text-indigo-600 tracking-tight text-sm">EB</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-bold text-gray-900 tracking-tight text-sm leading-tight">EasyBooking</h2>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-tight mt-0.5">Workspace</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {NAV_ITEMS.map((tab) => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as Tab)} 
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                            {isSyncing ? <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>}
                        </div>
                        <span className="text-xs font-bold text-gray-600 truncate">{businessName || "Настройте профиль"}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all">
                        <LogOut className="w-4 h-4" /> Выйти
                    </button>
                </div>
            </aside>

            {/* ================= MAIN CONTENT AREA ================= */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                
                {/* MOBILE HEADER */}
                <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-5 py-3.5 flex justify-between items-center transition-all">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white flex items-center justify-center border border-gray-100">
                            <span className="font-bold text-indigo-600 text-sm tracking-tight">EB</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-base font-bold tracking-tight text-gray-900">Кабинет</h1>
                                <div className="relative flex h-2 w-2 items-center justify-center">
                                    {isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-500 truncate max-w-[150px] font-medium leading-none">{businessName || "Настройте профиль"}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 p-2 bg-gray-50 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
                </header>

                {/* DESKTOP HEADER (Title) */}
                <header className="hidden md:flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-5 z-10 shrink-0">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">
                        {NAV_ITEMS.find(t => t.id === activeTab)?.label}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{format(new Date(), "d MMMM, EEEE", { locale: ru })}</span>
                    </div>
                </header>

                {/* MAIN SCROLLABLE AREA */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        
                        {/* 🟢 ЗАПИСИ */}
                        {activeTab === 'appointments' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl md:hidden font-bold text-gray-900 tracking-tight">Журнал</h2>
                                    <button onClick={() => setShowManualModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 hover:bg-indigo-700 ml-auto md:ml-0">
                                        <Plus className="w-4 h-4"/> Ручная запись
                                    </button>
                                </div>

                                {services.length > 0 && appointments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 mb-2">
                                        <button onClick={() => setActiveServiceFilter(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] border ${activeServiceFilter === null ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Все записи</button>
                                        {services.map(s => <button key={s.id} onClick={() => setActiveServiceFilter(s.id)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] border ${activeServiceFilter === s.id ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{s.name}</button>)}
                                    </div>
                                )}

                                {filteredAppointments.length === 0 ? (
                                    <div className="text-center py-20 bg-white border border-gray-100 rounded-[32px] shadow-sm"><div className="w-16 h-16 bg-gray-50 shadow-inner border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-7 h-7 text-gray-300" /></div><p className="text-gray-400 text-sm font-bold">Нет активных записей</p></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredAppointments.map(app => (
                                            <div key={app.id} onClick={() => setSelectedApp(app)} className={`rounded-[28px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border border-gray-100 ${app.status === 'completed' ? 'opacity-60 shadow-sm' : 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-indigo-200 hover:shadow-md'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`font-black text-3xl tracking-tight ${app.status === 'completed' ? 'text-gray-400' : 'text-indigo-600'}`}>{format(new Date(app.start_time), "HH:mm")}</div>
                                                            <div className="px-2.5 py-1 bg-gray-50 rounded-lg text-[11px] text-gray-500 font-bold uppercase tracking-wide border border-gray-100">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                            {app.status === 'completed' && <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] rounded-lg font-bold uppercase tracking-wide border border-emerald-100">Завершено</div>}
                                                        </div>
                                                        <h3 className="text-gray-900 text-lg font-bold tracking-tight">{app.client_name}</h3>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-gray-500 pt-4 mt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" /><span className="truncate font-bold text-gray-600">{app.service?.name || "Услуга удалена"}</span></div>
                                                    {app.employee?.name && <span className="bg-indigo-50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600">{app.employee.name}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🔵 УСЛУГИ И СОТРУДНИКИ */}
                        {activeTab === 'services' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    
                                    <div className="lg:col-span-1 space-y-6">
                                        {role === 'owner' && (
                                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                                <h2 className="text-lg font-black tracking-tight mb-5 text-gray-900">Команда</h2>
                                                <div className="flex flex-col gap-3 mb-6">
                                                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Имя" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                                    <div className="flex gap-2">
                                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} placeholder="Должность" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                                        <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="bg-indigo-600 text-white w-14 rounded-2xl active:scale-[0.92] transition-all disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 hover:bg-indigo-700">
                                                            {addingEmp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {employees.map(emp => (
                                                        <div key={emp.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                            <div><p className="text-sm font-bold text-gray-900">{emp.name}</p>{emp.specialty && <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{emp.specialty}</p>}</div>
                                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-rose-500 bg-rose-50 p-2.5 rounded-xl active:scale-[0.92] transition-all hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                            <h2 className="text-lg font-black tracking-tight mb-5 text-gray-900">Добавить услугу</h2>
                                            <div className="flex flex-col gap-3">
                                                {role === 'owner' && (
                                                    <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 appearance-none">
                                                        <option value="">Общая услуга</option>
                                                        {employees.map(emp => <option key={emp.id} value={emp.id}>Только: {emp.name}</option>)}
                                                    </select>
                                                )}
                                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase">Мин</span>
                                                        <input value={newDuration} onChange={e => setNewDuration(e.target.value)} type="number" placeholder="60" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₽</span>
                                                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-9 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                                    </div>
                                                </div>
                                                <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="w-full mt-2 bg-indigo-600 text-white p-4 rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20 hover:bg-indigo-700 flex justify-center items-center">
                                                    {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-4">
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2 hidden lg:block">Все услуги</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {services.length === 0 ? <p className="text-center text-gray-400 text-sm py-4 col-span-full">Услуг пока нет</p> : services.map(s => (
                                                <div key={s.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start gap-3 mb-3">
                                                            <span className="text-base font-bold tracking-tight text-gray-900 leading-tight">{s.name}</span>
                                                            <span className="text-emerald-600 font-black text-lg bg-emerald-50 px-2.5 py-1 rounded-xl shrink-0">{s.price} ₽</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <span className="text-[11px] bg-gray-50 text-gray-500 px-2 py-1.5 rounded-md border border-gray-100 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> {s.duration || 60} мин</span>
                                                            {s.employee?.name && <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-md font-bold truncate">Мастер: {s.employee.name}</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    {s.image_urls && s.image_urls.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x mb-4">
                                                            {s.image_urls.map((url: string, idx: number) => (
                                                                <div key={idx} className="relative shrink-0 snap-center">
                                                                    <img src={url} alt="Услуга" className="w-16 h-16 object-cover rounded-xl shadow-sm border border-gray-100" />
                                                                    <button onClick={() => handleRemoveImage(s.id, url, s.image_urls)} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md active:scale-95"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                                                        <label className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2.5 rounded-xl transition-all active:scale-[0.92] cursor-pointer font-bold text-sm flex items-center gap-2 flex-1 justify-center">
                                                            {uploadingImageId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-4 h-4" /> Фото</>}
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, s.id, s.image_urls || [])} />
                                                        </label>
                                                        <button onClick={() => handleDeleteService(s.id)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl active:scale-[0.92] transition-all shrink-0"><Trash2 className="w-5 h-5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🟡 КЛИЕНТЫ */}
                        {activeTab === 'clients' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                                <div className="relative max-w-xl mx-auto md:max-w-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или телефону..." className="w-full bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredClients.length === 0 ? <p className="text-gray-400 text-center py-10 font-bold text-sm col-span-full">Клиенты не найдены</p> : filteredClients.map(client => (
                                        <div key={client.id} className={`p-5 rounded-[28px] border transition-all ${client.is_blacklisted ? 'border-rose-100 bg-rose-50/50' : 'bg-white border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${client.is_blacklisted ? 'text-gray-500' : 'text-gray-900'}`}>{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-md font-bold uppercase">В ЧС</span>}</h3>
                                                    <p className="text-gray-500 font-bold text-sm mt-1">{client.phone}</p>
                                                </div>
                                                <button onClick={() => handleToggleBlacklist(client.id, client.is_blacklisted)} className={`p-2.5 rounded-xl active:scale-[0.92] transition-all shadow-sm ${client.is_blacklisted ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-rose-50 hover:text-rose-500 border border-gray-100'}`}><Ban className="w-4 h-4" /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Визиты</p><p className="text-lg font-black tracking-tight text-gray-900">{client.visits_count}</p></div>
                                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Доход</p><p className="text-lg font-black tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
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
                                    <div className="col-span-2 bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm flex flex-col justify-center">
                                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mb-2">Общий доход</p>
                                        <p className="text-4xl font-black tracking-tight text-emerald-600">{totalRevenue} <span className="text-2xl">₽</span></p>
                                    </div>
                                    <div className="col-span-2 bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 shadow-sm flex flex-col justify-center">
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mb-2">Всего визитов</p>
                                        <p className="text-4xl font-black tracking-tight text-indigo-600">{totalVisits}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                    <h3 className="text-xl font-black tracking-tight text-gray-900 mb-6">Топ-5 клиентов</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                            <div key={c.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 sm:p-5 rounded-2xl hover:border-indigo-100 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-gray-400 border border-gray-200'}`}>{i + 1}</div>
                                                    <div>
                                                        <span className="text-base font-bold text-gray-900 block">{c.name}</span>
                                                        <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Визитов: {c.visits_count}</span>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-black tracking-tight text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">{c.total_revenue} ₽</span>
                                            </div>
                                        ))}
                                        {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-center text-gray-400 text-sm py-4 col-span-full font-bold">Пока нет данных для топа</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🟣 ПРОФИЛЬ И НАСТРОЙКИ */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                
                                <div className="bg-indigo-600 p-8 rounded-[32px] shadow-xl shadow-indigo-600/20 relative overflow-hidden text-white">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
                                    <h2 className="text-xs font-bold uppercase text-indigo-100 mb-4 tracking-widest relative z-10">Ваша прямая ссылка для записи</h2>
                                    <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                        <input readOnly value={clientLink} className="flex-1 bg-black/20 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none truncate font-mono shadow-inner" />
                                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl active:scale-[0.96] transition-all shadow-md font-black flex justify-center items-center gap-2 hover:bg-gray-50"><Copy className="w-5 h-5" /> Скопировать</button>
                                    </div>
                                    <p className="text-xs text-indigo-200 mt-4 relative z-10 font-medium">Разместите эту ссылку в шапке профиля Instagram, WhatsApp или VK.</p>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                    <h2 className="text-xl font-black tracking-tight mb-8 text-gray-900">Настройки кабинета</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Название бизнеса или Имя</label>
                                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest block ml-1">Рабочие дни (Изумрудные)</label>
                                                <div className="flex justify-between gap-1.5 sm:gap-2">
                                                    {DAYS.map((d) => (
                                                        <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3.5 sm:py-4 rounded-2xl text-[11px] sm:text-xs font-black transition-all active:scale-95 ${!disabledDays.includes(d.id) ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>{d.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-12">
                                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest"><Clock className="w-4 h-4 text-indigo-600"/> График</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-1">Начало</label>
                                                    <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-base font-black outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 text-center transition-all shadow-sm hover:border-indigo-300" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-1">Конец</label>
                                                    <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-base font-black outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 text-center transition-all shadow-sm hover:border-indigo-300" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Сетка расписания</label>
                                                <div className="relative">
                                                    <select value={scheduleStep} onChange={e => setScheduleStep(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none transition-all cursor-pointer hover:bg-gray-100">
                                                        <option value={15}>Каждые 15 минут</option>
                                                        <option value={30}>Каждые 30 минут</option>
                                                        <option value={60}>Каждый час</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">▼</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Перерывы (Обед и т.д.)</label>
                                                {breaks.map((br, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-2xl shadow-sm">
                                                        <span className="flex-1 font-black text-gray-900 text-center tracking-wider">{br.start} — {br.end}</span>
                                                        <button onClick={() => handleRemoveBreak(idx)} className="p-2.5 bg-white border border-gray-200 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm"><X className="w-4 h-4"/></button>
                                                    </div>
                                                ))}

                                                <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-2xl border border-gray-200">
                                                    <input type="time" value={newBreakStart} onChange={e => setNewBreakStart(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-indigo-500" />
                                                    <span className="text-gray-400 font-black">-</span>
                                                    <input type="time" value={newBreakEnd} onChange={e => setNewBreakEnd(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-indigo-500" />
                                                    <button onClick={handleAddBreak} className="bg-gray-900 text-white p-3 rounded-xl font-bold active:scale-95 transition-all shadow-sm hover:bg-gray-800"><Plus className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-gray-100">
                                        <button onClick={handleSaveProfile} disabled={saving} className="w-full md:w-auto md:min-w-[240px] md:float-right bg-indigo-600 text-white py-4 px-8 rounded-2xl font-black text-base shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center hover:bg-indigo-700">
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить настройки"}
                                        </button>
                                        <div className="clear-both"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* MOBILE NAV BAR */}
                <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe pt-2 px-2">
                    <div className="flex justify-between items-center max-w-sm mx-auto pb-4 pt-1">
                        {NAV_ITEMS.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all w-16 active:scale-95 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                <div className="p-1.5"><tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-indigo-600/10 stroke-2' : 'stroke-[1.5]'}`} /></div>
                                <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* ================= МОДАЛКА: РУЧНАЯ ЗАПИСЬ ================= */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-gray-100 overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowManualModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-50 p-2.5 rounded-full active:scale-90 transition-all border border-gray-100"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black tracking-tight mb-8 text-gray-900 flex items-center gap-3"><UserPlus className="w-7 h-7 text-indigo-600 bg-indigo-50 p-1.5 rounded-xl"/> Новая запись</h2>
                        
                        <form onSubmit={handleAddManualBooking} className="space-y-5">
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Имя клиента *</label>
                                <input required value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Анна" className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Телефон</label>
                                <input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="+7 (999) 000-00-00" className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Услуга *</label>
                                <div className="relative mt-1.5">
                                    <select required value={manualService} onChange={e => setManualService(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none transition-all cursor-pointer">
                                        <option value="" disabled>Выберите услугу...</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} мин)</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">▼</div>
                                </div>
                            </div>
                            {role === 'owner' && (
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Мастер</label>
                                    <div className="relative mt-1.5">
                                        <select value={manualEmployee} onChange={e => setManualEmployee(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none transition-all cursor-pointer">
                                            <option value="">Без привязки (Выполняю я)</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">▼</div>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Дата *</label>
                                    <input required type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Время *</label>
                                    <input required type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                                </div>
                            </div>
                            
                            <button type="submit" disabled={addingManual} className="w-full mt-4 bg-indigo-600 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 hover:bg-indigo-700">
                                {addingManual ? <Loader2 className="w-6 h-6 animate-spin" /> : "Заблокировать время"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= МОДАЛКА: ДЕТАЛИ ЗАПИСИ ================= */}
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedApp(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-50 p-2.5 rounded-full active:scale-90 transition-all border border-gray-100"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black tracking-tight mb-8 text-gray-900">Детали визита</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 shadow-inner">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Клиент</p>
                                <p className="text-2xl font-black tracking-tight text-gray-900">{selectedApp.client_name}</p>
                                <p className="text-sm font-bold text-indigo-600 mt-1">{selectedApp.client_phone || "Без номера"}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6">
                                <div>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Время</p>
                                    <p className="text-base font-bold text-gray-900">{format(new Date(selectedApp.start_time), "d MMMM", { locale: ru })}</p>
                                    <p className="text-sm font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded-md mt-1">{format(new Date(selectedApp.start_time), "HH:mm")}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Услуга</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight">{selectedApp.service?.name}</p>
                                    {selectedApp.employee?.name && <p className="text-[11px] text-indigo-600 font-bold mt-2 bg-indigo-50 inline-block px-2 py-1 rounded-md border border-indigo-100">Мастер: {selectedApp.employee.name}</p>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-2">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"><CheckCircle2 className="w-6 h-6" /> Завершить визит</button>}
                                
                                {selectedApp.client_phone && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md"><Phone className="w-5 h-5" /> Вызов</a>
                                        <a href={`https://wa.me/${getCleanPhone(selectedApp.client_phone)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/30"><MessageCircle className="w-5 h-5" /> WhatsApp</a>
                                    </div>
                                )}
                                
                                {selectedApp.status !== 'completed' && <button onClick={() => handleDeleteRecord(selectedApp.id)} className="w-full bg-white text-rose-500 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-2 border border-rose-200 hover:bg-rose-50 shadow-sm"><Trash2 className="w-5 h-5" /> Отменить запись</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}