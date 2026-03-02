import { useState } from "react";
import { Clock, Camera, Users, LinkIcon, Copy, Loader2, Trash2, Plus, X, Coffee } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";

// Local days array
const DAYS = [
    { id: 'mon', label: 'Пн' },
    { id: 'tue', label: 'Вт' },
    { id: 'wed', label: 'Ср' },
    { id: 'thu', label: 'Чт' },
    { id: 'fri', label: 'Пт' },
    { id: 'sat', label: 'Сб' },
    { id: 'sun', label: 'Вс' }
];

import { createClient } from "@/lib/supabase/client";
import { useAppActions } from "@/store/actions";

const supabase = createClient();

export default function ProfileTab() {
    const {
        user, role,
        businessName, setBusinessName,
        username, setUsername,
        socialLinks, setSocialLinks,
        telegramChatId, setTelegramChatId,
        scheduleStep, setScheduleStep,
        breaks, setBreaks,
        newBreakStart, setNewBreakStart,
        newBreakEnd, setNewBreakEnd,
        weeklySettings, setWeeklySettings,
        portfolioUrls,
        employees,
        modulesConfig, setModulesConfig,
        clientLink
    } = useProfileStore();

    const { fetchAllData } = useAppActions();

    const [settingsMode, setSettingsMode] = useState<'profile' | 'app'>('profile');
    const [profileTab, setProfileTab] = useState<'general' | 'schedule' | 'gallery' | 'team' | 'promo'>('general');

    const [customLinkInput, setCustomLinkInput] = useState("");
    const [addingEmp, setAddingEmp] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpSpec, setNewEmpSpec] = useState("");
    const [newEmpCommission, setNewEmpCommission] = useState("");

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                business_name: businessName,
                username: username,
                schedule_step: scheduleStep,
                breaks: breaks ? JSON.stringify(breaks) : "[]",
                weekly_settings: weeklySettings ? JSON.stringify(weeklySettings) : "{}",
                social_links: socialLinks ? JSON.stringify(socialLinks) : "{}",
                telegram_chat_id: telegramChatId,
                modules_config: modulesConfig ? JSON.stringify(modulesConfig) : "{}"
            }).eq('id', user.id);
            if (error) throw error;
            alert("Настройки успешно сохранены!");
            await fetchAllData(user.id, true);
        } catch (err: any) {
            alert("Ошибка: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddBreak = () => {
        if (!newBreakStart || !newBreakEnd) return;
        setBreaks([...(breaks || []), { start: newBreakStart, end: newBreakEnd }]);
        setNewBreakStart('');
        setNewBreakEnd('');
    };

    const handleRemoveBreak = (idx: number) => {
        setBreaks((breaks || []).filter((_: any, i: number) => i !== idx));
    };

    const handleAddEmployee = async () => {
        if (!user || !newEmpName) return;
        setAddingEmp(true);
        const { error } = await supabase.from('employees').insert({
            salon_id: user.id,
            name: newEmpName,
            specialty: newEmpSpec,
            commission_rate: newEmpCommission ? Number(newEmpCommission) : 0
        });
        if (!error) {
            setNewEmpName("");
            setNewEmpSpec("");
            setNewEmpCommission("");
            await fetchAllData(user.id, true);
        }
        setAddingEmp(false);
    };

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm("Удалить сотрудника? Все его/её записи останутся.")) return;
        await supabase.from('employees').delete().eq('id', id);
        await fetchAllData(user.id, true);
    };

    const handleUploadPortfolioImage = async (e: any) => {
        if (!user || !e.target.files || e.target.files.length === 0) return;
        setUploadingPortfolio(true);
        const file = e.target.files[0];
        const ext = file.name.split('.').pop();
        const fname = `${user.id}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from("portfolio").upload(fname, file);
        if (!error && data) {
            const { data: { publicUrl } } = supabase.storage.from("portfolio").getPublicUrl(data.path);
            const newUrls = [...(portfolioUrls || []), publicUrl];
            await supabase.from("profiles").update({ portfolio_urls: JSON.stringify(newUrls) }).eq("id", user.id);
            alert("Фото успешно добавлено");
            await fetchAllData(user.id, true);
        }
        setUploadingPortfolio(false);
    };

    const handleRemovePortfolioImage = async (url: string) => {
        if (!confirm("Удалить фото?")) return;
        const newUrls = (portfolioUrls || []).filter((u: string) => u !== url);
        await supabase.from("profiles").update({ portfolio_urls: JSON.stringify(newUrls) }).eq("id", user.id);
        await fetchAllData(user.id, true);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[40px] border border-stone-200 shadow-sm flex flex-col h-full min-h-[60vh]">

                {/* ГЛОБАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ: ПРОФИЛЬ / ПРИЛОЖЕНИЕ (НАСТРОЙКИ МОДУЛЕЙ) */}
                <div className="flex bg-stone-100 p-1.5 rounded-[20px] mb-8 relative">
                    <button
                        onClick={() => setSettingsMode('profile')}
                        className={`flex-1 flex justify-center py-3.5 rounded-[14px] text-sm font-black transition-all z-10 ${settingsMode === 'profile' ? 'text-stone-900 shadow-sm bg-white' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        🧑 Настройки профиля
                    </button>
                    <button
                        onClick={() => setSettingsMode('app')}
                        className={`flex-1 flex justify-center py-3.5 rounded-[14px] text-sm font-black transition-all z-10 ${settingsMode === 'app' ? 'text-stone-900 shadow-sm bg-white' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        ⚙️ Функции приложения
                    </button>
                    {/* Анимационный ползунок */}
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[14px] shadow-sm transition-all duration-300 ${settingsMode === 'profile' ? 'left-1.5' : 'left-[50%]'}`}></div>
                </div>

                {settingsMode === 'profile' ? (
                    <>
                        <div className="flex overflow-x-auto gap-2 bg-stone-100 p-1.5 rounded-2xl mb-6 scrollbar-hide shrink-0">
                            <button onClick={() => setProfileTab('general')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${profileTab === 'general' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>Основное</button>
                            <button onClick={() => setProfileTab('schedule')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${profileTab === 'schedule' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}><Clock className="w-4 h-4" /> Расписание</button>
                            <button onClick={() => setProfileTab('gallery')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${profileTab === 'gallery' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}><Camera className="w-4 h-4" /> Галерея</button>
                            <button onClick={() => setProfileTab('team')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${profileTab === 'team' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}><Users className="w-4 h-4" /> Команда</button>
                            <button onClick={() => setProfileTab('promo')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${profileTab === 'promo' ? 'bg-white shadow-sm text-emerald-600' : 'text-stone-500 hover:text-emerald-600'}`}>🚀 Продвижение</button>
                        </div>

                        {profileTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                                <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-5 rounded-[24px] border border-rose-100 shadow-sm">
                                    <h2 className="text-[10px] font-black uppercase text-rose-500 mb-3 tracking-widest">Ваша ссылка для клиентов</h2>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input readOnly value={clientLink} className="flex-1 bg-white border border-rose-200 rounded-xl p-3.5 text-sm font-bold text-stone-800 outline-none truncate font-mono shadow-sm" />
                                        <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-rose-500 text-white px-6 py-3.5 rounded-xl active:scale-[0.96] transition-all shadow-md font-black flex justify-center items-center gap-2 hover:bg-rose-600"><Copy className="w-4 h-4" /> Копировать</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Название компании / Имя</label>
                                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Например: Моя компания / Василий Иванов" className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1">Короткая ссылка (Никнейм)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">.../book/</span>
                                            <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="my-company" className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pr-4 pl-20 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 transition-all" />
                                        </div>
                                    </div>
                                </div>

                                {/* НОВЫЙ БЛОК: СОЦИАЛЬНЫЕ СЕТИ */}
                                <div className="pt-6 border-t border-stone-100">
                                    <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest mb-4"><LinkIcon className="w-4 h-4 text-rose-400" /> Социальные сети для связи</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">WhatsApp</label>
                                            <input value={socialLinks.whatsapp} onChange={e => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })} placeholder="wa.me/79990000000" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Telegram</label>
                                            <input value={socialLinks.telegram} onChange={e => setSocialLinks({ ...socialLinks, telegram: e.target.value })} placeholder="t.me/username" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Instagram</label>
                                            <input value={socialLinks.instagram} onChange={e => setSocialLinks({ ...socialLinks, instagram: e.target.value })} placeholder="instagram.com/username" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">ВКонтакте (VK)</label>
                                            <input value={socialLinks.vk} onChange={e => setSocialLinks({ ...socialLinks, vk: e.target.value })} placeholder="vk.com/club" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 mt-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* НОВЫЙ БЛОК: УВЕДОМЛЕНИЯ В TELEGRAM */}
                                <div className="pt-6 border-t border-stone-100">
                                    <h3 className="text-sm font-black text-stone-800 flex items-center gap-2 uppercase tracking-widest mb-2">🔔 Уведомления о записях</h3>
                                    <p className="text-xs text-stone-500 font-bold mb-4">Настройте бота, чтобы мгновенно получать уведомления в Telegram о новых онлайн-записях.</p>
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4">
                                        <p className="text-xs font-bold text-blue-800 leading-relaxed">
                                            1. Напишите в Telegram специальному боту (например: <span className="font-black bg-white px-1.5 py-0.5 rounded shadow-sm text-stone-900 border border-stone-200">@userinfobot</span>)<br />
                                            2. Узнайте свой числовой <span className="font-black">ID</span> (он состоит только из цифр).<br />
                                            3. Введите его в поле ниже.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-stone-400 font-bold uppercase tracking-widest ml-1">Ваш Telegram Chat ID</label>
                                        <input value={telegramChatId || ""} onChange={e => setTelegramChatId(e.target.value)} placeholder="Например: 123456789" className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-rose-400 text-stone-800 mt-1 max-w-sm block" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {profileTab === 'schedule' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Шаг времени (Сетка)</label>
                                        <div className="relative">
                                            <select value={scheduleStep} onChange={e => setScheduleStep(Number(e.target.value))} className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 text-stone-800 appearance-none transition-all cursor-pointer hover:bg-stone-100">
                                                <option value={15}>Каждые 15 минут</option>
                                                <option value={30}>Каждые 30 минут</option>
                                                <option value={60}>Каждый час</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 font-bold">▼</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5"><Coffee className="w-3 h-3" /> Ежедневные перерывы</label>
                                        {breaks.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {breaks.map((br: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-black border border-stone-200">
                                                        <span>{br.start} - {br.end}</span>
                                                        <button onClick={() => handleRemoveBreak(idx)} className="text-rose-500 hover:bg-rose-100 p-0.5 rounded-md"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2 items-center bg-stone-50 p-2 rounded-2xl border border-stone-200">
                                            <input
                                                type="text" inputMode="numeric" maxLength={5} placeholder="12:00"
                                                value={newBreakStart}
                                                onChange={e => {
                                                    let v = e.target.value.replace(/[^\d:]/g, '');
                                                    if (v.length === 2 && !v.includes(':') && newBreakStart.length !== 3) v += ':';
                                                    setNewBreakStart(v);
                                                }}
                                                onBlur={() => {
                                                    if (newBreakStart && newBreakStart.length < 5) {
                                                        let parts = newBreakStart.split(':');
                                                        let h = parts[0] || '00'; let m = parts[1] || '00';
                                                        if (h.length === 1) h = '0' + h; if (m.length === 1) m = m + '0';
                                                        setNewBreakStart(`${h}:${m}`);
                                                    }
                                                }}
                                                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-rose-400 tracking-wider"
                                            />
                                            <span className="text-stone-400 font-black">-</span>
                                            <input
                                                type="text" inputMode="numeric" maxLength={5} placeholder="13:00"
                                                value={newBreakEnd}
                                                onChange={e => {
                                                    let v = e.target.value.replace(/[^\d:]/g, '');
                                                    if (v.length === 2 && !v.includes(':') && newBreakEnd.length !== 3) v += ':';
                                                    setNewBreakEnd(v);
                                                }}
                                                onBlur={() => {
                                                    if (newBreakEnd && newBreakEnd.length < 5) {
                                                        let parts = newBreakEnd.split(':');
                                                        let h = parts[0] || '00'; let m = parts[1] || '00';
                                                        if (h.length === 1) h = '0' + h; if (m.length === 1) m = m + '0';
                                                        setNewBreakEnd(`${h}:${m}`);
                                                    }
                                                }}
                                                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm font-bold outline-none text-center shadow-sm focus:border-rose-400 tracking-wider"
                                            />
                                            <button onClick={handleAddBreak} className="bg-stone-800 text-white p-3 rounded-xl font-bold active:scale-95 transition-all shadow-sm hover:bg-black shrink-0"><Plus className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>

                                {/* КОМПАКТНЫЙ ВАРИАНТ ГРАФИКА */}
                                <div className="space-y-4 border-t border-stone-100 pt-6">
                                    <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">График работы по дням</label>

                                    {/* Кружки дней недели */}
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map((day: any) => {
                                            const config = weeklySettings[day.id] || { start: "09:00", end: "18:00", active: false };
                                            return (
                                                <button
                                                    key={day.id}
                                                    onClick={() => setWeeklySettings({ ...weeklySettings, [day.id]: { ...config, active: !config.active } })}
                                                    className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center transition-all active:scale-95 ${config.active ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Настройка времени для активных дней */}
                                    {DAYS.filter((d: any) => weeklySettings[d.id]?.active).length > 0 && (
                                        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-4 gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                            {DAYS.filter((d: any) => weeklySettings[d.id]?.active).map((day: any) => {
                                                const config = weeklySettings[day.id];
                                                return (
                                                    <div key={`time-${day.id}`} className="bg-white p-3 rounded-2xl flex items-center justify-between border border-stone-100 shadow-sm">
                                                        <span className="font-black text-stone-800 text-xs px-2">{day.label}</span>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text" inputMode="numeric" maxLength={5} placeholder="09:00"
                                                                value={config.start}
                                                                onChange={e => {
                                                                    let v = e.target.value.replace(/[^\d:]/g, '');
                                                                    if (v.length === 2 && !v.includes(':') && config.start.length !== 3) v += ':';
                                                                    setWeeklySettings({ ...weeklySettings, [day.id]: { ...config, start: v } });
                                                                }}
                                                                onBlur={() => {
                                                                    if (config.start && config.start.length < 5) {
                                                                        let parts = config.start.split(':');
                                                                        let h = parts[0] || '00'; let m = parts[1] || '00';
                                                                        if (h.length === 1) h = '0' + h; if (m.length === 1) m = m + '0';
                                                                        setWeeklySettings({ ...weeklySettings, [day.id]: { ...config, start: `${h}:${m}` } });
                                                                    }
                                                                }}
                                                                className="bg-stone-50 border border-stone-100 rounded-lg py-1.5 px-1 text-xs font-black text-stone-700 outline-none focus:border-rose-300 text-center w-[54px] tracking-wider"
                                                            />
                                                            <span className="text-stone-300 font-black">-</span>
                                                            <input
                                                                type="text" inputMode="numeric" maxLength={5} placeholder="18:00"
                                                                value={config.end}
                                                                onChange={e => {
                                                                    let v = e.target.value.replace(/[^\d:]/g, '');
                                                                    if (v.length === 2 && !v.includes(':') && config.end.length !== 3) v += ':';
                                                                    setWeeklySettings({ ...weeklySettings, [day.id]: { ...config, end: v } });
                                                                }}
                                                                onBlur={() => {
                                                                    if (config.end && config.end.length < 5) {
                                                                        let parts = config.end.split(':');
                                                                        let h = parts[0] || '00'; let m = parts[1] || '00';
                                                                        if (h.length === 1) h = '0' + h; if (m.length === 1) m = m + '0';
                                                                        setWeeklySettings({ ...weeklySettings, [day.id]: { ...config, end: `${h}:${m}` } });
                                                                    }
                                                                }}
                                                                className="bg-stone-50 border border-stone-100 rounded-lg py-1.5 px-1 text-xs font-black text-stone-700 outline-none focus:border-rose-300 text-center w-[54px] tracking-wider"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {profileTab === 'gallery' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-4">Фотографии видны клиентам на странице записи</p>
                                <div className="flex flex-wrap gap-4">
                                    <label className="w-32 h-32 md:w-40 md:h-40 rounded-[24px] border-2 border-dashed border-stone-200 bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95">
                                        {uploadingPortfolio ? <Loader2 className="w-6 h-6 animate-spin text-stone-400" /> : (
                                            <>
                                                <Plus className="w-8 h-8 text-stone-400 mb-2" />
                                                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Добавить</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadPortfolioImage} />
                                    </label>

                                    {portfolioUrls.map((url: string, idx: number) => (
                                        <div key={idx} className="relative group">
                                            <img src={url} alt="Пример работы" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-[24px] shadow-sm border border-stone-200" />
                                            <button onClick={() => handleRemovePortfolioImage(url)} className="absolute top-2 right-2 bg-white/90 backdrop-blur text-rose-500 rounded-full p-2 shadow-sm border border-rose-100 hover:bg-rose-50 active:scale-95 transition-all opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {profileTab === 'team' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                                <div className="bg-stone-50 p-5 rounded-[24px] border border-stone-200 flex flex-col sm:flex-row gap-3 items-end">
                                    <div className="w-full">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Имя сотрудника</label>
                                        <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400 shadow-sm mt-1" placeholder="Например: Александр" />
                                    </div>
                                    <div className="w-full">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Должность / Специализация</label>
                                        <input value={newEmpSpec} onChange={e => setNewEmpSpec(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400 shadow-sm mt-1" placeholder="Например: Старший специалист" />
                                    </div>
                                    <div className="w-32 shrink-0">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-1">Ставка (%)</label>
                                        <input type="number" value={newEmpCommission} onChange={e => setNewEmpCommission(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-rose-400 shadow-sm mt-1 text-center" />
                                    </div>
                                    <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName} className="w-full sm:w-auto shrink-0 bg-stone-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50">
                                        {addingEmp ? <Loader2 className="w-5 h-5 animate-spin" /> : "Добавить"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {employees.map((emp: any) => (
                                        <div key={emp.id} className="flex justify-between items-center p-4 bg-white border border-stone-200 rounded-2xl shadow-sm hover:border-rose-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center font-black">{emp.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-stone-900 text-sm">{emp.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{emp.specialty || 'Специалист'} • {emp.commission_rate}%</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2.5 text-stone-400 hover:text-rose-500 bg-stone-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {profileTab === 'promo' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 rounded-[32px] text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div>
                                            <h2 className="text-2xl font-black mb-2 tracking-tight">QR-код для визиток и зеркал</h2>
                                            <p className="text-emerald-50 font-medium text-sm leading-relaxed max-w-md">Скачайте сгенерированный код, распечатайте и поставьте на рабочем месте. Клиенты смогут записываться прямо с телефона.</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-3xl shadow-lg shrink-0 flex flex-col items-center">
                                            {/* Временно используем сторонний API для генерации QR до установки либы (по желанию пользователя не усложняем) */}
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientLink)}`} alt="QR Code" className="w-32 h-32 rounded-xl mb-3" />
                                            <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(clientLink)}`, '_blank')} className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl w-full uppercase tracking-widest hover:bg-emerald-100 transition-colors">Скачать</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-stone-50 p-6 rounded-[32px] border border-stone-200">
                                        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">📸 Прямая ссылка для Instagram</h3>
                                        <p className="text-xs text-stone-500 font-medium mb-4">Вставьте эту ссылку в поле "Сайт" в настройках профиля Instagram.</p>
                                        <div className="flex gap-2">
                                            <input readOnly value={clientLink} className="flex-1 bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold text-stone-800 outline-none truncate" />
                                            <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-stone-900 text-white p-3 rounded-xl hover:bg-black active:scale-95 transition-all"><Copy className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    <div className="bg-stone-50 p-6 rounded-[32px] border border-stone-200">
                                        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">📍 Кнопка для 2GIS и Яндекса</h3>
                                        <p className="text-xs text-stone-500 font-medium mb-4">Добавьте ссылку в личный кабинет Яндекс Бизнеса (в кнопку действия).</p>
                                        <div className="flex gap-2">
                                            <input readOnly value={`${clientLink}?source=maps`} className="flex-1 bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold text-stone-800 outline-none truncate" />
                                            <button onClick={() => { navigator.clipboard.writeText(`${clientLink}?source=maps`); alert("Ссылка скопирована!"); }} className="bg-stone-900 text-white p-3 rounded-xl hover:bg-black active:scale-95 transition-all"><Copy className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 md:p-8 rounded-[32px] shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
                                    <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2">📅 Подписка на календарь</h3>
                                        <p className="text-blue-100 font-medium text-sm leading-relaxed mb-4 max-w-lg">Скопируйте ссылку ниже и добавьте её как подписку в Google Calendar или Apple Calendar. Ваше расписание будет обновляться автоматически.</p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/api/calendar/${username || user?.id}` : ''} className="flex-1 bg-white/10 border border-white/20 backdrop-blur rounded-xl p-3.5 text-xs font-bold text-white outline-none truncate placeholder-white/50" />
                                            <button
                                                onClick={() => {
                                                    const calLink = `${window.location.origin}/api/calendar/${username || user?.id}`;
                                                    navigator.clipboard.writeText(calLink);
                                                    alert("Ссылка на календарь скопирована!\n\nОткройте Google Calendar → Настройки → Добавить календарь → По URL → Вставьте ссылку.");
                                                }}
                                                className="bg-white text-blue-600 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-blue-50 shrink-0 flex items-center gap-2"
                                            >
                                                <Copy className="w-4 h-4" /> Копировать ссылку
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 flex-1">
                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                            <h3 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-2">Настройка модулей</h3>
                            <p className="text-xs text-amber-700/80 font-bold leading-relaxed">Вы можете отключить разделы (например, Склад или Финансы), если не используете их в работе. Они пропадут из меню, чтобы не отвлекать вас.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* МОДУЛЬ: Услуги */}
                            <div className={`p-5 rounded-[24px] border transition-all ${modulesConfig?.services ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100"><Users className="w-6 h-6 text-stone-600" /></div>
                                    <button
                                        onClick={() => setModulesConfig({ ...modulesConfig, services: !modulesConfig?.services })}
                                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${modulesConfig?.services ? 'bg-emerald-400' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modulesConfig?.services ? 'left-[26px]' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <h4 className="font-black text-stone-900 text-base mb-1">Услуги (Прайс)</h4>
                                <p className="text-xs font-bold text-stone-500 leading-relaxed">Редактирование категорий, стоимости и длительности ваших услуг.</p>
                            </div>

                            {/* МОДУЛЬ: Клиенты */}
                            <div className={`p-5 rounded-[24px] border transition-all ${modulesConfig?.clients ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100"><Users className="w-6 h-6 text-stone-600" /></div>
                                    <button
                                        onClick={() => setModulesConfig({ ...modulesConfig, clients: !modulesConfig?.clients })}
                                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${modulesConfig?.clients ? 'bg-emerald-400' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modulesConfig?.clients ? 'left-[26px]' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <h4 className="font-black text-stone-900 text-base mb-1">Клиенты (CRM)</h4>
                                <p className="text-xs font-bold text-stone-500 leading-relaxed">База клиентов, история визитов, статистика визитов и черный список.</p>
                            </div>

                            {/* МОДУЛЬ: Склад */}
                            <div className={`p-5 rounded-[24px] border transition-all ${modulesConfig?.inventory ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100"><Users className="w-6 h-6 text-stone-600" /></div>
                                    <button
                                        onClick={() => setModulesConfig({ ...modulesConfig, inventory: !modulesConfig?.inventory })}
                                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${modulesConfig?.inventory ? 'bg-emerald-400' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modulesConfig?.inventory ? 'left-[26px]' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <h4 className="font-black text-stone-900 text-base mb-1">Склад (Материалы)</h4>
                                <p className="text-xs font-bold text-stone-500 leading-relaxed">Учет расходников при записи, оприходование и история движения.</p>
                            </div>

                            {/* МОДУЛЬ: Финансы */}
                            <div className={`p-5 rounded-[24px] border transition-all ${modulesConfig?.analytics ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-100"><Clock className="w-6 h-6 text-stone-600" /></div>
                                    <button
                                        onClick={() => setModulesConfig({ ...modulesConfig, analytics: !modulesConfig?.analytics })}
                                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${modulesConfig?.analytics ? 'bg-emerald-400' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modulesConfig?.analytics ? 'left-[26px]' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <h4 className="font-black text-stone-900 text-base mb-1">Финансы (Аналитика)</h4>
                                <p className="text-xs font-bold text-stone-500 leading-relaxed">Расчет прибыли, ЗП сотрудников и общая выручка салона/мастера.</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mt-8 pt-6 border-t border-stone-100 flex justify-end shrink-0">
                    <button onClick={handleSaveProfile} disabled={saving} className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-stone-900/20 active:scale-95 transition-all hover:bg-black w-full md:w-auto flex justify-center items-center">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить настройки"}
                    </button>
                </div>
            </div >
        </div >
    );
}
