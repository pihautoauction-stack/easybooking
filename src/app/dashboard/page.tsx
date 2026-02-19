"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus, 
    Loader2, Briefcase, CalendarDays, UserCircle, Phone, X, MessageCircle, 
    RefreshCw, Users, Search, Ban, BarChart3, ImagePlus, CheckCircle2, Clock, Coffee, 
    UserPlus, Archive, Edit3, Camera, Calculator, ChevronLeft, ChevronRight, Package, Folder, FolderOpen, AlertTriangle, ListTree, History
} from "lucide-react";
import { format, startOfToday, addDays, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

type Tab = 'appointments' | 'services' | 'clients' | 'inventory' | 'analytics' | 'profile';

const NAV_ITEMS = [
    { id: 'appointments', icon: CalendarDays, label: 'Записи' },
    { id: 'services', icon: ListTree, label: 'Прайс' },
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'inventory', icon: Package, label: 'Склад' },
    { id: 'analytics', icon: BarChart3, label: 'Финансы' },
    { id: 'profile', icon: UserCircle, label: 'Настройки' }
];

const getServiceColor = (id: string | undefined) => {
    if (!id) return { border: 'border-l-stone-400', badge: 'bg-stone-100 text-stone-600' };
    const colors = [
        { border: 'border-l-rose-400', badge: 'bg-rose-100 text-rose-700' },
        { border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700' },
        { border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
        { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700' },
        { border: 'border-l-violet-400', badge: 'bg-violet-100 text-violet-700' },
        { border: 'border-l-cyan-400', badge: 'bg-cyan-100 text-cyan-700' },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[hash % colors.length];
};

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<Tab>('appointments');
    const [journalView, setJournalView] = useState<'active' | 'archive'>('active');
    const [viewDate, setViewDate] = useState(startOfToday());

    // Профиль
    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState("");
    const [weeklySettings, setWeeklySettings] = useState<any>({});
    const [scheduleStep, setScheduleStep] = useState(30);
    const [breaks, setBreaks] = useState<{start: string, end: string}[]>([]);
    const [newBreakStart, setNewBreakStart] = useState("13:00");
    const [newBreakEnd, setNewBreakEnd] = useState("14:00");
    const [disabledDays, setDisabledDays] = useState<number[]>([]); 
    const [workStartTime, setWorkStartTime] = useState("09:00");
    const [workEndTime, setWorkEndTime] = useState("20:00");
    
    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); 
    const [inventory, setInventory] = useState<any[]>([]); 
    const [transactions, setTransactions] = useState<any[]>([]);
    
    const [saving, setSaving] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [serviceSearchQuery, setServiceSearchQuery] = useState("");
    const [activeServiceFilter, setActiveServiceFilter] = useState<string | null>(null);
    
    // Форма Услуги (с Категорией)
    const [serviceCategorySelect, setServiceCategorySelect] = useState("Общие");
    const [serviceCategoryInput, setServiceCategoryInput] = useState("");
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newDuration, setNewDuration] = useState("60");
    const [newServiceEmpId, setNewServiceEmpId] = useState(""); 
    const [addingService, setAddingService] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    
    // Редактирование услуги
    const [selectedService, setSelectedService] = useState<any>(null);
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    // Форма сотрудника
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpSpec, setNewEmpSpec] = useState("");
    const [newEmpCommission, setNewEmpCommission] = useState("50"); 
    const [addingEmp, setAddingEmp] = useState(false);

    // ПОРТФОЛИО
    const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

    // ЗАПИСИ
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualName, setManualName] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualService, setManualService] = useState("");
    const [manualEmployee, setManualEmployee] = useState("");
    const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [manualTime, setManualTime] = useState("12:00");
    const [addingManual, setAddingManual] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);

    // CRM
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientNote, setClientNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    // СКЛАД (INVENTORY)
    const [invView, setInvView] = useState<'stock' | 'history'>('stock');
    const [showInvModal, setShowInvModal] = useState(false);
    const [invCategorySelect, setInvCategorySelect] = useState("Расходники");
    const [invCategoryInput, setInvCategoryInput] = useState("");
    const [invName, setInvName] = useState("");
    const [invSku, setInvSku] = useState("");
    const [invUnit, setInvUnit] = useState("шт");
    const [invQty, setInvQty] = useState("0");
    const [invCritical, setInvCritical] = useState("5");
    const [invCost, setInvCost] = useState("0");
    const [invRetail, setInvRetail] = useState("0");
    const [addingInv, setAddingInv] = useState(false);
    const [expandedInvCategories, setExpandedInvCategories] = useState<Record<string, boolean>>({});

    // Расходники при завершении визита
    const [usedMaterials, setUsedMaterials] = useState<{id: string, qty: number}[]>([]);

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
                setScheduleStep(p.schedule_step || 30);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
                if (p.work_start_time) setWorkStartTime(p.work_start_time);
                if (p.work_end_time) setWorkEndTime(p.work_end_time);
                if (p.breaks) setBreaks(typeof p.breaks === 'string' ? JSON.parse(p.breaks) : p.breaks || []);
                if (p.portfolio_urls) setPortfolioUrls(typeof p.portfolio_urls === 'string' ? JSON.parse(p.portfolio_urls) : p.portfolio_urls);
                if (p.weekly_settings) setWeeklySettings(typeof p.weekly_settings === 'string' ? JSON.parse(p.weekly_settings) : p.weekly_settings);
            }
            
            const { data: s } = await supabase.from("services").select("*, employee:employees(name)").eq("user_id", userId).order('created_at');
            setServices(s || []);
            
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            setEmployees(e || []);

            const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", userId).order('name');
            setInventory(inv || []);

            const { data: tx } = await supabase.from("inventory_transactions").select("*, inventory(name, unit)").eq("user_id", userId).order('created_at', { ascending: false }).limit(50);
            setTransactions(tx || []);
            
            const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, employee_id, materials_cost, materials_retail, service:services(name, category, price, duration), employee:employees(name)")
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
                id: user.id, business_name: businessName, username: cleanUsername || null, 
                schedule_step: scheduleStep, breaks: breaks, portfolio_urls: portfolioUrls, 
                weekly_settings: weeklySettings, updated_at: new Date(),
                disabled_days: disabledDays.join(','), work_start_time: workStartTime, work_end_time: workEndTime
            });
            if (error) throw error;
            setUsername(cleanUsername);
            alert("Настройки успешно сохранены!");
        } catch (err: any) {
            if (err.code === '23505') alert("Этот никнейм уже занят! Придумайте другой.");
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

    // ФУНКЦИИ УСЛУГ И КАТЕГОРИЙ
    const handleAddService = async () => {
        if (!newName || !newPrice || !newDuration) return;
        setAddingService(true);
        const finalCategory = serviceCategorySelect === 'NEW' ? serviceCategoryInput : serviceCategorySelect;
        
        const insertData: any = { user_id: user.id, name: newName, category: finalCategory || "Общие", price: Number(newPrice), duration: Number(newDuration), image_urls: [] };
        if (role === 'owner' && newServiceEmpId) insertData.employee_id = newServiceEmpId;
        
        await supabase.from("services").insert(insertData);
        setNewName(""); setNewPrice(""); setNewDuration("60"); setNewServiceEmpId(""); setServiceCategoryInput(""); await loadData(user.id); setAddingService(false);
    };

    const handleDeleteService = async (id: string) => { 
        if (confirm("Удалить эту услугу?")) { 
            await supabase.from("services").delete().eq("id", id); 
            setSelectedService(null);
            await loadData(user.id); 
        } 
    };

    const toggleCategory = (cat: string) => setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}));
    
    const existingServiceCategories = Array.from(new Set(services.map(s => s.category || 'Общие')));
    if (!existingServiceCategories.includes("Общие")) existingServiceCategories.unshift("Общие");

    const filteredServicesList = services.filter(s => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.category && s.category.toLowerCase().includes(serviceSearchQuery.toLowerCase())));
    const groupedServices = filteredServicesList.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Общие';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {});

    // ФУНКЦИИ СКЛАДА
    const handleAddInventory = async (e: React.FormEvent) => {
        e.preventDefault(); setAddingInv(true);
        const finalCategory = invCategorySelect === 'NEW' ? invCategoryInput : invCategorySelect;
        try {
            await supabase.from("inventory").insert({
                user_id: user.id, name: invName, category: finalCategory || 'Расходники', sku: invSku, unit: invUnit, 
                quantity: Number(invQty), critical_level: Number(invCritical), cost_price: Number(invCost), retail_price: Number(invRetail)
            });
            setShowInvModal(false); setInvName(""); setInvSku(""); setInvQty("0"); setInvCost("0"); setInvRetail("0"); setInvCategoryInput("");
            await loadData(user.id, true);
        } catch(err) { alert("Ошибка сохранения"); } finally { setAddingInv(false); }
    };

    const handleAdjustInventory = async (item: any, type: 'add' | 'deduct') => {
        const amountStr = prompt(`Введите количество для ${type === 'add' ? 'прихода' : 'списания'} (${item.unit}):`, "1");
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Неверное количество");
        
        const newQty = type === 'add' ? item.quantity + amount : item.quantity - amount;
        
        await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id);
        await supabase.from('inventory_transactions').insert({
            inventory_id: item.id, user_id: user.id, change_amount: type === 'add' ? amount : -amount, type: type === 'add' ? 'manual_add' : 'manual_deduct'
        });
        await loadData(user.id, true);
    };

    const handleDeleteInventory = async (id: string) => {
        if(confirm("Удалить позицию со склада?")) {
            await supabase.from("inventory").delete().eq("id", id);
            await loadData(user.id, true);
        }
    }

    const toggleInvCategory = (cat: string) => setExpandedInvCategories(prev => ({...prev, [cat]: !prev[cat]}));

    const existingInvCategories = Array.from(new Set(inventory.map(i => i.category || 'Расходники')));
    if (!existingInvCategories.includes("Расходники")) existingInvCategories.unshift("Расходники");

    const groupedInventory = inventory.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Расходники';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {});


    // ЗАВЕРШЕНИЕ ВИЗИТА С РАСХОДНИКАМИ И РОЗНИЦЕЙ
    const handleCompleteRecord = async (app: any) => {
        if (!confirm("Завершить визит и списать материалы?")) return;
        
        let totalCost = 0;
        let totalRetail = 0;
        
        for (const used of usedMaterials) {
            if (used.qty > 0 && used.id) {
                const item = inventory.find(i => i.id === used.id);
                if (item) {
                    totalCost += (item.cost_price * used.qty);
                    totalRetail += ((item.retail_price || item.cost_price) * used.qty); 
                    
                    const newQty = item.quantity - used.qty;
                    await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id);
                    await supabase.from('inventory_transactions').insert({
                        inventory_id: item.id, user_id: user.id, appointment_id: app.id, change_amount: -used.qty, type: 'appointment_usage'
                    });
                }
            }
        }

        await supabase.from("appointments").update({ status: 'completed', materials_cost: totalCost, materials_retail: totalRetail }).eq("id", app.id);
        
        let targetClientId = app.client_id;
        if (!targetClientId && app.client_phone) {
            const { data: existingClient } = await supabase.from("clients").select("id, visits_count, total_revenue").eq("master_id", user.id).eq("phone", app.client_phone).maybeSingle();
            if (existingClient) targetClientId = existingClient.id;
        }
        
        const baseServicePrice = Number(app.service?.price || 0);
        const finalClientPrice = baseServicePrice + totalRetail; 
        
        if (targetClientId) {
            const client = clients.find(c => c.id === targetClientId);
            if (client) await supabase.from("clients").update({ visits_count: client.visits_count + 1, total_revenue: Number(client.total_revenue) + finalClientPrice }).eq("id", targetClientId);
        } else if (app.client_phone) {
            await supabase.from("clients").insert({ master_id: user.id, name: app.client_name, phone: app.client_phone, visits_count: 1, total_revenue: finalClientPrice, is_blacklisted: false, notes: "" });
        }
        
        setUsedMaterials([]);
        setSelectedApp(null);
        setJournalView('archive');
        await loadData(user.id, true); 
    };

    // ОСТАЛЬНЫЕ ФУНКЦИИ
    const handleAddBreak = () => { if (newBreakStart && newBreakEnd) { setBreaks([...breaks, { start: newBreakStart, end: newBreakEnd }]); setNewBreakStart("13:00"); setNewBreakEnd("14:00"); } };
    const handleRemoveBreak = (index: number) => setBreaks(breaks.filter((_, i) => i !== index));
    const handleAddEmployee = async () => { if (!newEmpName) return; setAddingEmp(true); await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec, commission_rate: Number(newEmpCommission) || 50 }); setNewEmpName(""); setNewEmpSpec(""); setNewEmpCommission("50"); await loadData(user.id); setAddingEmp(false); };
    const handleDeleteEmployee = async (id: string) => { if (confirm("Удалить специалиста?")) { await supabase.from("employees").delete().eq("id", id); await loadData(user.id); } };
    const handleDeleteRecord = async (id: string) => { if (confirm("Точно удалить?")) { await supabase.from("appointments").delete().eq("id", id); await loadData(user.id); setSelectedApp(null); } };
    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean, e: React.MouseEvent) => { e.stopPropagation(); if (confirm(currentStatus ? "Разблокировать?" : "В ЧС?")) { await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId); await loadData(user.id, true); } };
    
    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingImageId(serviceId);
        try {
            const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const updatedUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId);
            if (selectedService && selectedService.id === serviceId) setSelectedService({...selectedService, image_urls: updatedUrls});
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingImageId(null); }
    };
    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId); 
        if (selectedService && selectedService.id === serviceId) setSelectedService({...selectedService, image_urls: updatedUrls});
        await loadData(user.id, true);
    };

    const handleAddManualBooking = async (e: React.FormEvent) => {
        e.preventDefault(); if (!manualName || !manualDate || !manualTime) return; setAddingManual(true);
        try {
            const startDateTime = new Date(`${manualDate}T${manualTime}:00`).toISOString();
            await supabase.from('appointments').insert({ master_id: user.id, service_id: manualService || null, employee_id: manualEmployee || null, client_name: manualName, client_phone: manualPhone, start_time: startDateTime, status: 'active' });
            setShowManualModal(false); setManualName(""); setManualPhone(""); setManualService(""); setViewDate(new Date(`${manualDate}T00:00:00`)); await loadData(user.id, true); setJournalView('active');
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setAddingManual(false); }
    };

    const handleSaveClientNote = async () => {
        if (!selectedClient) return; setSavingNote(true);
        try { await supabase.from('clients').update({ notes: clientNote }).eq('id', selectedClient.id); setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, notes: clientNote } : c)); setSelectedClient({ ...selectedClient, notes: clientNote }); } 
        catch (err: any) { alert("Ошибка: " + err.message); } finally { setSavingNote(false); }
    };

    const toggleDay = (dayId: number) => setDisabledDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${username || user.id}` : "";
    
    // ФИЛЬТРАЦИЯ
    const serviceFilteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const activeDailyApps = useMemo(() => serviceFilteredAppointments.filter(app => isSameDay(new Date(app.start_time), viewDate) && app.status === 'active'), [serviceFilteredAppointments, viewDate]);
    const archivedApps = serviceFilteredAppointments.filter(a => a.status === 'completed').reverse();
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');
    
    // ================= ФИНАНСОВЫЙ И СКЛАДСКОЙ РАСЧЕТ =================
    let totalRevenue = 0;
    let totalPayroll = 0;
    let totalMaterialsCost = 0;
    const employeeStats: Record<string, {name: string, visits: number, earned: number}> = {};

    archivedApps.forEach(app => {
        const servicePrice = Number(app.service?.price || 0); 
        const matRetail = Number(app.materials_retail || 0); 
        const matCost = Number(app.materials_cost || 0); 
        
        totalRevenue += (servicePrice + matRetail); 
        totalMaterialsCost += matCost;

        if (app.employee_id) {
            const emp = employees.find(e => e.id === app.employee_id);
            const rate = emp?.commission_rate || 50;
            const empCut = (servicePrice * rate) / 100; 
            totalPayroll += empCut;

            if (!employeeStats[app.employee_id]) {
                employeeStats[app.employee_id] = { name: app.employee?.name || 'Специалист', visits: 0, earned: 0 };
            }
            employeeStats[app.employee_id].visits += 1;
            employeeStats[app.employee_id].earned += empCut;
        }
    });
    
    const netIncome = totalRevenue - totalPayroll - totalMaterialsCost;
    const inventoryValue = inventory.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost_price)), 0);
    const totalInventoryUnits = inventory.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    // =====================================================

    let sortedInvCats: string[] = [];
    if (selectedApp) {
        const targetCat = selectedApp.service?.category || 'Общие';
        sortedInvCats = Object.keys(groupedInventory).sort((a, b) => {
            if (a === targetCat) return -1;
            if (b === targetCat) return 1;
            return a.localeCompare(b);
        });
    }

    const getWhatsAppLink = (app: any) => {
        if (!app.client_phone) return "#";
        const text = `Здравствуйте, ${app.client_name}! 🌸\n\nНапоминаю о вашей записи на ${app.service?.name ? `"${app.service.name}"` : "задачу/визит"}.\n\n🗓 Дата: ${format(new Date(app.start_time), "d MMMM", { locale: ru })}\n⏰ Время: ${format(new Date(app.start_time), "HH:mm")}\n\nЖдем вас!`;
        return `https://wa.me/${getCleanPhone(app.client_phone)}?text=${encodeURIComponent(text)}`;
    };

    const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

    if (loading) return ( <div className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-rose-400" /></div> );

    return (
        <div className="flex h-[100dvh] bg-[#FAF9F6] text-stone-800 font-sans selection:bg-rose-200 antialiased overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="hidden md:flex w-72 bg-white border-r border-stone-200 flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-6 flex items-center gap-3 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center shrink-0 shadow-md">
                        <span className="font-bold text-white tracking-tight text-sm">NX</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-black text-stone-900 tracking-tight text-sm leading-tight">Nexio</h2>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-tight mt-0.5">ERP System</span>
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
                        <span className="text-xs font-bold text-stone-600 truncate">{businessName || "Профиль"}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 transition-all shadow-sm"><LogOut className="w-4 h-4" /> Выйти</button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                
                {/* MOBILE HEADER */}
                <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200 px-5 py-3.5 flex justify-between items-center transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center shrink-0 shadow-sm"><span className="font-bold text-white text-xs tracking-tight">NX</span></div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-0.5"><h1 className="text-sm font-black tracking-tight text-stone-900">Управление</h1><div className="relative flex h-2 w-2 items-center justify-center">{isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-stone-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}</div></div>
                            <span className="text-[10px] text-stone-400 truncate max-w-[140px] font-bold leading-none">{businessName || "Профиль"}</span>
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
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                                            <button onClick={() => setJournalView('active')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${journalView === 'active' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>На день</button>
                                            <button onClick={() => setJournalView('archive')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${journalView === 'archive' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><Archive className="w-4 h-4"/> Архив</button>
                                        </div>
                                        {journalView === 'active' && (
                                            <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm gap-1">
                                                <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronLeft className="w-4 h-4"/></button>
                                                <span className="text-xs font-black px-3 text-stone-700 uppercase tracking-widest min-w-[110px] text-center">{format(viewDate, "d MMMM", { locale: ru })}</span>
                                                <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronRight className="w-4 h-4"/></button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setShowManualModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                                        <Plus className="w-4 h-4"/> Добавить задачу
                                    </button>
                                </div>

                                {/* АРХИВ */}
                                {journalView === 'archive' && (
                                    <>
                                        {archivedApps.length === 0 ? (
                                            <div className="text-center py-20 bg-white border border-stone-200 rounded-[32px] shadow-sm"><div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"><Archive className="w-7 h-7 text-stone-300" /></div><p className="text-stone-400 text-sm font-bold">Архив пуст</p></div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {archivedApps.map(app => (
                                                    <div key={app.id} onClick={() => setSelectedApp(app)} className="rounded-[24px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border border-l-4 border-l-emerald-300 border-y-stone-100 border-r-stone-100 opacity-80 shadow-sm hover:border-emerald-400">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="font-black text-2xl tracking-tight text-stone-400">{format(new Date(app.start_time), "HH:mm")}</div>
                                                            <div className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] text-stone-500 font-black uppercase tracking-widest">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                                        </div>
                                                        <h3 className="text-stone-800 text-base font-black tracking-tight">{app.client_name}</h3>
                                                        <div className="flex justify-between items-center text-sm text-stone-500 pt-3 mt-2 border-t border-stone-50">
                                                            <span className="truncate text-xs font-bold">{app.service?.name || "Без услуги"}</span>
                                                            <span className="text-emerald-600 font-black text-xs">{app.materials_cost ? `Мат: ${app.materials_cost}₽` : ''}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* АКТИВНЫЕ */}
                                {journalView === 'active' && (
                                    <>
                                        {activeDailyApps.length === 0 ? (
                                            <div className="text-center py-20 bg-white border border-stone-200 rounded-[32px] shadow-sm"><div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-7 h-7 text-stone-300" /></div><p className="text-stone-400 text-base font-black mb-2">На этот день записей нет</p><p className="text-stone-400 text-sm font-medium">Отдохните или добавьте новую задачу вручную.</p></div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {activeDailyApps.map(app => {
                                                    const colorTheme = getServiceColor(app.service_id || app.employee_id || app.id);
                                                    const endTime = new Date(new Date(app.start_time).getTime() + (app.service?.duration || 60) * 60000);
                                                    return (
                                                        <div key={app.id} onClick={() => setSelectedApp(app)} className={`bg-white rounded-[24px] p-5 border-y border-r border-stone-200 border-l-8 ${colorTheme.border} shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[160px]`}>
                                                            <div>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <p className="text-2xl font-black text-stone-800 leading-none">{format(new Date(app.start_time), "HH:mm")} <span className="text-xs text-stone-400 font-bold ml-1">- {format(endTime, "HH:mm")}</span></p>
                                                                    {app.employee?.name && <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md truncate max-w-[100px] ${colorTheme.badge}`}>{app.employee.name}</span>}
                                                                </div>
                                                                <h3 className="font-black text-stone-900 text-lg mb-1 leading-tight">{app.client_name}</h3>
                                                                {app.client_phone && <p className="text-xs font-bold text-stone-500">{app.client_phone}</p>}
                                                            </div>
                                                            <div className="flex items-center gap-2 pt-3 mt-2 border-t border-stone-100">
                                                                <Briefcase className="w-4 h-4 text-stone-400" /><span className="text-xs font-bold text-stone-600 truncate">{app.service?.name || "Задача"}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* 🔵 ПРАЙС-ЛИСТ (УМНЫЕ ПАПКИ) */}
                        {activeTab === 'services' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm">
                                            <h2 className="text-lg font-black tracking-tight mb-5 text-stone-800">Добавить услугу</h2>
                                            <div className="flex flex-col gap-3">
                                                
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Папка (Категория)</label>
                                                    <select value={serviceCategorySelect} onChange={e => setServiceCategorySelect(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer">
                                                        {existingServiceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                        <option value="NEW">+ Создать новую папку</option>
                                                    </select>
                                                </div>
                                                {serviceCategorySelect === 'NEW' && (
                                                    <input value={serviceCategoryInput} onChange={e => setServiceCategoryInput(e.target.value)} placeholder="Название новой папки..." className="w-full bg-white border border-rose-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 shadow-sm" />
                                                )}

                                                <div className="space-y-1 mt-2">
                                                    <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Название услуги</label>
                                                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Например: Замена масла" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 transition-all text-stone-800" />
                                                </div>

                                                {role === 'owner' && (
                                                    <select value={newServiceEmpId} onChange={e => setNewServiceEmpId(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none appearance-none"><option value="">Выполняют все</option>{employees.map(emp => <option key={emp.id} value={emp.id}>Только: {emp.name}</option>)}</select>
                                                )}
                                                <div className="grid grid-cols-2 gap-3 mt-1">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold uppercase">Мин</span><input value={newDuration} onChange={e => setNewDuration(e.target.value)} type="number" placeholder="60" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" /></div>
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">₽</span><input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Цена" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 pl-8 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800" /></div>
                                                </div>
                                                <button onClick={handleAddService} disabled={addingService || !newName || !newPrice || (serviceCategorySelect === 'NEW' && !serviceCategoryInput)} className="w-full mt-4 bg-stone-900 text-white p-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex justify-center items-center hover:bg-black">{addingService ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить в прайс"}</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="relative mb-4">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                            <input value={serviceSearchQuery} onChange={e => setServiceSearchQuery(e.target.value)} placeholder="Поиск по прайсу..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 transition-all placeholder-stone-400" />
                                        </div>
                                        
                                        <div className="bg-white rounded-[32px] border border-stone-200 shadow-sm p-2">
                                            {Object.keys(groupedServices).length === 0 ? <p className="text-center text-stone-400 text-sm py-10 font-bold">Ничего не найдено</p> : 
                                                (Object.entries(groupedServices) as [string, any[]][]).map(([category, items]) => (
                                                    <div key={category} className="mb-2 last:mb-0">
                                                        <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                {expandedCategories[category] ? <FolderOpen className="w-5 h-5 text-rose-400"/> : <Folder className="w-5 h-5 text-stone-400"/>}
                                                                <span className="font-black text-stone-900 text-base">{category}</span>
                                                                <span className="bg-white text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black border border-stone-200">{items.length}</span>
                                                            </div>
                                                        </button>
                                                        {expandedCategories[category] && (
                                                            <div className="pl-4 pr-2 py-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                {items.map(s => (
                                                                    <div key={s.id} onClick={() => setSelectedService(s)} className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors group">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            {s.image_urls && s.image_urls[0] ? (
                                                                                <img src={s.image_urls[0]} className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0" alt="img" />
                                                                            ) : (
                                                                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4 text-stone-300"/></div>
                                                                            )}
                                                                            <div className="min-w-0">
                                                                                <p className="font-black text-stone-900 text-sm truncate group-hover:text-rose-600 transition-colors">{s.name}</p>
                                                                                <p className="text-[10px] text-stone-500 font-bold flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3"/> {s.duration} мин {s.employee?.name && `• ${s.employee.name}`}</p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="font-black text-stone-900 bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg text-sm shrink-0 shadow-sm group-hover:border-rose-200">{s.price} ₽</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 📦 СКЛАД (С ПАПКАМИ И ИСТОРИЕЙ) */}
                        {activeTab === 'inventory' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                    <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                                        <button onClick={() => setInvView('stock')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${invView === 'stock' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Остатки</button>
                                        <button onClick={() => setInvView('history')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${invView === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><History className="w-4 h-4"/> История</button>
                                    </div>
                                    {invView === 'stock' && (
                                        <button onClick={() => setShowInvModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                                            <Plus className="w-4 h-4"/> Новый товар
                                        </button>
                                    )}
                                </div>

                                {invView === 'stock' && (
                                    <>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="col-span-2 bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                                                <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Номенклатура (видов)</p>
                                                <p className="text-3xl font-black tracking-tight text-stone-900">{inventory.length} <span className="text-sm font-bold text-stone-400 ml-1">категорий</span></p>
                                                <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">Всего физ. единиц: {totalInventoryUnits}</p>
                                            </div>
                                            <div className="col-span-2 bg-stone-900 p-6 rounded-[32px] shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                                                <p className="text-xs text-stone-400 font-black uppercase tracking-widest mb-1 relative z-10">Стоимость активов</p>
                                                <p className="text-3xl font-black tracking-tight relative z-10">{inventoryValue} <span className="text-xl opacity-60">₽</span></p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-2 rounded-[32px] border border-stone-200 shadow-sm">
                                            {Object.keys(groupedInventory).length === 0 ? <p className="text-center text-stone-400 text-sm py-10 font-bold">Склад пуст</p> : 
                                                (Object.entries(groupedInventory) as [string, any[]][]).map(([category, items]) => (
                                                    <div key={category} className="mb-2 last:mb-0">
                                                        <button onClick={() => toggleInvCategory(category)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                {expandedInvCategories[category] ? <FolderOpen className="w-5 h-5 text-rose-400"/> : <Folder className="w-5 h-5 text-stone-400"/>}
                                                                <span className="font-black text-stone-900 text-base">{category}</span>
                                                                <span className="bg-white text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black border border-stone-200">{items.length} поз.</span>
                                                            </div>
                                                        </button>
                                                        {expandedInvCategories[category] && (
                                                            <div className="px-2 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="border-b border-stone-100 text-[10px] uppercase tracking-widest text-stone-400">
                                                                                <th className="pb-3 pl-3 font-black">Наименование</th>
                                                                                <th className="pb-3 font-black">Остаток</th>
                                                                                <th className="pb-3 font-black hidden sm:table-cell">Закупка</th>
                                                                                <th className="pb-3 font-black hidden sm:table-cell">Розница</th>
                                                                                <th className="pb-3 font-black text-right pr-3">Действия</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {items.map(item => {
                                                                                const isLow = item.quantity <= item.critical_level;
                                                                                return (
                                                                                    <tr key={item.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors group">
                                                                                        <td className="py-4 pl-3">
                                                                                            <p className="font-black text-sm text-stone-900">{item.name}</p>
                                                                                            {item.sku && <p className="text-[10px] text-stone-400 font-bold font-mono mt-0.5">Арт: {item.sku}</p>}
                                                                                        </td>
                                                                                        <td className="py-4">
                                                                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${isLow ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                                                {isLow && <AlertTriangle className="w-3 h-3"/>}
                                                                                                {item.quantity} {item.unit}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="py-4 hidden sm:table-cell font-black text-stone-400 text-sm">{item.cost_price} ₽</td>
                                                                                        <td className="py-4 hidden sm:table-cell font-black text-stone-600 text-sm">{item.retail_price} ₽</td>
                                                                                        <td className="py-4 pr-3 text-right">
                                                                                            <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                <button onClick={() => handleAdjustInventory(item, 'deduct')} className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors" title="Списать">-</button>
                                                                                                <button onClick={() => handleAdjustInventory(item, 'add')} className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors" title="Добавить">+</button>
                                                                                                <button onClick={() => handleDeleteInventory(item.id)} className="p-2 ml-2 bg-white border border-stone-200 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </>
                                )}

                                {invView === 'history' && (
                                    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                                        <h3 className="text-xl font-black text-stone-800 mb-6 flex items-center gap-2"><History className="w-5 h-5 text-rose-500"/> Журнал операций</h3>
                                        <div className="space-y-3">
                                            {transactions.length === 0 ? <p className="text-sm text-stone-400 font-bold text-center py-10">История пуста</p> : 
                                                transactions.map(tx => {
                                                    const isAdd = tx.change_amount > 0;
                                                    return (
                                                        <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-colors">
                                                            <div>
                                                                <p className="font-black text-sm text-stone-900">{tx.inventory?.name || "Товар удален"}</p>
                                                                <p className="text-[10px] font-bold text-stone-500 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                                                    {tx.type === 'manual_add' ? <span className="text-emerald-600">Ручной приход</span> : 
                                                                     tx.type === 'manual_deduct' ? <span className="text-orange-500">Ручное списание</span> : 
                                                                     <span className="text-violet-500">Расход на заказ</span>}
                                                                    <span className="text-stone-300">•</span> {format(new Date(tx.created_at), "d MMM HH:mm", { locale: ru })}
                                                                </p>
                                                            </div>
                                                            <span className={`font-black text-sm px-3 py-1.5 rounded-xl border shrink-0 ${isAdd ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                {isAdd ? '+' : ''}{tx.change_amount} {tx.inventory?.unit || 'шт'}
                                                            </span>
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🟡 БАЗА КЛИЕНТОВ (CRM) */}
                        {activeTab === 'clients' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">
                                <div className="relative max-w-xl mx-auto md:max-w-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                    <input value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} placeholder="Поиск клиента..." className="w-full bg-white border border-stone-200 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all placeholder-stone-400" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredClients.length === 0 ? <p className="text-stone-400 text-center py-10 font-bold text-sm col-span-full">Нет данных</p> : filteredClients.map(client => (
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
                                                <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Заказы</p><p className="text-lg font-black tracking-tight text-stone-800">{client.visits_count}</p></div>
                                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Выручка</p><p className="text-lg font-black tracking-tight text-emerald-600">{client.total_revenue} ₽</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 🟢 АНАЛИТИКА И ФИНАНСЫ */}
                        {activeTab === 'analytics' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Общая выручка</p>
                                        <p className="text-3xl font-black tracking-tight text-stone-900">{totalRevenue} <span className="text-xl text-stone-400">₽</span></p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[32px] border border-stone-200 shadow-sm flex flex-col justify-center">
                                        <p className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5"/> Фонд ЗП и Затраты</p>
                                        <p className="text-3xl font-black tracking-tight text-rose-500">{totalPayroll + totalMaterialsCost} <span className="text-xl text-rose-300">₽</span></p>
                                        <p className="text-[10px] font-bold text-stone-400 mt-1">ЗП: {totalPayroll}₽ | Мат. (Закупка): {totalMaterialsCost}₽</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-6 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                        <p className="text-xs text-emerald-100 font-black uppercase tracking-widest mb-1 relative z-10">Чистая прибыль</p>
                                        <p className="text-4xl font-black tracking-tight relative z-10">{netIncome} <span className="text-2xl opacity-80">₽</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                                        <h3 className="text-xl font-black tracking-tight text-stone-800 mb-6 flex items-center gap-2">Расчет зарплат</h3>
                                        <div className="space-y-3">
                                            {Object.keys(employeeStats).length === 0 ? <p className="text-center text-stone-400 text-sm py-4 font-bold">Нет данных для расчета</p> : 
                                                Object.values(employeeStats).map((stat, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-4 rounded-2xl">
                                                        <div>
                                                            <span className="text-base font-bold text-stone-800 block">{stat.name}</span>
                                                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Оказано услуг: {stat.visits}</span>
                                                        </div>
                                                        <span className="text-lg font-black tracking-tight text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200">{stat.earned} ₽</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-stone-200 shadow-sm">
                                        <h3 className="text-xl font-black tracking-tight text-stone-800 mb-6 flex items-center gap-2">Топ-5 клиентов</h3>
                                        <div className="space-y-3">
                                            {clients.filter(c => c.total_revenue > 0).sort((a,b) => b.total_revenue - a.total_revenue).slice(0, 5).map((c, i) => (
                                                <div key={c.id} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-4 rounded-2xl hover:border-rose-200 hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white' : i === 1 ? 'bg-gradient-to-br from-stone-300 to-stone-400 text-white' : i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' : 'bg-white text-stone-400 border border-stone-200'}`}>{i + 1}</div>
                                                        <div>
                                                            <span className="text-sm font-bold text-stone-800 block">{c.name}</span>
                                                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Заказов: {c.visits_count}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black tracking-tight text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">{c.total_revenue} ₽</span>
                                                </div>
                                            ))}
                                            {clients.filter(c => c.total_revenue > 0).length === 0 && <p className="text-center text-stone-400 text-sm py-4 font-bold">Пока нет данных для топа</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🟣 ПРОФИЛЬ И НАСТРОЙКИ */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                                
                                <div className="bg-gradient-to-br from-rose-400 to-orange-300 p-8 rounded-[32px] shadow-xl shadow-rose-500/20 relative overflow-hidden text-white">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>
                                    <h2 className="text-xs font-black uppercase text-rose-100 mb-4 tracking-widest relative z-10">Ваша ссылка для записи</h2>
                                    <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                        <input readOnly value={clientLink} className="flex-1 bg-black/10 border border-white/20 rounded-2xl p-4 text-sm font-bold text-white outline-none truncate font-mono shadow-inner placeholder-white/50" />
                                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-white text-rose-500 px-8 py-4 rounded-2xl active:scale-[0.96] transition-all shadow-md font-black flex justify-center items-center gap-2 hover:bg-stone-50"><Copy className="w-5 h-5" /> Скопировать</button>
                                    </div>
                                    <p className="text-[11px] text-rose-100 mt-4 relative z-10 font-bold uppercase tracking-widest">Разместите эту ссылку в Instagram, WhatsApp, VK или Telegram.</p>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-stone-200 shadow-sm">
                                    <h2 className="text-xl font-black tracking-tight mb-8 text-stone-800">Настройки кабинета</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Название (для шапки сайта)</label>
                                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Например: Правовой центр / Автосервис V8" className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1">Короткая ссылка (Никнейм)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">.../book/</span>
                                                    <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="v8-auto" className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pr-4 pl-20 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6 lg:border-l lg:border-stone-100 lg:pl-12">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Сетка времени на сайте</label>
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
                                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Перерывы (Ежедневные)</label>
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

                                    {/* УМНОЕ РАСПИСАНИЕ ПО ДНЯМ */}
                                    <div className="pt-8 border-t border-stone-100">
                                        <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest mb-6"><Clock className="w-4 h-4 text-rose-400"/> Рабочие часы по дням недели</h3>
                                        <div className="space-y-4">
                                            {DAYS.map(day => {
                                                const config = weeklySettings[day.id] || { start: "09:00", end: "18:00", active: false };
                                                return (
                                                    <div key={day.id} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[24px] border transition-all ${config.active ? 'bg-rose-50/30 border-rose-100 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                                                            <button 
                                                                onClick={() => setWeeklySettings({...weeklySettings, [day.id]: {...config, active: !config.active}})}
                                                                className={`w-12 h-6 rounded-full transition-all relative ${config.active ? 'bg-rose-400' : 'bg-stone-300'}`}
                                                            >
                                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.active ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                            <div>
                                                                <p className="font-black text-stone-900 uppercase tracking-widest text-xs">{day.label}</p>
                                                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{config.active ? 'Рабочий день' : 'Выходной'}</p>
                                                            </div>
                                                        </div>

                                                        {config.active && (
                                                            <div className="flex items-center gap-3">
                                                                <input type="time" value={config.start} onChange={e => setWeeklySettings({...weeklySettings, [day.id]: {...config, start: e.target.value}})} className="bg-white border border-stone-200 rounded-xl p-2.5 text-sm font-black text-stone-900 shadow-sm outline-none focus:border-rose-400" />
                                                                <div className="w-2 h-0.5 bg-stone-300"></div>
                                                                <input type="time" value={config.end} onChange={e => setWeeklySettings({...weeklySettings, [day.id]: {...config, end: e.target.value}})} className="bg-white border border-stone-200 rounded-xl p-2.5 text-sm font-black text-stone-900 shadow-sm outline-none focus:border-rose-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* БЛОК ПОРТФОЛИО */}
                                    <div className="mt-8 pt-8 border-t border-stone-100">
                                        <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest mb-4"><Camera className="w-4 h-4 text-rose-400"/> Галерея работ / Примеров</h3>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-4">Эти фотографии будут видны всем клиентам на странице записи</p>
                                        
                                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                            {portfolioUrls.map((url, idx) => (
                                                <div key={idx} className="relative shrink-0 snap-center">
                                                    <img src={url} alt="Пример работы" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-[24px] shadow-sm border border-stone-200" />
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

                                    <div className="mt-10 pt-8 border-t border-stone-100 flex justify-end">
                                        <button onClick={handleSaveProfile} disabled={saving} className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-black">
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить настройки"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ================= МОДАЛКИ ================= */}

            {/* 1. СОЗДАНИЕ ТОВАРА НА СКЛАДЕ */}
            {showInvModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200">
                        <button onClick={() => setShowInvModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black mb-6 text-stone-900">Новый товар</h2>
                        <form onSubmit={handleAddInventory} className="space-y-4">
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Папка (Категория)</label>
                                <select value={invCategorySelect} onChange={e => setInvCategorySelect(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer">
                                    {existingInvCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="NEW">+ Создать новую папку</option>
                                </select>
                            </div>
                            {invCategorySelect === 'NEW' && (
                                <input value={invCategoryInput} onChange={e => setInvCategoryInput(e.target.value)} placeholder="Название новой папки..." className="w-full bg-white border border-rose-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 shadow-sm" />
                            )}

                            <div><label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Наименование *</label><input required value={invName} onChange={e => setInvName(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Артикул</label><input value={invSku} onChange={e => setInvSku(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400" /></div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Ед. изм.</label>
                                    <select value={invUnit} onChange={e => setInvUnit(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400 appearance-none">
                                        <option value="шт">Штуки (шт)</option><option value="мл">Миллилитры (мл)</option><option value="л">Литры (л)</option><option value="гр">Граммы (гр)</option>
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Остаток сейчас</label><input type="number" required value={invQty} onChange={e => setInvQty(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400" /></div>
                                <div><label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Мин. остаток</label><input type="number" required value={invCritical} onChange={e => setInvCritical(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Закупка (Себест-ть)</label><input type="number" required value={invCost} onChange={e => setInvCost(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400" /></div>
                                <div><label className="text-[10px] font-bold uppercase tracking-widest text-rose-500 ml-1">Розница (Для клиента)</label><input type="number" required value={invRetail} onChange={e => setInvRetail(e.target.value)} className="w-full mt-1 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-sm font-black text-rose-700 outline-none focus:border-rose-400" /></div>
                            </div>
                            <button type="submit" disabled={addingInv || (invCategorySelect === 'NEW' && !invCategoryInput)} className="w-full mt-4 bg-stone-900 text-white font-black py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50">{addingInv ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "Сохранить товар"}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. РЕДАКТИРОВАНИЕ УСЛУГИ */}
            {selectedService && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedService(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedService(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black mb-6 text-stone-900 leading-tight pr-10">{selectedService.name}</h2>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-stone-50 border border-stone-100 p-3 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-0.5">Категория</p><p className="text-sm font-black text-stone-800">{selectedService.category}</p></div>
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-0.5">Цена работы</p><p className="text-sm font-black text-emerald-700">{selectedService.price} ₽</p></div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1 mb-2 block">Иллюстрации услуги</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                    {selectedService.image_urls && selectedService.image_urls.map((url: string, idx: number) => (
                                        <div key={idx} className="relative shrink-0 snap-center">
                                            <img src={url} alt="Услуга" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-stone-200" />
                                            <button onClick={() => handleRemoveImage(selectedService.id, url, selectedService.image_urls)} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1.5 shadow-md border border-rose-100 hover:bg-rose-50"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    <label className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex flex-col items-center justify-center cursor-pointer transition-all">
                                        {uploadingImageId === selectedService.id ? <Loader2 className="w-5 h-5 animate-spin text-rose-400" /> : <Plus className="w-6 h-6 text-rose-400" />}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, selectedService.id, selectedService.image_urls || [])} />
                                    </label>
                                </div>
                            </div>

                            <button onClick={() => handleDeleteService(selectedService.id)} className="w-full bg-white text-rose-500 border border-rose-200 font-bold py-3.5 rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Удалить услугу</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. КАРТОЧКА КЛИЕНТА (CRM) */}
            {selectedClient && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100"><UserCircle className="w-8 h-8 text-rose-400" /></div>
                            <div><h2 className="text-xl font-black text-stone-800 leading-tight">{selectedClient.name}</h2><p className="text-sm font-bold text-stone-500 mt-0.5">{selectedClient.phone}</p></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Всего визитов</p><p className="text-2xl font-black tracking-tight text-stone-800">{selectedClient.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Выручка</p><p className="text-2xl font-black tracking-tight text-emerald-600">{selectedClient.total_revenue} ₽</p></div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5"/> Заметки (Детали заказов)</label>
                            <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Стучит подвеска, дело о наследстве..." className="w-full bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-400/30 text-stone-800 min-h-[120px] resize-none" />
                            <button onClick={handleSaveClientNote} disabled={savingNote} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">{savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить заметку"}</button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> История записей</label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {appointments.filter(a => a.client_phone === selectedClient.phone).reverse().map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <div><p className="text-xs font-bold text-stone-800">{format(new Date(app.start_time), "d MMMM yyyy", { locale: ru })}</p><p className="text-[10px] text-stone-500 font-bold mt-0.5">{app.service?.name}</p></div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{app.status === 'completed' ? 'Был' : 'Записан'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. РУЧНАЯ ЗАПИСЬ */}
            {showManualModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowManualModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black mb-8 text-stone-800 flex items-center gap-3"><UserPlus className="w-7 h-7 text-rose-500 bg-rose-50 p-1.5 rounded-xl"/> Новая запись</h2>
                        <form onSubmit={handleAddManualBooking} className="space-y-4">
                            <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Клиент / Задача *</label><input required value={manualName} onChange={e => setManualName(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                            <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Телефон</label><input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                            <div>
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Услуга *</label>
                                <select value={manualService} onChange={e => setManualService(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 appearance-none"><option value="">Свое время / Без услуги</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            </div>
                            {role === 'owner' && (
                                <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Специалист</label><select value={manualEmployee} onChange={e => setManualEmployee(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 appearance-none"><option value="">Выполняю я</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Дата *</label><input required type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                                <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Время *</label><input required type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                            </div>
                            <button type="submit" disabled={addingManual} className="w-full mt-4 bg-gradient-to-r from-rose-400 to-orange-400 text-white font-black py-4 rounded-xl active:scale-[0.98] transition-all shadow-lg flex justify-center">{addingManual ? <Loader2 className="w-6 h-6 animate-spin" /> : "Сохранить"}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. ДЕТАЛИ ЗАПИСИ (С РАСХОДНИКАМИ И УМНЫМ ВЫБОРОМ) */}
            {selectedApp && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setSelectedApp(null); setUsedMaterials([]); }}>
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setSelectedApp(null); setUsedMaterials([]); }} className="absolute top-6 right-6 text-stone-400 hover:text-stone-800 bg-stone-50 p-2.5 rounded-full"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-black mb-6 text-stone-800">Детали записи</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-stone-50 p-5 rounded-[24px] border border-stone-100 shadow-inner">
                                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Клиент / Задача</p>
                                <p className="text-2xl font-black tracking-tight text-stone-800">{selectedApp.client_name}</p>
                                <p className="text-sm font-bold text-rose-500 mt-1">{selectedApp.client_phone || "Без номера"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-y border-stone-100 py-5">
                                <div><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Время</p><p className="text-sm font-black text-rose-500 bg-rose-50 inline-block px-2 py-1 rounded-md">{format(new Date(selectedApp.start_time), "HH:mm")}</p></div>
                                <div><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1.5">Услуга</p><p className="text-sm font-bold text-stone-800">{selectedApp.service?.name || "Без услуги"}</p></div>
                            </div>

                            {/* БЛОК СПИСАНИЯ РАСХОДНИКОВ ПРИ ЗАВЕРШЕНИИ */}
                            {selectedApp.status === 'active' && inventory.length > 0 && (
                                <div className="bg-orange-50/50 p-4 rounded-[24px] border border-orange-100">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-orange-800 mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> Использованные материалы</h4>
                                    
                                    {usedMaterials.map((um, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <select value={um.id} onChange={(e) => { const newArr = [...usedMaterials]; newArr[idx].id = e.target.value; setUsedMaterials(newArr); }} className="flex-1 bg-white border border-orange-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 cursor-pointer">
                                                <option value="" disabled>Выбрать из папок...</option>
                                                {sortedInvCats.map(cat => (
                                                    <optgroup key={cat} label={`📂 ${cat}`}>
                                                        {groupedInventory[cat].map((i: any) => (
                                                            <option key={i.id} value={i.id}>{i.name} (Остаток: {i.quantity} {i.unit})</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                            <input type="number" min="0" step="0.1" value={um.qty} onChange={(e) => { const newArr = [...usedMaterials]; newArr[idx].qty = Number(e.target.value); setUsedMaterials(newArr); }} className="w-20 bg-white border border-orange-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 text-center" placeholder="Кол-во" />
                                            <button onClick={() => setUsedMaterials(usedMaterials.filter((_, i) => i !== idx))} className="p-2 text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50"><X className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                    
                                    <button onClick={() => setUsedMaterials([...usedMaterials, {id: '', qty: 1}])} className="w-full py-2.5 mt-1 border-2 border-dashed border-orange-200 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors">+ Добавить списание</button>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Завершить визит</button>}
                                
                                {selectedApp.client_phone && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <a href={`tel:+${getCleanPhone(selectedApp.client_phone)}`} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl text-center active:scale-95 flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> Звонок</a>
                                        <a href={getWhatsAppLink(selectedApp)} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl text-center active:scale-95 flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Написать</a>
                                    </div>
                                )}
                                <button onClick={() => handleDeleteRecord(selectedApp.id)} className={`w-full bg-white text-rose-500 font-bold py-3.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-1 border border-rose-200 hover:bg-rose-50 shadow-sm`}><Trash2 className="w-4 h-4" /> {selectedApp.status === 'completed' ? 'Удалить' : 'Отменить запись'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}