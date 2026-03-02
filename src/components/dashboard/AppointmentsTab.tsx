import {
    CalendarIcon, Archive, ChevronLeft, ChevronRight, Plus, Briefcase,
    X, Phone, MessageCircle, CheckCircle2, Trash2, Camera, Loader2, UserPlus, Package
} from "lucide-react";
import { useAppointmentsStore } from "@/store/useAppointmentsStore";
import { useServicesStore } from "@/store/useServicesStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useClientsStore } from "@/store/useClientsStore";
import { useAppStore } from "@/store/useAppStore";
import { useState, useMemo } from "react";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { completeAppointment } from "@/app/actions/inventory";
import { createClient } from "@/lib/supabase/client";
import { useAppActions } from "@/store/actions";

const supabase = createClient();

const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

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

export default function AppointmentsTab() {
    const { appointments, waitlist } = useAppointmentsStore();
    const { services } = useServicesStore();
    const { user, modulesConfig, employees, role, username } = useProfileStore();
    const { inventory } = useInventoryStore();
    const { fetchAllData } = useAppActions();

    const [journalView, setJournalView] = useState<'active' | 'archive'>('active');
    const [viewDate, setViewDate] = useState(startOfToday());

    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [showManualModal, setShowManualModal] = useState(false);

    // Manual App State
    const [manualName, setManualName] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualService, setManualService] = useState("");
    const [manualEmployee, setManualEmployee] = useState("");
    const [manualDate, setManualDate] = useState(format(viewDate, 'yyyy-MM-dd'));
    const [manualTime, setManualTime] = useState("12:00");
    const [addingManual, setAddingManual] = useState(false);

    // Selected App State
    const [usedMaterials, setUsedMaterials] = useState<{ id: string, qty: number }[]>([]);
    const [soldItems, setSoldItems] = useState<{ id: string, qty: number }[]>([]);
    const [uploadingAppImageId, setUploadingAppImageId] = useState<string | null>(null);
    const [savingPhotoNotes, setSavingPhotoNotes] = useState(false);

    // Waitlist State
    const [waitlistModal, setWaitlistModal] = useState<{ show: boolean, waitlistPeople: any[], cancelledApp: any | null }>({ show: false, waitlistPeople: [], cancelledApp: null });

    const activeDailyApps = appointments
        .filter(a => a.status === 'active')
        .filter(a => isSameDay(new Date(a.start_time), viewDate))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const archivedApps = appointments
        .filter(a => a.status === 'completed' || a.status === 'cancelled')
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const groupedInventory = inventory.reduce((acc: Record<string, any[]>, curr: any) => {
        const cat = curr.category || 'Расходники';
        if (!acc[cat]) acc[cat] = []; acc[cat].push(curr); return acc;
    }, {});

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

    const handleAddManualBooking = async (e: React.FormEvent) => {
        e.preventDefault(); if (!manualName || !manualDate || !manualTime) return; setAddingManual(true);
        try {
            const startDateTime = new Date(`${manualDate}T${manualTime}:00`).toISOString();
            await supabase.from('appointments').insert({ master_id: user.id, service_id: manualService || null, employee_id: manualEmployee || null, client_name: manualName, client_phone: manualPhone, start_time: startDateTime, status: 'active' });
            setShowManualModal(false); setManualName(""); setManualPhone(""); setManualService(""); setViewDate(new Date(`${manualDate}T00:00:00`));
            if (user?.id) await fetchAllData(user.id, true);
            setJournalView('active');
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setAddingManual(false); }
    };

    const handleCompleteRecord = async (app: any) => {
        if (!confirm("Завершить визит и списать материалы?")) return;

        const result = await completeAppointment(app.id, usedMaterials, soldItems);
        if (result.success) {
            setUsedMaterials([]);
            setSoldItems([]);
            setSelectedApp(null);
            setJournalView('archive');
            if (user?.id) await fetchAllData(user.id, true);
        } else {
            alert("Ошибка: " + result.error);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        const app = appointments.find((a: any) => a.id === id);
        if (!confirm(app?.status === 'completed' ? "Точно удалить из архива?" : "Отменить эту запись?")) return;

        await supabase.from("appointments").delete().eq("id", id);
        if (user?.id) await fetchAllData(user.id, true);
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

    const handleUploadAppImage = async (e: React.ChangeEvent<HTMLInputElement>, appId: string, currentUrls: string[]) => {
        const file = e.target.files?.[0]; if (!file) return; setUploadingAppImageId(appId);
        try {
            const filePath = `${user.id}/apps/${Math.random()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('gallery').upload(filePath, file);
            const { data } = supabase.storage.from('gallery').getPublicUrl(filePath);
            const updatedUrls = [...(currentUrls || []), data.publicUrl];
            await supabase.from('appointments').update({ photos_before_after: updatedUrls }).eq('id', appId);
            if (selectedApp && selectedApp.id === appId) setSelectedApp({ ...selectedApp, photos_before_after: updatedUrls });
            if (user?.id) await fetchAllData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setUploadingAppImageId(null); }
    };

    const handleRemoveAppImage = async (appId: string, urlToRemove: string, currentUrls: string[]) => {
        if (!confirm("Удалить фото визита?")) return;
        const updatedUrls = currentUrls.filter(url => url !== urlToRemove);
        await supabase.from('appointments').update({ photos_before_after: updatedUrls }).eq('id', appId);
        if (selectedApp && selectedApp.id === appId) setSelectedApp({ ...selectedApp, photos_before_after: updatedUrls });
        if (user?.id) await fetchAllData(user.id, true);
    };

    const handleSavePhotoNotes = async (appId: string) => {
        if (!selectedApp) return; setSavingPhotoNotes(true);
        try {
            await supabase.from('appointments').update({ photo_notes: selectedApp.photo_notes }).eq('id', appId);
            if (user?.id) await fetchAllData(user.id, true);
        } catch (err: any) { alert("Ошибка: " + err.message); } finally { setSavingPhotoNotes(false); }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-stone-200/60 p-1 rounded-xl w-max shadow-inner">
                        <button onClick={() => setJournalView('active')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${journalView === 'active' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>На день</button>
                        <button onClick={() => setJournalView('archive')} className={`px-5 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${journalView === 'archive' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}><Archive className="w-4 h-4" /> Архив</button>
                    </div>
                    {journalView === 'active' && (
                        <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm gap-1">
                            <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-xs font-black px-3 text-stone-700 uppercase tracking-widest min-w-[110px] text-center">{format(viewDate, "d MMMM", { locale: ru })}</span>
                            <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowManualModal(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black">
                    <Plus className="w-4 h-4" /> Добавить задачу
                </button>
            </div>

            {journalView === 'archive' && (
                <>
                    {archivedApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-stone-50 border border-stone-200 rounded-[32px] border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                <Archive className="w-8 h-8 text-stone-300" />
                            </div>
                            <p className="text-stone-900 font-black text-lg mb-1">Архив пуст</p>
                            <p className="text-stone-500 font-bold text-sm text-center max-w-sm">Здесь будут отображаться завершенные записи.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {archivedApps.map((app: any) => (
                                <div key={app.id} onClick={() => handleOpenApp(app)} className="rounded-[24px] p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all bg-white border border-l-4 border-l-emerald-300 border-y-stone-100 border-r-stone-100 opacity-80 shadow-sm hover:border-emerald-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="font-black text-2xl tracking-tight text-stone-400">{format(new Date(app.start_time), "HH:mm")}</div>
                                        <div className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] text-stone-500 font-black uppercase tracking-widest">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                    </div>
                                    <h3 className="text-stone-800 text-base font-black tracking-tight">{app.client_name}</h3>
                                    <div className="flex justify-between items-center text-sm text-stone-500 pt-3 mt-2 border-t border-stone-50">
                                        <span className="truncate text-xs font-bold">{app.service?.name || "Без услуги"}</span>
                                        <span className="text-emerald-600 font-black text-xs">{(app.materials_cost && modulesConfig?.inventory !== false) ? `Мат: ${app.materials_cost}₽` : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {journalView === 'active' && (
                <>
                    {activeDailyApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-stone-50 border border-stone-200 rounded-[32px] border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                <CalendarIcon className="w-8 h-8 text-stone-300" />
                            </div>
                            <p className="text-stone-900 font-black text-lg mb-1">На этот день записей нет</p>
                            <p className="text-stone-500 font-bold text-sm text-center max-w-sm">Отдохните или добавьте новую задачу вручную.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeDailyApps.map((app: any) => {
                                const colorTheme = getServiceColor(app.service_id || app.employee_id || app.id);
                                const endTime = new Date(new Date(app.start_time).getTime() + (app.service?.duration || 60) * 60000);
                                return (
                                    <div key={app.id} onClick={() => handleOpenApp(app)} className={`bg-white rounded-[24px] p-5 border-y border-r border-stone-200 border-l-8 ${colorTheme.border} shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[160px]`}>
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
                    )
                    }
                </>
            )}

            {/* 4. РУЧНАЯ ЗАПИСЬ */}
            {
                showManualModal && (
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
                                    <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Специалист</label><select value={manualEmployee} onChange={e => setManualEmployee(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 appearance-none"><option value="">Выполняю я</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Дата *</label><input required type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800" /></div>
                                    <div>
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Время *</label>
                                        <input
                                            required
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="10:00"
                                            maxLength={5}
                                            value={manualTime}
                                            onChange={e => {
                                                let v = e.target.value.replace(/[^\d:]/g, '');
                                                if (v.length === 2 && !v.includes(':') && manualTime.length !== 3) v += ':';
                                                setManualTime(v);
                                            }}
                                            onBlur={() => {
                                                if (manualTime && manualTime.length < 5) {
                                                    let parts = manualTime.split(':');
                                                    let h = parts[0] || '00'; let m = parts[1] || '00';
                                                    if (h.length === 1) h = '0' + h;
                                                    if (m.length === 1) m = m + '0';
                                                    setManualTime(`${h}:${m}`);
                                                }
                                            }}
                                            className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 tracking-wider text-center"
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={addingManual} className="w-full mt-4 bg-gradient-to-r from-rose-400 to-orange-400 text-white font-black py-4 rounded-xl active:scale-[0.98] transition-all shadow-lg flex justify-center">{addingManual ? <Loader2 className="w-6 h-6 animate-spin" /> : "Сохранить"}</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* 5. ДЕТАЛИ ЗАПИСИ (ИСПРАВЛЕНО СПИСАНИЕ СКЛАДА) */}
            {
                selectedApp && (
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
                                        href={`https://wa.me/${person.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Здравствуйте, ${person.client_name}! 🎉 Освободилось окно на ${waitlistModal.cancelledApp ? format(new Date(waitlistModal.cancelledApp.start_time), 'HH:mm, d MMMM', { locale: ru }) : 'ближайшее время'}. Хотите забрать? Записывайтесь: ${typeof window !== 'undefined' ? window.location.origin : '/book/'}${user?.username || user?.id}`)}`}
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
        </div>
    );
}
