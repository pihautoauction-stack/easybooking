"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus,
    Loader2, Briefcase, CalendarDays, UserCircle, Phone, X, MessageCircle,
    RefreshCw, Users, Search, Ban, BarChart3, CheckCircle2, Clock, Coffee,
    UserPlus, Archive, Edit3, Camera, Calculator, ChevronLeft, ChevronRight, Package, Folder, FolderOpen, AlertTriangle, ListTree, History, Link as LinkIcon
} from "lucide-react";
import { format, startOfToday, addDays, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { completeAppointment, adjustInventoryStock } from "@/app/actions/inventory";

const formatPhoneInput = (value: string) => {
    let input = value.replace(/\D/g, '');
    if (!input) return '';
    if (input[0] === '7' || input[0] === '8') input = input.slice(1);
    let res = '+7';
    if (input.length > 0) res += ' (' + input.substring(0, 3);
    if (input.length >= 4) res += ') ' + input.substring(3, 6);
    if (input.length >= 7) res += '-' + input.substring(6, 8);
    if (input.length >= 9) res += '-' + input.substring(8, 10);
    return res;
};

import { toggleClientBlacklist, saveClientNote, updateClientTags } from "@/app/actions/clients";
import { addService, deleteService, saveServiceMaterials } from "@/app/actions/services";
import AppointmentsTab from "@/components/dashboard/AppointmentsTab";
import ServicesTab from "@/components/dashboard/ServicesTab";
import ClientsTab from "@/components/dashboard/ClientsTab";
import InventoryTab from "@/components/dashboard/InventoryTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import ProfileTab from "@/components/dashboard/ProfileTab";

const supabase = createClient();

type Tab = 'appointments' | 'services' | 'clients' | 'inventory' | 'analytics' | 'profile';
type ProfileTab = 'general' | 'schedule' | 'gallery' | 'team';

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
    const [profileTab, setProfileTab] = useState<ProfileTab>('general');
    const [journalView, setJournalView] = useState<'active' | 'archive'>('active');
    const [viewDate, setViewDate] = useState(startOfToday());

    // Профиль
    const [role, setRole] = useState("solo");
    const [businessName, setBusinessName] = useState("");
    const [username, setUsername] = useState("");
    const [newTagInput, setNewTagInput] = useState("");
    const [weeklySettings, setWeeklySettings] = useState<any>({});
    const [scheduleStep, setScheduleStep] = useState(30);
    const [breaks, setBreaks] = useState<{ start: string, end: string }[]>([]);
    const [newBreakStart, setNewBreakStart] = useState("13:00");
    const [newBreakEnd, setNewBreakEnd] = useState("14:00");
    const [socialLinks, setSocialLinks] = useState({ telegram: '', whatsapp: '', instagram: '', vk: '' }); // НОВОЕ: Соцсети
    const [disabledDays, setDisabledDays] = useState<number[]>([]);
    const [workStartTime, setWorkStartTime] = useState("09:00");
    const [workEndTime, setWorkEndTime] = useState("20:00");
    const [modulesConfig, setModulesConfig] = useState<{ services: boolean, clients: boolean, inventory: boolean, analytics: boolean }>({ services: true, clients: true, inventory: true, analytics: true });

    // Данные
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [clientFilterMode, setClientFilterMode] = useState<'all' | 'sleeping'>('all');
    const [employees, setEmployees] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [waitlistModal, setWaitlistModal] = useState<{ show: boolean, waitlistPeople: any[], cancelledApp: any | null }>({ show: false, waitlistPeople: [], cancelledApp: null });
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
    const [uploadingAppImageId, setUploadingAppImageId] = useState<string | null>(null);

    const [transactions, setTransactions] = useState<any[]>([]);

    const [saving, setSaving] = useState(false);
    const [savingPhotoNotes, setSavingPhotoNotes] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [serviceSearchQuery, setServiceSearchQuery] = useState("");
    const [activeServiceFilter, setActiveServiceFilter] = useState<string | null>(null);

    // Форма Услуги
    const [serviceCategorySelect, setServiceCategorySelect] = useState("Общие");
    const [serviceCategoryInput, setServiceCategoryInput] = useState("");
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newDuration, setNewDuration] = useState("60");
    const [newServiceEmpId, setNewServiceEmpId] = useState("");
    const [addingService, setAddingService] = useState(false);
    const [newServiceMaterials, setNewServiceMaterials] = useState<{ inventory_id: string, default_quantity: number }[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Редактирование услуги
    const [selectedService, setSelectedService] = useState<any>(null);

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

    const handleOpenApp = (app: any) => {
        if (!app) {
            setSelectedApp(null);
            setUsedMaterials([]);
            setSoldItems([]);
            return;
        }
        setSelectedApp(app);
        if (app.status === 'active' && app.service?.materials?.length > 0) {
            setUsedMaterials(app.service.materials.map((m: any) => ({
                id: m.inventory_id,
                qty: Number(m.default_quantity)
            })));
        } else {
            setUsedMaterials([]);
        }
    };

    // CRM
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientNote, setClientNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    // СКЛАД
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
    const [usedMaterials, setUsedMaterials] = useState<{ id: string, qty: number }[]>([]);
    const [soldItems, setSoldItems] = useState<{ id: string, qty: number }[]>([]);
    const [adjustInvModal, setAdjustInvModal] = useState<{ show: boolean, item: any, type: 'add' | 'deduct' }>({ show: false, item: null, type: 'add' });
    const [adjustInvAmount, setAdjustInvAmount] = useState("1");
    const [adjustInvLoading, setAdjustInvLoading] = useState(false);

    const DAYS = [
        { id: 1, label: "Пн" }, { id: 2, label: "Вт" }, { id: 3, label: "Ср" },
        { id: 4, label: "Чт" }, { id: 5, label: "Пт" }, { id: 6, label: "Сб" }, { id: 0, label: "Вс" },
    ];

    useEffect(() => {
        let isMounted = true;
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session) { if (isMounted) router.replace("/login"); return; }
                if (isMounted) { setUser(session.user); await loadData(session.user.id); }
            } catch (err) {
                console.error(err); if (isMounted) router.replace("/login");
            } finally { if (isMounted) setLoading(false); }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) router.replace("/login");
            else if (session?.user && !user) { setUser(session.user); loadData(session.user.id); }
        });
        return () => { isMounted = false; subscription.unsubscribe(); };
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
                setRole(p.role || "solo"); setBusinessName(p.business_name || ""); setUsername(p.username || "");
                setScheduleStep(p.schedule_step || 30);
                if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
                if (p.work_start_time) setWorkStartTime(p.work_start_time);
                if (p.work_end_time) setWorkEndTime(p.work_end_time);
                if (p.breaks) setBreaks(typeof p.breaks === 'string' ? JSON.parse(p.breaks) : p.breaks || []);
                if (p.portfolio_urls) setPortfolioUrls(typeof p.portfolio_urls === 'string' ? JSON.parse(p.portfolio_urls) : p.portfolio_urls);
                if (p.weekly_settings) setWeeklySettings(typeof p.weekly_settings === 'string' ? JSON.parse(p.weekly_settings) : p.weekly_settings);
                if (p.social_links) setSocialLinks(typeof p.social_links === 'string' ? JSON.parse(p.social_links) : p.social_links);
                if (p.modules_config) setModulesConfig(typeof p.modules_config === 'string' ? JSON.parse(p.modules_config) : p.modules_config);
            }

            const { data: s } = await supabase.from("services").select("*, employee:employees(name), materials:service_materials(inventory_id, default_quantity)").eq("user_id", userId).order('created_at');
            setServices(s || []);
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            setEmployees(e || []);
            const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", userId).order('name');
            setInventory(inv || []);
            const { data: tx } = await supabase.from("inventory_transactions").select("*, inventory(name, unit)").eq("user_id", userId).order('created_at', { ascending: false }).limit(50);
            setTransactions(tx || []);

            const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, employee_id, materials_cost, materials_retail, service:services(name, category, price, duration, materials:service_materials(inventory_id, default_quantity)), employee:employees(name)")
                .eq("master_id", userId).gte('start_time', ninetyDaysAgo.toISOString()).order('start_time', { ascending: true });
            setAppointments(a || []);
            const { data: c } = await supabase.from("clients").select("*").eq("master_id", userId).order('created_at', { ascending: false });
            setClients(c || []);
            const { data: wl } = await supabase.from("waitlist").select("*").eq("master_id", userId).eq("notified", false).order('created_at');
            setWaitlist(wl || []);
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
                weekly_settings: weeklySettings, social_links: socialLinks, modules_config: modulesConfig, updated_at: new Date(),
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

    const handleUploadPortfolioImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingPortfolio(true);
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

    const handleAddService = async () => {
        if (!newName || !newPrice || !newDuration) return;
        setAddingService(true);
        const finalCategory = serviceCategorySelect === 'NEW' ? serviceCategoryInput : serviceCategorySelect;
        const insertData: any = { user_id: user.id, name: newName, category: finalCategory || "Общие", price: Number(newPrice), duration: Number(newDuration), image_urls: [] };
        if (role === 'owner' && newServiceEmpId) insertData.employee_id = newServiceEmpId;
        const { data: insertedData, error } = await supabase.from("services").insert(insertData).select().single();
        if (!error && insertedData && newServiceMaterials.length > 0) {
            await saveServiceMaterials(insertedData.id, newServiceMaterials);
        }
        setNewName(""); setNewPrice(""); setNewDuration("60"); setNewServiceEmpId(""); setServiceCategoryInput(""); setNewServiceMaterials([]); await loadData(user.id); setAddingService(false);
    };

    const handleUpdateServiceMaterials = async (serviceId: string, materials: { inventory_id: string, default_quantity: number }[]) => {
        const result = await saveServiceMaterials(serviceId, materials);
        if (result.success) {
            if (selectedService && selectedService.id === serviceId) {
                setSelectedService({ ...selectedService, materials });
            }
            await loadData(user.id, true);
        } else {
            alert("Ошибка сохранения: " + result.error);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (confirm("Удалить эту услугу?")) { await supabase.from("services").delete().eq("id", id); setSelectedService(null); await loadData(user.id); }
    };

    const toggleCategory = (cat: string) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

    const existingServiceCategories = Array.from(new Set(services.map(s => s.category || 'Общие')));
    if (!existingServiceCategories.includes("Общие")) existingServiceCategories.unshift("Общие");
    const filteredServicesList = services.filter(s => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.category && s.category.toLowerCase().includes(serviceSearchQuery.toLowerCase())));
    const groupedServices = filteredServicesList.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Общие';
        if (!acc[cat]) acc[cat] = []; acc[cat].push(curr); return acc;
    }, {});

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
        } catch (err) { alert("Ошибка сохранения"); } finally { setAddingInv(false); }
    };

    const handleAdjustInventory = (item: any, type: 'add' | 'deduct') => {
        setAdjustInvModal({ show: true, item, type });
        setAdjustInvAmount("1");
    };

    const submitAdjustInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(adjustInvAmount);
        if (isNaN(amount) || amount <= 0) return alert("Неверное количество");

        setAdjustInvLoading(true);
        const result = await adjustInventoryStock(adjustInvModal.item.id, amount, adjustInvModal.type);
        setAdjustInvLoading(false);

        if (result.success) {
            setAdjustInvModal({ show: false, item: null, type: 'add' });
            await loadData(user.id, true);
        } else {
            alert("Ошибка: " + result.error);
        }
    };

    const handleDeleteInventory = async (id: string) => {
        if (confirm("Удалить позицию со склада?")) { await supabase.from("inventory").delete().eq("id", id); await loadData(user.id, true); }
    }

    const toggleInvCategory = (cat: string) => setExpandedInvCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    const existingInvCategories = Array.from(new Set(inventory.map(i => i.category || 'Расходники')));
    if (!existingInvCategories.includes("Расходники")) existingInvCategories.unshift("Расходники");

    const groupedInventory = inventory.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Расходники';
        if (!acc[cat]) acc[cat] = []; acc[cat].push(curr); return acc;
    }, {});

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ СПИСАНИЯ
    const handleCompleteRecord = async (app: any) => {
        if (!confirm("Завершить визит и списать материалы?")) return;

        const result = await completeAppointment(app.id, usedMaterials, soldItems);
        if (result.success) {
            setUsedMaterials([]);
            setSoldItems([]);
            setSelectedApp(null);
            setJournalView('archive');
            await loadData(user.id, true);
        } else {
            alert("Ошибка: " + result.error);
        }
    };

    const handleAddBreak = () => { if (newBreakStart && newBreakEnd) { setBreaks([...breaks, { start: newBreakStart, end: newBreakEnd }]); setNewBreakStart("13:00"); setNewBreakEnd("14:00"); } };
    const handleRemoveBreak = (index: number) => setBreaks(breaks.filter((_, i) => i !== index));

    const handleAddEmployee = async () => {
        if (!newEmpName) return; setAddingEmp(true);
        await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec, commission_rate: Number(newEmpCommission) || 50 });
        setNewEmpName(""); setNewEmpSpec(""); setNewEmpCommission("50"); await loadData(user.id); setAddingEmp(false);
    };
    const handleDeleteEmployee = async (id: string) => { if (confirm("Удалить сотрудника?")) { await supabase.from("employees").delete().eq("id", id); await loadData(user.id); } };

    const handleDeleteRecord = async (id: string) => {
        const app = appointments.find((a: any) => a.id === id);
        if (!confirm(app?.status === 'completed' ? "Точно удалить из архива?" : "Отменить эту запись?")) return;

        await supabase.from("appointments").delete().eq("id", id);
        await loadData(user.id);
        setSelectedApp(null);

        // Проверяем лист ожидания на день этой отмененной записи
        if (app && app.status === 'active') {
            const cancelledDate = new Date(app.start_time).toISOString().slice(0, 10);
            const waitlistForDay = waitlist.filter((w: any) => w.desired_date === cancelledDate);
            if (waitlistForDay.length > 0) {
                setWaitlistModal({ show: true, waitlistPeople: waitlistForDay, cancelledApp: app });
            }
        }
    };
    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(currentStatus ? "Разблокировать?" : "В ЧС?")) {
            setClients(clients.map(c => c.id === clientId ? { ...c, is_blacklisted: !currentStatus } : c));
            const result = await toggleClientBlacklist(clientId, currentStatus);
            if (result.success) await loadData(user.id, true);
            else alert("Ошибка: " + result.error);
        }
    };

    const handleUpdateTags = async (clientId: string, tags: string[]) => {
        setClients(clients.map(c => c.id === clientId ? { ...c, tags } : c));
        if (selectedClient && selectedClient.id === clientId) {
            setSelectedClient({ ...selectedClient, tags });
        }
        await updateClientTags(clientId, tags);
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingImageId(serviceId);
        try {
            const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const updatedUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId);
            if (selectedService && selectedService.id === serviceId) setSelectedService({ ...selectedService, image_urls: updatedUrls });
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingImageId(null); }
    };
    const handleRemoveImage = async (serviceId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото?")) return;
        const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('services').update({ image_urls: updatedUrls }).eq('id', serviceId);
        if (selectedService && selectedService.id === serviceId) setSelectedService({ ...selectedService, image_urls: updatedUrls });
        await loadData(user.id, true);
    };

    const handleUploadAppImage = async (e: React.ChangeEvent<HTMLInputElement>, appId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingAppImageId(appId);
        try {
            const filePath = `${user.id}/apps/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const updatedUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('appointments').update({ photos_before_after: updatedUrls }).eq('id', appId);
            if (selectedApp && selectedApp.id === appId) setSelectedApp({ ...selectedApp, photos_before_after: updatedUrls });
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingAppImageId(null); }
    };

    const handleRemoveAppImage = async (appId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото визита?")) return;
        const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('appointments').update({ photos_before_after: updatedUrls }).eq('id', appId);
        if (selectedApp && selectedApp.id === appId) setSelectedApp({ ...selectedApp, photos_before_after: updatedUrls });
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
        const result = await saveClientNote(selectedClient.id, clientNote);
        if (result.success) {
            setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, notes: clientNote } : c));
            setSelectedClient({ ...selectedClient, notes: clientNote });
        } else alert("Ошибка: " + result.error);
        setSavingNote(false);
    };

    const handleSavePhotoNotes = async (appId: string) => {
        if (!selectedApp) return; setSavingPhotoNotes(true);
        try {
            await supabase.from('appointments').update({ photo_notes: selectedApp.photo_notes }).eq('id', appId);
            await loadData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setSavingPhotoNotes(false); }
    };

    const clientLink = user && typeof window !== 'undefined' ? `${window.location.origin}/book/${username || user.id}` : "";

    const serviceFilteredAppointments = activeServiceFilter ? appointments.filter(a => a.service_id === activeServiceFilter) : appointments;
    const activeDailyApps = useMemo(() => serviceFilteredAppointments.filter(app => isSameDay(new Date(app.start_time), viewDate) && app.status === 'active'), [serviceFilteredAppointments, viewDate]);
    const archivedApps = serviceFilteredAppointments.filter(a => a.status === 'completed').reverse();
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.phone.includes(clientSearchQuery));
    const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

    let totalRevenue = 0; let totalPayroll = 0; let totalMaterialsCost = 0;
    const employeeStats: Record<string, { name: string, visits: number, earned: number }> = {};

    archivedApps.forEach(app => {
        const servicePrice = Number(app.service?.price || 0); const matRetail = Number(app.materials_retail || 0); const matCost = Number(app.materials_cost || 0);
        totalRevenue += (servicePrice + matRetail); totalMaterialsCost += matCost;
        if (app.employee_id) {
            const emp = employees.find(e => e.id === app.employee_id);
            const rate = emp?.commission_rate || 50; const empCut = (servicePrice * rate) / 100;
            totalPayroll += empCut;
            if (!employeeStats[app.employee_id]) employeeStats[app.employee_id] = { name: app.employee?.name || 'Специалист', visits: 0, earned: 0 };
            employeeStats[app.employee_id].visits += 1; employeeStats[app.employee_id].earned += empCut;
        }
    });

    const netIncome = totalRevenue - totalPayroll - totalMaterialsCost;
    const inventoryValue = inventory.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost_price)), 0);
    const totalInventoryUnits = inventory.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    let sortedInvCats: string[] = [];
    if (selectedApp) {
        const targetCat = selectedApp.service?.category || 'Общие';
        sortedInvCats = Object.keys(groupedInventory).sort((a, b) => {
            if (a === targetCat) return -1;
            if (b === targetCat) return 1; return a.localeCompare(b);
        });
    }

    const getWhatsAppLink = (app: any) => {
        if (!app.client_phone) return "#";
        const text = `Здравствуйте, ${app.client_name}! 🌸\n\nНапоминаю о вашей записи на ${app.service?.name ? `"${app.service.name}"` : "задачу/визит"}.\n\n🗓 Дата: ${format(new Date(app.start_time), "d MMMM", { locale: ru })}\n⏰ Время: ${format(new Date(app.start_time), "HH:mm")}\n\nЖдем вас!`;
        return `https://wa.me/${getCleanPhone(app.client_phone)}?text=${encodeURIComponent(text)}`;
    };

    const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

    if (loading) return (<div className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-rose-400" /></div>);

    return (
        <div className="flex h-[100dvh] bg-[#FAF9F6] text-stone-800 font-sans selection:bg-rose-200 antialiased overflow-hidden relative">

            {/* СБОКУ ДЛЯ ПК (SIDEBAR) */}
            <aside className="hidden md:flex w-72 bg-white border-r border-stone-200 flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
                <div className="p-6 flex items-center gap-3 border-b border-stone-100">
                    <img src="/logo.svg" alt="Nexio Logo" className="w-12 h-12 shrink-0 object-contain drop-shadow-sm" />
                    <div className="flex flex-col">
                        <h2 className="font-black text-stone-900 tracking-tight text-base leading-tight">Nexio</h2>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-tight mt-0.5">ERP System</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {NAV_ITEMS.filter(tab => {
                        if (tab.id === 'services') return modulesConfig.services;
                        if (tab.id === 'clients') return modulesConfig.clients;
                        if (tab.id === 'inventory') return modulesConfig.inventory;
                        if (tab.id === 'analytics') return modulesConfig.analytics;
                        return true;
                    }).map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id ? 'bg-rose-50 text-rose-600 shadow-sm border-l-4 border-rose-400' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 border-l-4 border-transparent'}`}>
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-rose-500' : 'text-stone-400'}`} />{tab.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-stone-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                            {isSyncing ? <RefreshCw className="w-3 h-3 text-stone-400 animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>}
                        </div>
                        <span className="text-xs font-bold text-stone-600 truncate">{businessName || "Профиль"}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 transition-all shadow-sm"><LogOut className="w-4 h-4" /> Выйти</button>
                </div>
            </aside>

            {/* ОСНОВНАЯ ОБЛАСТЬ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* ШАПКА ДЛЯ МОБИЛОК */}
                <header
                    className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200 px-5 pb-3.5 flex justify-between items-center transition-all"
                    style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
                >
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Nexio Logo" className="w-10 h-10 shrink-0 object-contain drop-shadow-sm" />
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-sm font-black tracking-tight text-stone-900">Управление</h1>
                                <div className="relative flex h-2 w-2 items-center justify-center">{isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-stone-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}</div>
                            </div>
                            <span className="text-[10px] text-stone-400 truncate max-w-[140px] font-bold leading-none">{businessName || "Профиль"}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-stone-400 hover:text-rose-500 p-2 bg-stone-50 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4" /></button>
                </header>

                {/* ШАПКА ДЛЯ ПК */}
                <header className="hidden md:flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-stone-200 px-8 py-5 z-10 shrink-0">
                    <h1 className="text-2xl font-black tracking-tight text-stone-900">{NAV_ITEMS.find(t => t.id === activeTab)?.label || 'Управление'}</h1>
                    <div className="flex items-center gap-4"><span className="text-xs font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-3 py-1.5 rounded-lg">{format(new Date(), "d MMMM, EEEE", { locale: ru })}</span></div>
                </header>

                <main
                    className="flex-1 overflow-y-auto p-4 md:p-8 md:pb-8"
                    style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
                >
                    <div className="max-w-6xl mx-auto space-y-6">

                        {/* 🟢 ЖУРНАЛ */}
                        {activeTab === 'appointments' && (
                            <AppointmentsTab
                                user={user} role={role} appointments={appointments} services={services} employees={employees}
                                journalView={journalView} setJournalView={setJournalView} selectedApp={selectedApp} setSelectedApp={handleOpenApp}
                                activeDailyApps={activeDailyApps} archivedApps={archivedApps} format={format} ru={ru}
                                handleCompleteRecord={handleCompleteRecord} handleDeleteRecord={handleDeleteRecord}
                                usedMaterials={usedMaterials} setUsedMaterials={setUsedMaterials}
                                soldItems={soldItems} setSoldItems={setSoldItems} inventory={inventory}
                                showManualModal={showManualModal} setShowManualModal={setShowManualModal}
                                setViewDate={setViewDate} viewDate={viewDate} addDays={addDays}
                                CalendarIcon={CalendarIcon} Archive={Archive} ChevronLeft={ChevronLeft} ChevronRight={ChevronRight} Plus={Plus} Briefcase={Briefcase}
                                getServiceColor={getServiceColor}
                                modulesConfig={modulesConfig}
                            />
                        )}

                        {activeTab === 'services' && modulesConfig.services && (
                            <ServicesTab
                                services={services} role={role} setSelectedService={setSelectedService} setAddingService={setAddingService}
                                handleDeleteService={handleDeleteService} handleUploadImage={handleUploadImage} handleRemoveImage={handleRemoveImage}
                                uploadingImageId={uploadingImageId} expandedCategories={expandedCategories} toggleCategory={toggleCategory}
                                CheckCircle2={CheckCircle2} Trash2={Trash2} Plus={Plus} X={X} Camera={Camera} Loader2={Loader2}
                                ChevronLeft={ChevronLeft} ChevronRight={ChevronRight} Search={Search} Folder={Folder} FolderOpen={FolderOpen} Package={Package}
                                selectedService={selectedService} addingService={addingService} newName={newName} setNewName={setNewName}
                                newPrice={newPrice} setNewPrice={setNewPrice} newDuration={newDuration} setNewDuration={setNewDuration}
                                serviceCategorySelect={serviceCategorySelect} setServiceCategorySelect={setServiceCategorySelect}
                                serviceCategoryInput={serviceCategoryInput} setServiceCategoryInput={setServiceCategoryInput}
                                newServiceEmpId={newServiceEmpId} setNewServiceEmpId={setNewServiceEmpId} handleAddService={handleAddService}
                                employees={employees} existingServiceCategories={existingServiceCategories} serviceSearchQuery={serviceSearchQuery}
                                setServiceSearchQuery={setServiceSearchQuery} groupedServices={groupedServices}
                                inventory={inventory}
                                newServiceMaterials={newServiceMaterials} setNewServiceMaterials={setNewServiceMaterials}
                            />
                        )}

                        {activeTab === 'inventory' && modulesConfig.inventory && (
                            <InventoryTab
                                inventory={inventory} user={user} role={role} handleAddInventory={handleAddInventory}
                                handleAdjustInventory={handleAdjustInventory} handleDeleteInventory={handleDeleteInventory}
                                Package={Package} Plus={Plus} Archive={Archive} History={History} AlertTriangle={AlertTriangle} Edit3={Edit3} Trash2={Trash2}
                                newInvName={invName} setNewInvName={setInvName} newInvUnit={invUnit} setNewInvUnit={setInvUnit}
                                newInvCost={invCost} setNewInvCost={setInvCost} newInvRetail={invRetail} setNewInvRetail={setInvRetail}
                                newInvCategory={invCategoryInput} setNewInvCategory={setInvCategoryInput} addingInventory={addingInv} setAddingInventory={setAddingInv}
                                inventoryTransactions={transactions} invView={invView} setInvView={setInvView} setShowInvModal={setShowInvModal}
                                totalInventoryUnits={totalInventoryUnits} inventoryValue={inventoryValue} groupedInventory={groupedInventory}
                                toggleInvCategory={toggleInvCategory} expandedInvCategories={expandedInvCategories} Folder={Folder} FolderOpen={FolderOpen}
                                transactions={transactions} format={format} ru={ru}
                            />
                        )}

                        {activeTab === 'clients' && modulesConfig.clients && (
                            <ClientsTab
                                filteredClients={filteredClients} clientSearchQuery={clientSearchQuery} setClientSearchQuery={setClientSearchQuery}
                                Search={Search} UserCircle={UserCircle} setSelectedClient={setSelectedClient} selectedClient={selectedClient}
                                Ban={Ban} Trash2={Trash2} clientNote={clientNote} setClientNote={setClientNote} saveClientNote={handleSaveClientNote}
                                handleToggleBlacklist={handleToggleBlacklist} savingNote={savingNote} getCleanPhone={getCleanPhone}
                                Phone={Phone} MessageCircle={MessageCircle} user={user} Edit3={Edit3} handleUpdateTags={handleUpdateTags}
                                clientFilterMode={clientFilterMode} setClientFilterMode={setClientFilterMode} appointments={appointments}
                            />
                        )}

                        {activeTab === 'analytics' && modulesConfig.analytics && (
                            <AnalyticsTab
                                clients={clients} archivedApps={archivedApps} totalRevenue={totalRevenue} totalPayroll={totalPayroll}
                                totalMaterialsCost={totalMaterialsCost} employeeStats={employeeStats} BarChart3={BarChart3} role={role} Calculator={Calculator}
                                netIncome={netIncome} appointments={appointments} services={services}
                            />
                        )}

                        {activeTab === 'profile' && (
                            <ProfileTab
                                profileTab={profileTab} setProfileTab={setProfileTab} username={username} user={user} role={role}
                                employees={employees} handleAddEmployee={handleAddEmployee} handleDeleteEmployee={handleDeleteEmployee}
                                portfolioUrls={portfolioUrls} handleUploadPortfolioImage={handleUploadPortfolioImage} handleRemovePortfolioImage={handleRemovePortfolioImage}
                                uploadingPortfolio={uploadingPortfolio} clientLink={clientLink} breaks={breaks} setBreaks={setBreaks}
                                newBreakStart={newBreakStart} setNewBreakStart={setNewBreakStart} newBreakEnd={newBreakEnd} setNewBreakEnd={setNewBreakEnd}
                                handleAddBreak={handleAddBreak} Clock={Clock} Camera={Camera} Users={Users} LinkIcon={LinkIcon} Copy={Copy} Loader2={Loader2} Trash2={Trash2} Plus={Plus} X={X} Coffee={Coffee}
                                businessName={businessName} setBusinessName={setBusinessName} setUsername={setUsername} socialLinks={socialLinks} setSocialLinks={setSocialLinks}
                                scheduleStep={scheduleStep} setScheduleStep={setScheduleStep} handleRemoveBreak={handleRemoveBreak}
                                weeklySettings={weeklySettings} setWeeklySettings={setWeeklySettings} DAYS={DAYS} handleSaveProfile={handleSaveProfile} saving={saving}
                                newEmpName={newEmpName} setNewEmpName={setNewEmpName} newEmpSpec={newEmpSpec} setNewEmpSpec={setNewEmpSpec}
                                newEmpCommission={newEmpCommission} setNewEmpCommission={setNewEmpCommission} addingEmp={addingEmp}
                                modulesConfig={modulesConfig} setModulesConfig={setModulesConfig}
                            />
                        )}

                    </div>
                </main>

                {/* НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ (ДЛЯ МОБИЛОК) */}
                <nav
                    className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-200 z-40 px-2 pt-2 flex justify-around items-center shadow-[0_-4px_24px_rgba(0,0,0,0.02)]"
                    style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
                >
                    {NAV_ITEMS.filter(tab => {
                        if (tab.id === 'services') return modulesConfig.services;
                        if (tab.id === 'clients') return modulesConfig.clients;
                        if (tab.id === 'inventory') return modulesConfig.inventory;
                        if (tab.id === 'analytics') return modulesConfig.analytics;
                        return true;
                    }).map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className="flex flex-col items-center justify-center p-2 min-w-[3.5rem] transition-all"
                            >
                                <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${isActive ? 'bg-rose-50 scale-110' : 'bg-transparent hover:bg-stone-50'}`}>
                                    <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-rose-500' : 'text-stone-400'}`} />
                                </div>
                                <span className={`text-[9px] font-black mt-1 transition-colors ${isActive ? 'text-rose-600' : 'text-stone-400'}`}>{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>

            </div>

            {/* ================= МОДАЛКИ ================= */}

            {/* 1. СОЗДАНИЕ ТОВАРА НА СКЛАДЕ */}
            {showInvModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl relative border border-stone-200 overflow-y-auto max-h-[90vh]">
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
                            <button type="submit" disabled={addingInv || (invCategorySelect === 'NEW' && !invCategoryInput)} className="w-full mt-4 bg-stone-900 text-white font-black py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50">{addingInv ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Сохранить товар"}</button>
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

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1 mb-2 block flex items-center gap-2"><Package className="w-3 h-3" /> Техкарта (Расходники)</label>
                                {inventory && inventory.length > 0 ? (
                                    <div className="space-y-2">
                                        <select
                                            onChange={async (e) => {
                                                const invId = e.target.value; e.target.value = ""; if (!invId) return;
                                                const currentMaterials = selectedService.materials || [];
                                                if (currentMaterials.find((m: any) => m.inventory_id === invId)) return;
                                                await handleUpdateServiceMaterials(selectedService.id, [...currentMaterials, { inventory_id: invId, default_quantity: 1 }]);
                                            }}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 appearance-none cursor-pointer"
                                            value=""
                                        >
                                            <option value="" disabled>+ Добавить материал...</option>
                                            {inventory.map((item: any) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                                        </select>

                                        {(selectedService.materials || []).length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {selectedService.materials.map((mat: any) => {
                                                    const invItem = inventory.find((i: any) => i.id === mat.inventory_id);
                                                    if (!invItem) return null;
                                                    return (
                                                        <div key={mat.inventory_id} className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100 justify-between">
                                                            <span className="text-xs font-bold text-stone-700 truncate">{invItem.name}</span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <input
                                                                    type="number" min="0.1" step="any"
                                                                    value={mat.default_quantity}
                                                                    onBlur={async (e) => {
                                                                        const qty = Number(e.target.value);
                                                                        if (qty > 0 && qty !== mat.default_quantity) {
                                                                            const updated = selectedService.materials.map((m: any) => m.inventory_id === mat.inventory_id ? { ...m, default_quantity: qty } : m);
                                                                            await handleUpdateServiceMaterials(selectedService.id, updated);
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        // Optimistic local update for input typing
                                                                        const updated = selectedService.materials.map((m: any) => m.inventory_id === mat.inventory_id ? { ...m, default_quantity: Number(e.target.value) } : m);
                                                                        setSelectedService({ ...selectedService, materials: updated });
                                                                    }}
                                                                    className="w-16 bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-center font-bold outline-none"
                                                                />
                                                                <span className="text-[10px] text-stone-500 font-bold w-4">{invItem.unit}</span>
                                                                <button onClick={() => {
                                                                    const updated = selectedService.materials.filter((m: any) => m.inventory_id !== mat.inventory_id);
                                                                    handleUpdateServiceMaterials(selectedService.id, updated);
                                                                }} className="p-1 hover:bg-white rounded-md text-stone-400 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-stone-400 font-bold bg-stone-50 p-3 rounded-xl border border-stone-100 italic">Склад пуст. Добавьте материалы.</p>
                                )}
                            </div>

                            <button onClick={() => handleDeleteService(selectedService.id)} className="w-full bg-white text-rose-500 border border-rose-200 font-bold py-3.5 rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Удалить услугу</button>
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
                            <div>
                                <h2 className="text-xl font-black text-stone-800 leading-tight">{selectedClient.name}</h2>
                                <p className="text-sm font-bold text-stone-500 mt-0.5">{selectedClient.phone}</p>
                            </div>
                        </div>

                        {/* УПРАВЛЕНИЕ ТЕГАМИ */}
                        <div className="mb-6 space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1">Теги клиента</label>

                            <div className="flex flex-wrap gap-2">
                                {selectedClient.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] uppercase tracking-widest font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                        {tag}
                                        <button onClick={() => {
                                            const newTags = selectedClient.tags.filter((_: any, i: number) => i !== idx);
                                            handleUpdateTags(selectedClient.id, newTags);
                                        }} className="hover:text-rose-800"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!newTagInput.trim()) return;
                                const currentTags = selectedClient.tags || [];
                                if (!currentTags.includes(newTagInput.trim().toUpperCase())) {
                                    handleUpdateTags(selectedClient.id, [...currentTags, newTagInput.trim().toUpperCase()]);
                                }
                                setNewTagInput("");
                            }} className="flex gap-2">
                                <input
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    placeholder="Новый тег (напр. VIP)"
                                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800"
                                />
                                <button type="submit" disabled={!newTagInput.trim()} className="bg-stone-900 text-white font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-50">Добавить</button>
                            </form>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl"><p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Всего визитов</p><p className="text-2xl font-black tracking-tight text-stone-800">{selectedClient.visits_count}</p></div>
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Выручка</p><p className="text-2xl font-black tracking-tight text-emerald-600">{selectedClient.total_revenue} ₽</p></div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Заметки (Детали заказов)</label>
                            <textarea value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Детали работы, пожелания клиента..." className="w-full bg-orange-50/50 border border-orange-200/60 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-400/30 text-stone-800 min-h-[120px] resize-none" />
                            <button onClick={handleSaveClientNote} disabled={savingNote} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50">{savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить заметку"}</button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> История записей</label>
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
                        <h2 className="text-2xl font-black mb-8 text-stone-800 flex items-center gap-3"><UserPlus className="w-7 h-7 text-rose-500 bg-rose-50 p-1.5 rounded-xl" /> Новая запись</h2>
                        <form onSubmit={handleAddManualBooking} className="space-y-4">
                            <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Клиент / Задача *</label><input required value={manualName} onChange={e => setManualName(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                            <div>
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Телефон</label>
                                <input
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(formatPhoneInput(e.target.value))}
                                    className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800"
                                    placeholder="+7 (999) 000-00-00"
                                    type="tel"
                                />
                            </div>
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

            {/* 5. ДЕТАЛИ ЗАПИСИ (ИСПРАВЛЕНО СПИСАНИЕ СКЛАДА) */}
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

                            {selectedApp.status === 'active' && inventory.length > 0 && modulesConfig.inventory !== false && (
                                <>
                                    {/* БЛОК 1: РАСХОДНИКИ (Идут в себестоимость) */}
                                    <div className="bg-orange-50/50 p-4 rounded-[24px] border border-orange-100">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-orange-800 mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Расходники на услугу</h4>

                                        {usedMaterials.map((um, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                                <select value={um.id} onChange={(e) => { const newArr = [...usedMaterials]; newArr[idx].id = e.target.value; setUsedMaterials(newArr); }} className="flex-1 bg-white border border-orange-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 cursor-pointer w-0">
                                                    <option value="" disabled>Выбрать со склада...</option>
                                                    {sortedInvCats.map(cat => (
                                                        <optgroup key={cat} label={`📂 ${cat}`}>
                                                            {groupedInventory[cat].map((i: any) => (
                                                                <option key={i.id} value={i.id}>{i.name} (Остаток: {i.quantity} {i.unit})</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                <input type="number" min="0" step="0.1" value={um.qty} onChange={(e) => { const newArr = [...usedMaterials]; newArr[idx].qty = Number(e.target.value); setUsedMaterials(newArr); }} className="w-20 min-w-[80px] shrink-0 bg-white border border-orange-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 text-center" placeholder="Кол-во" />
                                                <button onClick={() => setUsedMaterials(usedMaterials.filter((_, i) => i !== idx))} className="p-2 text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50 shrink-0"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setUsedMaterials([...usedMaterials, { id: '', qty: 1 }])} className="w-full py-2.5 mt-1 border-2 border-dashed border-orange-200 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors">+ Добавить списание</button>
                                    </div>

                                    {/* БЛОК 2: ПРОДАЖИ (Ритейл - идут в себестоимость и в выручку) */}
                                    <div className="bg-emerald-50/50 p-4 rounded-[24px] border border-emerald-100">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-800 mb-3 flex items-center gap-1.5 cursor-help" title="Эти товары добавят стоимость к чеку клиента и спишутся со склада">
                                            🛍️ Продажа товаров (Ритейл)
                                        </h4>

                                        {soldItems.map((si, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                                <select value={si.id} onChange={(e) => { const newArr = [...soldItems]; newArr[idx].id = e.target.value; setSoldItems(newArr); }} className="flex-1 bg-white border border-emerald-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 cursor-pointer w-0">
                                                    <option value="" disabled>Что продаем?</option>
                                                    {sortedInvCats.map(cat => (
                                                        <optgroup key={cat} label={`📂 ${cat}`}>
                                                            {groupedInventory[cat].map((i: any) => (
                                                                <option key={i.id} value={i.id}>{i.name} ({i.retail_price || i.cost_price} ₽)</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                <input type="number" min="0" step="1" value={si.qty} onChange={(e) => { const newArr = [...soldItems]; newArr[idx].qty = Number(e.target.value); setSoldItems(newArr); }} className="w-20 min-w-[80px] shrink-0 bg-white border border-emerald-200 rounded-xl p-2 text-sm font-bold outline-none text-stone-800 text-center" placeholder="Кол-во" />
                                                <button onClick={() => setSoldItems(soldItems.filter((_, i) => i !== idx))} className="p-2 text-rose-500 bg-white border border-rose-100 rounded-xl hover:bg-rose-50 shrink-0"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}

                                        <button onClick={() => setSoldItems([...soldItems, { id: '', qty: 1 }])} className="w-full py-2.5 mt-1 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors">+ Добавить продажу</button>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 ml-1 mb-2 block flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Фото До / После</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                    {selectedApp.photos_before_after && selectedApp.photos_before_after.map((url: string, idx: number) => (
                                        <div key={idx} className="relative shrink-0 snap-center">
                                            <img src={url} alt="Visit Photo" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-stone-200" />
                                            <button onClick={() => handleRemoveAppImage(selectedApp.id, url, selectedApp.photos_before_after)} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1.5 shadow-md border border-rose-100 hover:bg-rose-50"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    <label className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center cursor-pointer transition-all">
                                        {uploadingAppImageId === selectedApp.id ? <Loader2 className="w-5 h-5 animate-spin text-stone-400" /> : <Plus className="w-6 h-6 text-stone-400" />}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadAppImage(e, selectedApp.id, selectedApp.photos_before_after || [])} />
                                    </label>
                                </div>
                                <div className="mt-3">
                                    <textarea
                                        value={selectedApp.photo_notes || ""}
                                        onChange={e => setSelectedApp({ ...selectedApp, photo_notes: e.target.value })}
                                        placeholder="Описание результата, формулы окрашивания..."
                                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-400/30 text-stone-800 min-h-[80px] resize-none"
                                    />
                                    <button
                                        onClick={() => handleSavePhotoNotes(selectedApp.id)}
                                        disabled={savingPhotoNotes}
                                        className="w-full mt-2 bg-stone-200 text-stone-700 font-bold py-2 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-stone-300 disabled:opacity-50 text-xs"
                                    >
                                        {savingPhotoNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : "Сохранить описание"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                {selectedApp.status !== 'completed' && <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Завершить визит</button>}

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

            {/* МОДАЛКА: Умный лист ожидания */}
            {waitlistModal.show && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setWaitlistModal({ show: false, waitlistPeople: [], cancelledApp: null })}>
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl">⏰</div>
                            <div>
                                <h3 className="text-lg font-black text-stone-900 tracking-tight">Лист ожидания</h3>
                                <p className="text-xs text-stone-500 font-medium">На этот день есть ожидающие клиенты</p>
                            </div>
                        </div>

                        {waitlistModal.cancelledApp && (
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-4">
                                <p className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1">Отменена запись</p>
                                <p className="text-sm font-black text-stone-800">{waitlistModal.cancelledApp.client_name} — {format(new Date(waitlistModal.cancelledApp.start_time), 'HH:mm, d MMMM', { locale: ru })}</p>
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            {waitlistModal.waitlistPeople.map((person: any) => (
                                <div key={person.id} className="flex items-center justify-between bg-stone-50 border border-stone-200 p-4 rounded-2xl">
                                    <div>
                                        <p className="text-sm font-bold text-stone-800">{person.client_name}</p>
                                        <p className="text-xs text-stone-500 font-medium">{person.client_phone}</p>
                                    </div>
                                    <a
                                        href={`https://wa.me/${person.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Здравствуйте, ${person.client_name}! 🎉 Освободилось окно на ${waitlistModal.cancelledApp ? format(new Date(waitlistModal.cancelledApp.start_time), 'HH:mm, d MMMM', { locale: ru }) : 'ближайшее время'}. Хотите забрать? Записывайтесь: ${typeof window !== 'undefined' ? window.location.origin : ''}/book/${username || user?.id}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={async () => {
                                            await supabase.from('waitlist').update({ notified: true }).eq('id', person.id);
                                        }}
                                        className="bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-emerald-600"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" /> Написать
                                    </a>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setWaitlistModal({ show: false, waitlistPeople: [], cancelledApp: null })} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black active:scale-95 transition-all">Закрыть</button>
                    </div>
                </div>
            )}
            {/* МОДАЛКА: ИЗМЕНЕНИЕ ОСТАТКОВ СКЛАДА */}
            {adjustInvModal.show && adjustInvModal.item && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAdjustInvModal({ show: false, item: null, type: 'add' })}>
                    <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${adjustInvModal.type === 'add' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                {adjustInvModal.type === 'add' ? <Plus className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-stone-900 tracking-tight">{adjustInvModal.type === 'add' ? 'Оприходование' : 'Списание'}</h3>
                                <p className="text-xs text-stone-500 font-medium">Складской учет</p>
                            </div>
                        </div>

                        <div className="bg-stone-50 border border-stone-100 p-4 rounded-2xl mb-6">
                            <p className="font-bold text-stone-800 line-clamp-2">{adjustInvModal.item.name}</p>
                            <p className="text-xs text-stone-500 mt-1">Текущий остаток: <span className="font-black text-stone-700">{adjustInvModal.item.quantity} {adjustInvModal.item.unit}</span></p>
                        </div>

                        <form onSubmit={submitAdjustInventory} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1 block">Количество ({adjustInvModal.item.unit}) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={adjustInvAmount}
                                    onChange={e => setAdjustInvAmount(e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-xl p-4 text-xl font-black text-center outline-none focus:border-stone-400 text-stone-800 focus:ring-4 focus:ring-stone-100 transition-all"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={adjustInvLoading}
                                className={`w-full text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${adjustInvModal.type === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                {adjustInvLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Подтвердить'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustInvModal({ show: false, item: null, type: 'add' })}
                                className="w-full bg-transparent text-stone-400 py-3 rounded-2xl font-bold text-sm hover:bg-stone-50 hover:text-stone-600 active:scale-95 transition-all"
                            >
                                Отмена
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}