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

    // ================= СОСТОЯНИЯ РУЧНОЙ ЗАПИСИ =================
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

    // ================= ФУНКЦИЯ РУЧНОЙ ЗАПИСИ =================
    const handleAddManualBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualName || !manualService || !manualDate || !manualTime) return;
        setAddingManual(true);
        
        try {
            const startDateTime = new Date(`${manualDate}T${manualTime}:00`).toISOString();
            
            const { error } = await supabase.from('appointments').insert({
                master_id: user.id,
                service_id: manualService,
                employee_id: manualEmployee || null,
                client_name: manualName,
                client_phone: manualPhone,
                start_time: startDateTime,
                status: 'active'
            });
            
            if (error) throw error;
            
            setShowManualModal(false);
            setManualName(""); setManualPhone(""); setManualService("");
            await loadData(user.id, true);
        } catch (err: any) {
            alert("Ошибка при добавлении записи: " + err.message);
        } finally {
            setAddingManual(false);
        }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${user.id}` : "";
    const filteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const totalVisits = clients.reduce((acc, c) => acc + Number(c.visits_count || 0), 0);

    if (loading) return ( <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> );

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-indigo-100 flex flex-col antialiased">
            
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-5 py-3.5 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white flex items-center justify-center border border-gray-100">
                        <span className="font-bold text-indigo-600 text-sm tracking-tight">EB</span>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-base font-bold tracking-tight text-gray-900">Кабинет</h1>
                            <div className="relative flex h-2 w-2 items-center justify-center">
                                {isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>}
                            </div>
                        </div>
                        <span className="text-[11px] text-gray-500 truncate max-w-[150px] font-medium leading-none">{businessName || "Настройте профиль"}</span>
                    </div>
                </div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }} className="text-gray-400 hover:text-rose-500 p-2 bg-gray-50 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-5 pb-32 space-y-6">
                
                {/* 🟢 ЗАПИСИ */}
                {activeTab === 'appointments' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        {/* ШАПКА РАЗДЕЛА: Заголовок и кнопка РУЧНОЙ ЗАПИСИ */}
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Журнал</h2>
                            <button onClick={() => setShowManualModal(true)} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 hover:bg-indigo-700">
                                <Plus className="w-4 h-4"/> Добавить
                            </button>
                        </div>

                        {services.length > 0 && appointments.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
                                <button onClick={() => setActiveServiceFilter(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] border ${activeServiceFilter === null ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Все записи</button>
                                {services.map(s => <button key={s.id} onClick={() => setActiveServiceFilter(s.id)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] border ${activeServiceFilter === s.id ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{s.name}</button>)}
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredAppointments.length === 0 ? (
                                <div className="text-center py-12"><div className="w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-7 h-7 text-gray-300" /></div><p className="text-gray-400 text-sm font-medium">Нет активных записей</p></div>
                            ) : filteredAppointments.map(app => (
                                <div key={app.id} onClick={() => setSelectedApp(app)} className={`rounded-[28px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border border-gray-100 ${app.status === 'completed' ? 'opacity-60 shadow-sm' : 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`font-bold text-2xl tracking-tight ${app.status === 'completed' ? 'text-gray-400' : 'text-indigo-600'}`}>{format(new Date(app.start_time), "HH:mm")}</div>
                                                <div className="px-2.5 py-1 bg-gray-50 rounded-lg text-[11px] text-gray-500 font-bold uppercase tracking-wide border border-gray-100">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                {app.status === 'completed' && <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] rounded-lg font-bold uppercase tracking-wide border border-emerald-100">Завершено</div>}
                                            </div>
                                            <h3 className="text-gray-900 text-base font-bold tracking-tight">{app.client_name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" /><span className="truncate font-medium">{app.service?.name || "Услуга удалена"}</span></div>
                                        {app.employee?.name && <span className="bg-indigo-50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600">{app.employee.name}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔵 УСЛУГИ И СОТРУДНИКИ */}
                {activeTab === 'services' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        
                        {role === 'owner' && (
                            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                <h2 className="text-lg font-bold tracking-tight mb-5 text-gray-900">Моя команда</h2>
                                <div className="flex flex-col gap-3 mb-6">
                                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Имя специалиста" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                    <div className="flex gap-3">
                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} placeholder="Должность" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                        <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="bg-indigo-600 text-white w-14 rounded-2xl active:scale-[0.92] transition-all disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                                            {addingEmp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                                                {emp.specialty && <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{emp.specialty}</p>}
                                            </div>
                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-rose-500 bg-rose-50 p-2.5 rounded-xl active:scale-[0.92] transition-all hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                            <h2 className="text-lg font-bold tracking-tight mb-5 text-gray-900">Добавить услугу</h2>
                            <div className="flex flex-col gap-3">
                                {role === 'owner' && (
                                    <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 appearance-none">
                                        <option value="">Общая услуга (выполняют все)</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>Только: {emp.name}</option>)}
                                    </select>
                                )}
                                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Мин</span>
                                        <input value={newDuration} onChange={e => setNewDuration(e.target.value)} type="number" placeholder="60" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₽</span>
                                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400" />
                                    </div>
                                </div>
                                <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="w-full mt-2 bg-indigo-600 text-white p-4 rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20 flex justify-center items-center">
                                    {addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить услугу"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Список услуг</h3>
                            {services.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">Услуг пока нет</p> : services.map(s => (
                                <div key={s.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <span className="text-base font-bold tracking-tight text-gray-900 pr-4">{s.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> {s.duration || 60} мин</span>
                                                {s.employee?.name && <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold">Мастер: {s.employee.name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-gray-900 font-black text-lg">{s.price} ₽</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                        <label className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2.5 rounded-xl transition-all active:scale-[0.92] cursor-pointer">
                                            {uploadingImageId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, s.id, s.image_urls || [])} />
                                        </label>
                                        <button onClick={() => handleDeleteService(s.id)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl active:scale-[0.92] transition-all ml-auto"><Trash2 className="w-5 h-5" /></button>
                                    </div>

                                    {s.image_urls && s.image_urls.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x mt-3">
                                            {s.image_urls.map((url: string, idx: number) => (
                                                <div key={idx} className="relative shrink-0 snap-center">
                                                    <img src={url} alt="Услуга" className="w-20 h-20 object-cover rounded-2xl shadow-sm" />
                                                    <button onClick={() => handleRemoveImage(s.id, url, s.image_urls)} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md active:scale-95"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟡 КЛИЕНТЫ */}
                {activeTab === 'clients' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или телефону..." className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400" />
                        </div>
                        <div className="space-y-3">
                            {filteredClients.length === 0 ? <p className="text-gray-400 text-center py-10 font-medium text-sm">Клиенты не найдены</p> : filteredClients.map(client => (
                                <div key={client.id} className={`p-5 rounded-[28px] border transition-all ${client.is_blacklisted ? 'border-rose-100 bg-rose-50/50' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 ${client.is_blacklisted ? 'text-gray-500' : 'text-gray-900'}`}>{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-md font-bold uppercase">В ЧС</span>}</h3>
                                            <p className="text-gray-500 font-medium text-sm mt-0.5">{client.phone}</p>
                                        </div>
                                        <button onClick={() => handleToggleBlacklist(client.id, client.is_blacklisted)} className={`p-2.5 rounded-xl active:scale-[0.92] transition-all ${client.is_blacklisted ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 bg-gray-50 hover:bg-rose-50 hover:text-rose-500'}`}><Ban className="w-5 h-5" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                        <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Визиты</p><p className="text-lg font-bold tracking-tight text-gray-900">{client.visits_count}</p></div>
                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Доход</p><p className="text-lg font-bold tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟢 АНАЛИТИКА */}
                {activeTab === 'analytics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-5 rounded-[28px] border border-emerald-100 shadow-sm">
                                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Общий доход</p>
                                <p className="text-2xl font-black tracking-tight text-emerald-600">{totalRevenue} ₽</p>
                            </div>
                            <div className="bg-indigo-50 p-5 rounded-[28px] border border-indigo-100 shadow-sm">
                                <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mb-1">Всего визитов</p>
                                <p className="text-2xl font-black tracking-tight text-indigo-600">{totalVisits}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                            <h3 className="text-base font-bold tracking-tight text-gray-900 mb-5 flex items-center gap-2">Топ-5 клиентов</h3>
                            <div className="space-y-3">
                                {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                    <div key={c.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-gray-400 border border-gray-200'}`}>{i + 1}</div>
                                            <div>
                                                <span className="text-sm font-bold text-gray-900 block">{c.name}</span>
                                                <span className="text-[11px] text-gray-500 font-medium">Визитов: {c.visits_count}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black tracking-tight text-emerald-600">{c.total_revenue} ₽</span>
                                    </div>
                                ))}
                                {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-center text-gray-400 text-sm py-2">Пока нет данных для топа</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* 🟣 ПРОФИЛЬ И НАСТРОЙКИ */}
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        
                        {/* Ссылка */}
                        <div className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-600/20 relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full pointer-events-none"></div>
                            <h2 className="text-[11px] font-bold uppercase text-indigo-100 mb-3 tracking-wider relative z-10">Ваша ссылка для записи</h2>
                            <div className="flex gap-2 relative z-10">
                                <input readOnly value={clientLink} className="flex-1 bg-black/20 border border-white/10 rounded-2xl p-4 text-xs font-medium text-white outline-none truncate font-mono shadow-inner" />
                                <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-white text-indigo-600 px-5 rounded-2xl active:scale-[0.92] transition-all shadow-md font-bold"><Copy className="w-5 h-5" /></button>
                            </div>
                            <p className="text-[11px] text-indigo-200 mt-3 relative z-10">Разместите эту ссылку в шапке профиля Instagram, WhatsApp или VK.</p>
                        </div>

                        {/* Настройки */}
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                            <h2 className="text-lg font-bold tracking-tight mb-6 text-gray-900">Настройки кабинета</h2>
                            <div className="space-y-6">
                                
                                <div className="space-y-2">
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Название бизнеса или Имя</label>
                                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 transition-all" />
                                </div>
                                
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block mb-2.5 ml-1">Рабочие дни (Изумрудные)</label>
                                    <div className="flex justify-between gap-1.5">
                                        {DAYS.map((d) => (
                                            <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${!disabledDays.includes(d.id) ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>{d.label}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-100 space-y-5">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-600"/> График работы</h3>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-1">Начало</label>
                                            <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 text-center transition-all shadow-sm" />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-1">Конец</label>
                                            <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 text-center transition-all shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Шаг сетки расписания</label>
                                        <div className="relative">
                                            <select value={scheduleStep} onChange={e => setScheduleStep(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none transition-all">
                                                <option value={15}>Каждые 15 минут</option>
                                                <option value={30}>Каждые 30 минут</option>
                                                <option value={60}>Каждый час</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                                        </div>
                                    </div>

                                    {/* Блок перерывов */}
                                    <div className="space-y-3 pt-2">
                                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Перерывы (Обед и т.д.)</label>
                                        
                                        {breaks.map((br, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                                                <span className="flex-1 font-bold text-gray-900 text-center">{br.start} — {br.end}</span>
                                                <button onClick={() => handleRemoveBreak(idx)} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"><X className="w-4 h-4"/></button>
                                            </div>
                                        ))}

                                        <div className="flex gap-2">
                                            <input type="time" value={newBreakStart} onChange={e => setNewBreakStart(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none text-center" />
                                            <span className="flex items-center text-gray-400">-</span>
                                            <input type="time" value={newBreakEnd} onChange={e => setNewBreakEnd(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none text-center" />
                                            <button onClick={handleAddBreak} className="bg-gray-900 text-white px-4 rounded-xl font-bold active:scale-95 transition-all">+</button>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center mt-6">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить настройки"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* NAV BAR */}
            <nav className="fixed bottom-0 left-0 w-full z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe pt-2 sm:px-6">
                <div className="flex justify-between items-center max-w-sm mx-auto px-4 pb-4 pt-1">
                    {[
                        { id: 'appointments', icon: CalendarDays, label: 'Записи' },
                        { id: 'services', icon: Briefcase, label: 'Услуги' },
                        { id: 'clients', icon: Users, label: 'Клиенты' },
                        { id: 'analytics', icon: BarChart3, label: 'Доход' },
                        { id: 'profile', icon: UserCircle, label: 'Профиль' }
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all w-16 active:scale-95 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            <div className="p-1.5"><tab.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === tab.id ? 'fill-indigo-600/10 stroke-2' : 'stroke-[1.5]'}`} /></div>
                            <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ================= МОДАЛКА: РУЧНАЯ ЗАПИСЬ ================= */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl relative border border-gray-100 overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowManualModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full active:scale-90 transition-all"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold tracking-tight mb-6 text-gray-900 flex items-center gap-2"><UserPlus className="w-6 h-6 text-indigo-600"/> Новая запись</h2>
                        
                        <form onSubmit={handleAddManualBooking} className="space-y-4">
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Имя клиента *</label>
                                <input required value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Анна" className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Телефон</label>
                                <input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="+7 (999) 000-00-00" className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Услуга *</label>
                                <select required value={manualService} onChange={e => setManualService(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none">
                                    <option value="" disabled>Выберите услугу...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} мин)</option>)}
                                </select>
                            </div>
                            {role === 'owner' && (
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Мастер</label>
                                    <select value={manualEmployee} onChange={e => setManualEmployee(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 appearance-none">
                                        <option value="">Без привязки</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Дата *</label>
                                    <input required type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-1">Время *</label>
                                    <input required type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900" />
                                </div>
                            </div>
                            
                            <button type="submit" disabled={addingManual} className="w-full mt-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50">
                                {addingManual ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить запись"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= МОДАЛКА: ДЕТАЛИ ЗАПИСИ ================= */}
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedApp(null)}>
                    <div className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl relative border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full active:scale-90 transition-all"><X className="w-5 h-5" /></button>
                        <h2 className="text-lg font-bold tracking-tight mb-6 text-gray-900">Детали визита</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Клиент</p>
                                <p className="text-xl font-black tracking-tight text-gray-900">{selectedApp.client_name}</p>
                                <p className="text-sm font-bold text-indigo-600 mt-1">{selectedApp.client_phone || "Без номера"}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-5">
                                <div>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Время</p>
                                    <p className="text-base font-bold text-gray-900">{format(new Date(selectedApp.start_time), "d MMMM", { locale: ru })}</p>
                                    <p className="text-sm font-bold text-indigo-600">{format(new Date(selectedApp.start_time), "HH:mm")}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Услуга</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight">{selectedApp.service?.name}</p>
                                    {selectedApp.employee?.name && <p className="text-[11px] text-indigo-600 font-bold mt-1">Мастер: {selectedApp.employee.name}</p>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-1">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"><CheckCircle2 className="w-5 h-5" /> Завершить визит</button>}
                                
                                {selectedApp.client_phone && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"><Phone className="w-5 h-5" /> Вызов</a>
                                        <a href={`https://wa.me/${getCleanPhone(selectedApp.client_phone)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"><MessageCircle className="w-5 h-5" /> WhatsApp</a>
                                    </div>
                                )}
                                
                                {selectedApp.status !== 'completed' && <button onClick={() => handleDeleteRecord(selectedApp.id)} className="w-full bg-transparent text-rose-500 font-bold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-1 border border-rose-200 hover:bg-rose-50"><Trash2 className="w-5 h-5" /> Отменить запись</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}