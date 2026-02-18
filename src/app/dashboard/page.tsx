"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus, 
    Loader2, Briefcase, CalendarDays, UserCircle, Phone, X, MessageCircle, 
    RefreshCw, Users, Search, Ban, BarChart3, ImagePlus, CheckCircle2
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

    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
    const [telegramChatId, setTelegramChatId] = useState(""); 
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(21);
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); 
    
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [saving, setSaving] = useState(false);
    
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newServiceEmpId, setNewServiceEmpId] = useState(""); 
    const [addingService, setAddingService] = useState(false);
    
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) { 
                setUser(session.user); 
                loadData(session.user.id); 
            } else {
                router.replace("/login");
            }
        });

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace("/login");
                    return;
                }
                setUser(session.user);
                await loadData(session.user.id);
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
        };

        init();
        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user?.id) return;
        
        // Real-time обновления
        const channel = supabase.channel('public:appointments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { 
                loadData(user.id, true); 
            }).subscribe();
            
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
                setTelegramChatId(p.telegram_chat_id || "");
                setWorkStart(Number(p.work_start_hour) || 9);
                setWorkEnd(Number(p.work_end_hour) || 21);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
            }
            
            const { data: s } = await supabase.from("services").select("*, employee:employees(name)").eq("user_id", userId).order('created_at');
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
        } catch (error) { 
            console.error(error); 
        } finally {
            if (!isSilent) setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: user.id, 
            business_name: businessName, 
            telegram_chat_id: telegramChatId.trim(),
            work_start_hour: workStart.toString(), 
            work_end_hour: workEnd.toString(),
            disabled_days: disabledDays.join(','), 
            updated_at: new Date(),
        });
        setSaving(false);
        alert(error ? error.message : "Настройки сохранены!");
    };

    const handleAddService = async () => {
        if (!newName || !newPrice) return;
        setAddingService(true);
        const insertData: any = { user_id: user.id, name: newName, price: Number(newPrice), image_urls: [] };
        if (role === 'owner' && newServiceEmpId) insertData.employee_id = newServiceEmpId;
        const { error } = await supabase.from("services").insert(insertData);
        if (error) alert("Ошибка сохранения услуги: " + error.message);
        
        setNewName(""); setNewPrice(""); setNewServiceEmpId(""); await loadData(user.id); setAddingService(false);
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить эту услугу? (Существующие записи останутся)")) {
            await supabase.from("services").delete().eq("id", id);
            await loadData(user.id);
        }
    };

    const handleAddEmployee = async () => {
        if (!newEmpName) return;
        setAddingEmp(true);
        const { error } = await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec });
        if (error) alert("Ошибка: " + error.message);
        setNewEmpName(""); setNewEmpSpec(""); await loadData(user.id); setAddingEmp(false);
    };

    const handleDeleteEmployee = async (id: string) => {
        if (confirm("Удалить сотрудника?")) { 
            await supabase.from("employees").delete().eq("id", id); 
            await loadData(user.id); 
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm("Точно отменить запись клиента?")) {
            try {
                const { error } = await supabase.from("appointments").delete().eq("id", id);
                if (error) throw error; 
                await loadData(user.id); 
                setSelectedApp(null); 
            } catch (err: any) { 
                alert("Ошибка удаления: " + err.message); 
            }
        }
    };

    const handleCompleteRecord = async (app: any) => {
        if (confirm("Завершить визит?")) {
            try {
                const { error: appError } = await supabase.from("appointments").update({ status: 'completed' }).eq("id", app.id);
                if (appError) throw appError;
                
                // Обновляем стату клиента (если он есть) или создаем нового
                let targetClientId = app.client_id;
                
                if (!targetClientId && app.client_phone) {
                    const { data: existingClient } = await supabase.from("clients").select("id, visits_count, total_revenue").eq("master_id", user.id).eq("phone", app.client_phone).maybeSingle();
                    if (existingClient) targetClientId = existingClient.id;
                }

                const price = Number(app.service?.price || 0);

                if (targetClientId) {
                    const client = clients.find(c => c.id === targetClientId);
                    if (client) {
                        await supabase.from("clients").update({ 
                            visits_count: client.visits_count + 1, 
                            total_revenue: Number(client.total_revenue) + price 
                        }).eq("id", targetClientId);
                    }
                } else if (app.client_phone) {
                    // Создаем нового клиента в базе
                    await supabase.from("clients").insert({
                        master_id: user.id,
                        name: app.client_name,
                        phone: app.client_phone,
                        visits_count: 1,
                        total_revenue: price,
                        is_blacklisted: false
                    });
                }
                await loadData(user.id, true); 
                setSelectedApp(null);
            } catch (err: any) { 
                alert("Ошибка: " + err.message); 
            }
        }
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean) => {
        if (confirm(currentStatus ? "Разблокировать клиента?" : "Добавить в черный список? Он не сможет к вам записываться.")) {
            try { 
                await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId); 
                await loadData(user.id, true); 
            } catch (err: any) { 
                alert("Ошибка: " + err.message); 
            }
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploadingImageId(serviceId);
        try {
            const fileExt = file.name.split('.').pop(); 
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('gallery').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const newUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('services').update({ image_urls: newUrls }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { 
            alert("Ошибка загрузки: " + err.message); 
        } finally { 
            setUploadingImageId(null); 
        }
    };

    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        try {
            const newUrls = currentUrls.filter(url => url !== urlToRemove);
            await supabase.from('services').update({ image_urls: newUrls }).eq('id', serviceId);
            await loadData(user.id, true);
        } catch (err: any) { 
            alert("Ошибка удаления: " + err.message); 
        }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    
    // ВЕБ ССЫЛКА ДЛЯ КЛИЕНТОВ
    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${user.id}` : "";
    
    const filteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const totalVisits = clients.reduce((acc, c) => acc + Number(c.visits_count || 0), 0);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    if (loading) return ( <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" /></div> );

    return (
        <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-[#0A84FF]/30 flex flex-col antialiased">
            
            {/* HEADER */}
            <header className="sticky top-0 z-30 bg-[#000000]/70 backdrop-blur-[40px] border-b border-white/[0.08] px-5 py-3.5 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] overflow-hidden shadow-sm shrink-0 bg-[#1C1C1E] flex items-center justify-center border border-white/10">
                        <span className="font-bold text-[#0A84FF] text-sm">EB</span>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-base font-semibold tracking-tight text-white">Кабинет</h1>
                            <div className="relative flex h-2 w-2 items-center justify-center">
                                {isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-white/50 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-[#32D74B] shadow-[0_0_8px_rgba(50,215,75,0.6)]"></span>}
                            </div>
                        </div>
                        <span className="text-[11px] text-white/50 truncate max-w-[150px] font-medium leading-none">
                            {businessName || "Настройте профиль"}
                        </span>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-white/50 hover:text-[#FF453A] p-2 bg-white/[0.06] rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-5 pb-32 space-y-6">
                
                {/* 🟢 ЗАПИСИ */}
                {activeTab === 'appointments' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {services.length > 0 && appointments.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                <button onClick={() => setActiveServiceFilter(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] border ${activeServiceFilter === null ? 'bg-[#0A84FF] text-white border-transparent shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]' : 'bg-[#1C1C1E] text-white/70 border-white/10'}`}>Все записи</button>
                                {services.map(s => <button key={s.id} onClick={() => setActiveServiceFilter(s.id)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-[0.97] border ${activeServiceFilter === s.id ? 'bg-[#0A84FF] text-white border-transparent shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]' : 'bg-[#1C1C1E] text-white/70 border-white/10'}`}>{s.name}</button>)}
                            </div>
                        )}

                        <div className="space-y-3">
                            {filteredAppointments.length === 0 ? (
                                <div className="text-center py-12"><div className="w-16 h-16 bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-8 h-8 text-white/30" /></div><p className="text-white/50 text-sm font-medium">Нет активных записей</p></div>
                            ) : filteredAppointments.map(app => (
                                <div key={app.id} onClick={() => setSelectedApp(app)} className={`rounded-[24px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all ${app.status === 'completed' ? 'bg-[#1C1C1E]/50 border border-white/5 opacity-60' : 'bg-[#1C1C1E] border border-white/10 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`font-semibold text-2xl tracking-tight ${app.status === 'completed' ? 'text-white/50' : 'text-[#0A84FF]'}`}>{format(new Date(app.start_time), "HH:mm")}</div>
                                                <div className="px-2.5 py-1 bg-white/10 rounded-lg text-[11px] text-white/70 font-semibold uppercase tracking-wide">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                {app.status === 'completed' && <div className="px-2.5 py-1 bg-[#32D74B]/20 text-[#32D74B] text-[11px] rounded-lg font-semibold uppercase tracking-wide">Завершено</div>}
                                            </div>
                                            <h3 className="text-white text-base font-semibold tracking-tight">{app.client_name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-white/60 pt-3 border-t border-white/10">
                                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-white/40" /><span className="truncate">{app.service?.name || "Услуга удалена"}</span></div>
                                        {app.employee?.name && <span className="bg-white/10 px-2 py-1 rounded-md text-[11px] font-medium text-white/70">{app.employee.name}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🔵 УСЛУГИ И СОТРУДНИКИ */}
                {activeTab === 'services' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        
                        {/* Блок добавления сотрудников (если Владелец) */}
                        {role === 'owner' && (
                            <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 shadow-sm">
                                <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Моя команда</h2>
                                <div className="flex flex-col gap-3 mb-6">
                                    <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Имя специалиста" className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#BF5AF2]/50 text-white placeholder-white/40" />
                                    <div className="flex gap-3">
                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} placeholder="Должность" className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#BF5AF2]/50 text-white placeholder-white/40" />
                                        <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="bg-[#BF5AF2] text-white w-14 rounded-2xl active:scale-[0.92] transition-all disabled:opacity-50 flex items-center justify-center shrink-0">
                                            {addingEmp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{emp.name}</p>
                                                {emp.specialty && <p className="text-[11px] text-[#BF5AF2] font-medium mt-0.5">{emp.specialty}</p>}
                                            </div>
                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-[#FF453A] bg-[#FF453A]/10 p-2.5 rounded-xl active:scale-[0.92] transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {employees.length === 0 && <p className="text-xs text-white/40 text-center py-2">Сотрудников пока нет</p>}
                                </div>
                            </div>
                        )}

                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 shadow-sm relative overflow-hidden">
                            <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Добавить услугу</h2>
                            <div className="flex flex-col gap-3">
                                {role === 'owner' && (
                                    <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all text-white appearance-none">
                                        <option value="" className="bg-[#1C1C1E]">Общая услуга (выполняют все)</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id} className="bg-[#1C1C1E]">Только: {emp.name}</option>)}
                                    </select>
                                )}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название услуги" className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all text-white placeholder-white/40" />
                                    <div className="flex gap-3">
                                        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Цена ₽" type="number" className="w-full sm:w-32 bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all text-white text-center placeholder-white/40" />
                                        <button onClick={handleAddService} disabled={addingService || !newName || !newPrice} className="bg-[#0A84FF] w-14 rounded-2xl active:scale-[0.92] transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] shrink-0">
                                            {addingService ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-6 h-6 text-white" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest pl-2 mb-1">Список услуг</h3>
                            {services.length === 0 ? <p className="text-center text-white/40 text-sm py-4">Услуг пока нет</p> : services.map(s => (
                                <div key={s.id} className="bg-[#1C1C1E]/60 p-5 rounded-[24px] border border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <div>
                                            <span className="text-base font-semibold tracking-tight text-white pr-4">{s.name}</span>
                                            {s.employee?.name && <span className="block text-[11px] text-[#0A84FF] font-medium mt-0.5">Мастер: {s.employee.name}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-white font-semibold px-3 py-1.5 bg-white/10 rounded-xl text-sm">{s.price} ₽</span>
                                            <label className="text-[#0A84FF] bg-[#0A84FF]/10 p-2.5 rounded-xl transition-all active:scale-[0.92] cursor-pointer">
                                                {uploadingImageId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, s.id, s.image_urls || [])} />
                                            </label>
                                            <button onClick={() => handleDeleteService(s.id)} className="text-[#FF453A] bg-[#FF453A]/10 p-2.5 rounded-xl active:scale-[0.92] transition-all"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                    {s.image_urls && s.image_urls.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x pt-4 mt-2 border-t border-white/5">
                                            {s.image_urls.map((url: string, idx: number) => (
                                                <div key={idx} className="relative shrink-0 snap-center">
                                                    <img src={url} alt="Услуга" className="w-16 h-16 object-cover rounded-2xl" />
                                                    <button onClick={() => handleRemoveImage(s.id, url, s.image_urls)} className="absolute -top-1.5 -right-1.5 bg-[#FF453A] text-white rounded-full p-1 shadow-md active:scale-95"><X className="w-3 h-3" /></button>
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
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск по имени или телефону..." className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#0A84FF]/50 transition-all placeholder-white/40" />
                        </div>
                        <div className="space-y-3">
                            {filteredClients.length === 0 ? <p className="text-white/40 text-center py-10 font-medium text-sm">Клиенты не найдены</p> : filteredClients.map(client => (
                                <div key={client.id} className={`p-5 rounded-[24px] border transition-all ${client.is_blacklisted ? 'border-[#FF453A]/30 bg-[#FF453A]/10 opacity-70' : 'bg-[#1C1C1E] border-white/10'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-white text-base font-semibold tracking-tight flex items-center gap-2">{client.name}{client.is_blacklisted && <span className="px-2 py-0.5 bg-[#FF453A] text-white text-[10px] rounded-md font-bold uppercase">В ЧС</span>}</h3>
                                            <p className="text-white/50 font-medium text-sm mt-0.5">{client.phone}</p>
                                        </div>
                                        <button onClick={() => handleToggleBlacklist(client.id, client.is_blacklisted)} className={`p-2.5 rounded-xl active:scale-[0.92] transition-all ${client.is_blacklisted ? 'text-[#32D74B] bg-[#32D74B]/10' : 'text-[#FF453A] bg-[#FF453A]/10'}`}><Ban className="w-5 h-5" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                                        <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-0.5">Визиты</p><p className="text-lg font-semibold tracking-tight text-white">{client.visits_count}</p></div>
                                        <div className="bg-[#32D74B]/10 p-3 rounded-2xl"><p className="text-[11px] text-[#32D74B]/70 font-semibold uppercase tracking-wider mb-0.5">Доход</p><p className="text-lg font-semibold tracking-tight text-[#32D74B]">{client.total_revenue} ₽</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🟢 АНАЛИТИКА */}
                {activeTab === 'analytics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#32D74B]/15 p-5 rounded-[28px] border border-[#32D74B]/20 shadow-sm">
                                <p className="text-[11px] text-[#32D74B] font-semibold uppercase tracking-wider mb-1">Общий доход</p>
                                <p className="text-2xl font-bold tracking-tight text-[#32D74B]">{totalRevenue} ₽</p>
                            </div>
                            <div className="bg-[#0A84FF]/15 p-5 rounded-[28px] border border-[#0A84FF]/20 shadow-sm">
                                <p className="text-[11px] text-[#0A84FF] font-semibold uppercase tracking-wider mb-1">Всего визитов</p>
                                <p className="text-2xl font-bold tracking-tight text-[#0A84FF]">{totalVisits}</p>
                            </div>
                        </div>

                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 shadow-sm">
                            <h3 className="text-base font-semibold tracking-tight text-white mb-4 flex items-center gap-2">Топ-5 клиентов (по доходу)</h3>
                            <div className="space-y-3">
                                {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                    <div key={c.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#FFD60A]/20 text-[#FFD60A]' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' : 'bg-white/10 text-white/50'}`}>{i + 1}</div>
                                            <div>
                                                <span className="text-sm font-semibold text-white block">{c.name}</span>
                                                <span className="text-[10px] text-white/40 font-medium">Визитов: {c.visits_count}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold tracking-tight text-[#32D74B]">{c.total_revenue} ₽</span>
                                    </div>
                                ))}
                                {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-center text-white/40 text-sm py-2">Пока нет данных для топа</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* 🟣 ПРОФИЛЬ */}
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                        
                        {/* Ссылка для клиентов */}
                        <div className="bg-[#0A84FF]/10 border border-[#0A84FF]/20 p-6 rounded-[28px] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A84FF]/20 blur-3xl rounded-full"></div>
                            <h2 className="text-[11px] font-semibold uppercase text-[#0A84FF] mb-3 tracking-wider flex items-center gap-1.5 relative z-10">Ссылка для записи</h2>
                            <div className="flex gap-2 relative z-10">
                                <input readOnly value={clientLink} className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-medium text-white/80 outline-none truncate font-mono" />
                                <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-[#0A84FF] px-5 rounded-2xl active:scale-[0.92] transition-all shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]"><Copy className="w-5 h-5 text-white" /></button>
                            </div>
                            <p className="text-[10px] text-white/40 mt-3 relative z-10">Разместите эту ссылку в Instagram, WhatsApp или VK.</p>
                        </div>

                        {/* Основные настройки */}
                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 shadow-sm">
                            <h2 className="text-lg font-semibold tracking-tight mb-5 text-white">Настройки профиля</h2>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] text-white/50 font-semibold uppercase tracking-wider ml-1">Название бизнеса или Имя</label>
                                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Моя компания" className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#0A84FF]/50 text-white" />
                                </div>
                                
                                <div>
                                    <label className="text-[11px] text-white/50 font-semibold uppercase tracking-wider block mb-2.5 ml-1">Рабочие дни (зеленые)</label>
                                    <div className="flex justify-between gap-1.5">
                                        {DAYS.map((d) => (
                                            <button key={d.id} onClick={() => toggleDay(d.id)} className={`flex-1 py-3 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${!disabledDays.includes(d.id) ? "bg-[#32D74B] text-black shadow-[0_2px_10px_0_rgba(50,215,75,0.3)]" : "bg-white/5 text-white/40 hover:bg-white/10"}`}>{d.label}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] text-white/50 font-semibold uppercase tracking-wider ml-1">Открытие</label>
                                        <input type="number" min="0" max="23" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-lg font-semibold outline-none focus:ring-2 focus:ring-[#0A84FF]/50 text-white text-center" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] text-white/50 font-semibold uppercase tracking-wider ml-1">Закрытие</label>
                                        <input type="number" min="0" max="23" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-lg font-semibold outline-none focus:ring-2 focus:ring-[#0A84FF]/50 text-white text-center" />
                                    </div>
                                </div>
                                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-semibold text-base shadow-[0_4px_14px_0_rgba(10,132,255,0.39)] active:scale-[0.97] transition-all flex items-center justify-center mt-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить профиль"}</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* NAV BAR */}
            <nav className="fixed bottom-0 left-0 w-full z-40 bg-[#000000]/75 backdrop-blur-xl border-t border-white/[0.08] pb-safe pt-2 sm:px-6">
                <div className="flex justify-between items-center max-w-sm mx-auto px-4 pb-4 pt-1">
                    {[
                        { id: 'appointments', icon: CalendarDays, label: 'Записи' },
                        { id: 'services', icon: Briefcase, label: 'Услуги' },
                        { id: 'clients', icon: Users, label: 'Клиенты' },
                        { id: 'analytics', icon: BarChart3, label: 'Доход' },
                        { id: 'profile', icon: UserCircle, label: 'Профиль' }
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all w-16 active:scale-95 ${activeTab === tab.id ? 'text-[#0A84FF]' : 'text-white/40 hover:text-white/70'}`}>
                            <div className="p-1.5"><tab.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === tab.id ? 'fill-[#0A84FF]/20 stroke-2' : 'stroke-[1.5]'}`} /></div>
                            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* MODAL - ДЕТАЛИ ЗАПИСИ */}
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedApp(null)}>
                    <div className="bg-[#1C1C1E] p-6 rounded-[32px] w-full max-w-sm shadow-2xl relative border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 p-2 rounded-full active:scale-90 transition-all"><X className="w-5 h-5" /></button>
                        <h2 className="text-lg font-semibold tracking-tight mb-6 text-white">Детали визита</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-1">Клиент</p>
                                <p className="text-xl font-bold tracking-tight text-white">{selectedApp.client_name}</p>
                                <p className="text-sm font-medium text-[#0A84FF] mt-1">{selectedApp.client_phone}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-5">
                                <div>
                                    <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-1">Время</p>
                                    <p className="text-base font-semibold text-white">{format(new Date(selectedApp.start_time), "d MMMM", { locale: ru })}</p>
                                    <p className="text-sm font-medium text-white/60">{format(new Date(selectedApp.start_time), "HH:mm")}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider mb-1">Услуга</p>
                                    <p className="text-base font-semibold text-white leading-tight">{selectedApp.service?.name}</p>
                                    {selectedApp.employee?.name && <p className="text-[11px] text-[#0A84FF] font-medium mt-1">Мастер: {selectedApp.employee.name}</p>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-1">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-[#32D74B] text-black font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(50,215,75,0.39)]"><CheckCircle2 className="w-5 h-5" /> Завершить визит</button>}
                                
                                {selectedApp.client_phone && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-[#0A84FF] text-white font-semibold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(10,132,255,0.39)]"><Phone className="w-5 h-5" /> Позвонить</a>
                                        <a href={`https://wa.me/${getCleanPhone(selectedApp.client_phone)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-semibold py-4 rounded-2xl text-center active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(37,211,102,0.39)]"><MessageCircle className="w-5 h-5" /> WhatsApp</a>
                                    </div>
                                )}
                                
                                {selectedApp.status !== 'completed' && <button onClick={() => handleDeleteRecord(selectedApp.id)} className="w-full bg-transparent text-[#FF453A] font-semibold py-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-1 border border-[#FF453A]/20 hover:bg-[#FF453A]/10"><Trash2 className="w-5 h-5" /> Отменить запись</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}