"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
    Trash2, LogOut, Calendar as CalendarIcon, Copy, Plus, 
    Loader2, Briefcase, CalendarDays, UserCircle, 
    X, Users, BarChart3, Ban, UserSquare2, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Tab = 'appointments' | 'services' | 'employees' | 'clients' | 'profile';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('appointments');
    
    // Состояния данных
    const [businessName, setBusinessName] = useState("");
    const [workStart, setWorkStart] = useState(10);
    const [workEnd, setWorkEnd] = useState(20);
    const [disabledDays, setDisabledDays] = useState<number[]>([]);
    
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    
    // Формы
    const [newServiceName, setNewServiceName] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpSpec, setNewEmpSpec] = useState("");
    const [selectedApp, setSelectedApp] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace("/login"); return; }
            setUser(session.user);
            await loadData(session.user.id);
            setLoading(false);
        };
        init();
    }, [router]);

    const loadData = async (userId: string) => {
        // Профиль
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (p) {
            setBusinessName(p.business_name || "");
            setWorkStart(p.work_start || 10);
            setWorkEnd(p.work_end || 20);
            if (p.disabled_days) setDisabledDays(p.disabled_days.split(',').map(Number));
        }
        
        // Сотрудники
        const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId);
        setEmployees(e || []);

        // Услуги
        const { data: s } = await supabase.from("services").select("*, employee:employees(name)").eq("user_id", userId);
        setServices(s || []);
        
        // Записи (только активные)
        const { data: a } = await supabase.from("appointments").select("*, service:services(name, price)").eq("master_id", userId).eq("status", "active").order('start_time', { ascending: true });
        setAppointments(a || []);

        // Клиенты
        const { data: c } = await supabase.from("clients").select("*").eq("master_id", userId).order('visits_count', { ascending: false });
        setClients(c || []);
    };

    const handleSaveProfile = async () => {
        await supabase.from("profiles").upsert({ 
            id: user.id, 
            business_name: businessName,
            work_start: workStart,
            work_end: workEnd,
            disabled_days: disabledDays.join(',')
        });
        alert("Профиль успешно сохранен!");
    };

    const toggleDisabledDay = (dayIndex: number) => {
        setDisabledDays(prev => 
            prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
        );
    };

    const handleAddService = async () => {
        if (!newServiceName || !newServicePrice) return;
        await supabase.from("services").insert({ user_id: user.id, name: newServiceName, price: Number(newServicePrice) });
        setNewServiceName(""); setNewServicePrice(""); await loadData(user.id);
    };

    const handleAddEmployee = async () => {
        if (!newEmpName) return;
        await supabase.from("employees").insert({ salon_id: user.id, name: newEmpName, specialty: newEmpSpec });
        setNewEmpName(""); setNewEmpSpec(""); await loadData(user.id);
    };

    const handleCompleteRecord = async (app: any) => {
        if (confirm("Успешно завершить визит?")) {
            // Отмечаем запись завершенной
            await supabase.from("appointments").update({ status: 'completed' }).eq("id", app.id);
            
            // Ищем клиента в базе, чтобы обновить ему статистику
            const { data: existingClient } = await supabase.from("clients").select("*").eq("master_id", user.id).eq("phone", app.client_phone).single();
            
            const servicePrice = app.service?.price || 0;

            if (existingClient) {
                await supabase.from("clients").update({
                    visits_count: existingClient.visits_count + 1,
                    total_revenue: existingClient.total_revenue + servicePrice
                }).eq("id", existingClient.id);
            } else {
                await supabase.from("clients").insert({
                    master_id: user.id,
                    name: app.client_name,
                    phone: app.client_phone,
                    visits_count: 1,
                    total_revenue: servicePrice,
                    is_blacklisted: false
                });
            }

            await loadData(user.id); 
            setSelectedApp(null);
        }
    };

    const handleToggleBlacklist = async (clientId: string, currentStatus: boolean) => {
        if (confirm(currentStatus ? "Убрать клиента из ЧС?" : "Добавить клиента в ЧС? Он больше не сможет записаться.")) {
            await supabase.from("clients").update({ is_blacklisted: !currentStatus }).eq("id", clientId);
            await loadData(user.id);
        }
    };

    // ССЫЛКА ДЛЯ КЛИЕНТОВ (для веб-версии)
    const clientLink = user ? `${window.location.origin}/book/${user.id}` : "";
    const totalRevenue = clients.reduce((acc, c) => acc + Number(c.total_revenue || 0), 0);
    const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A84FF]" /></div>;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col antialiased">
            <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/[0.08] px-5 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#1C1C1E] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                        <span className="font-bold text-[#0A84FF]">EB</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold truncate max-w-[150px]">{businessName || "Настройка профиля"}</h1>
                        <p className="text-[10px] text-[#32D74B] uppercase tracking-widest font-bold">Online</p>
                    </div>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))} className="p-2 bg-white/5 rounded-full active:scale-95 transition-all"><LogOut className="w-4 h-4 text-white/40" /></button>
            </header>

            <main className="flex-1 p-4 pb-32">
                {activeTab === 'appointments' && (
                    <div className="space-y-3">
                        {appointments.length === 0 ? (
                            <div className="py-20 text-center text-white/20"><CalendarIcon className="mx-auto mb-4 w-10 h-10 opacity-10" /><p className="text-sm font-medium">Активных записей нет</p></div>
                        ) : appointments.map(app => (
                            <div key={app.id} onClick={() => setSelectedApp(app)} className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/5 active:scale-[0.98] transition-all cursor-pointer shadow-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-2xl font-bold text-[#0A84FF]">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold uppercase">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                </div>
                                <div className="font-semibold text-lg">{app.client_name}</div>
                                <div className="text-sm text-white/50 mt-1 font-medium flex items-center gap-2"><Briefcase className="w-3 h-3" /> {app.service?.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="space-y-6">
                        <div className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/10 space-y-3">
                            <input placeholder="Название услуги (например, Стрижка)" value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm outline-none focus:border-[#0A84FF]/50 transition-colors" />
                            <input type="number" placeholder="Цена (₽)" value={newServicePrice} onChange={e=>setNewServicePrice(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm outline-none focus:border-[#0A84FF]/50 transition-colors" />
                            <button onClick={handleAddService} className="w-full bg-[#32D74B] text-black p-4 rounded-2xl font-bold active:scale-95 transition-all">Добавить услугу</button>
                        </div>
                        <div className="space-y-3">
                            {services.map(s => (
                                <div key={s.id} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 flex justify-between items-center shadow-md">
                                    <div><div className="font-semibold">{s.name}</div><div className="text-sm text-[#32D74B] font-medium">{s.price} ₽</div></div>
                                    <button onClick={async () => { await supabase.from('services').delete().eq('id', s.id); loadData(user.id); }} className="text-[#FF453A] p-3 bg-[#FF453A]/10 rounded-full active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'employees' && (
                    <div className="space-y-6">
                        <div className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/10 space-y-3">
                            <input placeholder="Имя сотрудника" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm outline-none focus:border-[#0A84FF]/50" />
                            <input placeholder="Специализация (Мастер маникюра)" value={newEmpSpec} onChange={e=>setNewEmpSpec(e.target.value)} className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm outline-none focus:border-[#0A84FF]/50" />
                            <button onClick={handleAddEmployee} className="w-full bg-[#0A84FF] text-white p-4 rounded-2xl font-bold active:scale-95 transition-all">Добавить сотрудника</button>
                        </div>
                        <div className="space-y-3">
                            {employees.map(emp => (
                                <div key={emp.id} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 flex justify-between items-center shadow-md">
                                    <div><div className="font-semibold">{emp.name}</div><div className="text-sm text-white/40">{emp.specialty}</div></div>
                                    <button onClick={async () => { await supabase.from('employees').delete().eq('id', emp.id); loadData(user.id); }} className="text-[#FF453A] p-3 bg-[#FF453A]/10 rounded-full active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="space-y-4">
                        {clients.length === 0 ? (
                            <div className="py-20 text-center text-white/20"><Users className="mx-auto mb-4 w-10 h-10 opacity-10" /><p className="text-sm">База клиентов пуста</p></div>
                        ) : clients.map(c => (
                            <div key={c.id} className={`bg-[#1C1C1E] p-5 rounded-[24px] border border-white/5 flex justify-between items-center transition-all ${c.is_blacklisted ? 'opacity-40 grayscale' : ''}`}>
                                <div>
                                    <div className="font-bold text-lg flex items-center gap-2">{c.name} {c.is_blacklisted && <Ban className="w-4 h-4 text-[#FF453A]" />}</div>
                                    <div className="text-sm text-white/50">{c.phone}</div>
                                    <div className="text-xs font-semibold mt-2 text-[#0A84FF] bg-[#0A84FF]/10 inline-block px-2 py-1 rounded-md">Визитов: {c.visits_count} • {c.total_revenue} ₽</div>
                                </div>
                                <button onClick={() => handleToggleBlacklist(c.id, c.is_blacklisted)} className={`p-3 rounded-full transition-all active:scale-90 ${c.is_blacklisted ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:text-[#FF453A] hover:bg-[#FF453A]/10'}`}>
                                    <Ban className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        {/* Аналитика */}
                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 text-center flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Общий доход</p>
                                <p className="text-3xl font-bold text-[#32D74B]">{totalRevenue} ₽</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Клиентов</p>
                                <p className="text-3xl font-bold text-white">{clients.length}</p>
                            </div>
                        </div>

                        {/* Ссылка для записи */}
                        <div className="bg-[#0A84FF]/10 p-5 rounded-[28px] border border-[#0A84FF]/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A84FF]/20 blur-3xl rounded-full"></div>
                            <h2 className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-widest mb-3 relative z-10">Веб-ссылка для клиентов</h2>
                            <div className="flex gap-2 relative z-10">
                                <input readOnly value={clientLink} className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white/60 outline-none font-mono" />
                                <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Ссылка скопирована!"); }} className="bg-[#0A84FF] px-5 rounded-2xl active:scale-95 transition-all flex items-center justify-center"><Copy className="w-5 h-5 text-white" /></button>
                            </div>
                            <p className="text-[10px] text-white/40 mt-3 text-center relative z-10">Разместите эту ссылку в шапке Instagram, ВКонтакте или отправляйте в WhatsApp</p>
                        </div>
                        
                        {/* Настройки */}
                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10 space-y-5">
                            <div>
                                <label className="text-[11px] text-white/50 uppercase font-bold mb-2 block">Название бизнеса или Имя</label>
                                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-white/[0.04] border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-[#0A84FF]/50 transition-colors" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] text-white/50 uppercase font-bold mb-2 block">Начало работы</label>
                                    <input type="number" min="0" max="23" value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="w-full bg-white/[0.04] border border-white/5 rounded-2xl p-4 text-sm text-white outline-none text-center" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-white/50 uppercase font-bold mb-2 block">Конец работы</label>
                                    <input type="number" min="0" max="24" value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="w-full bg-white/[0.04] border border-white/5 rounded-2xl p-4 text-sm text-white outline-none text-center" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-white/50 uppercase font-bold mb-3 block">Выходные дни</label>
                                <div className="flex justify-between gap-1">
                                    {weekDays.map((day, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => toggleDisabledDay(idx)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${disabledDays.includes(idx) ? 'bg-[#FF453A] text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleSaveProfile} className="w-full bg-[#0A84FF] text-white py-4 mt-4 rounded-2xl font-bold active:scale-95 transition-all shadow-[0_4px_20px_0_rgba(10,132,255,0.3)]">Сохранить настройки</button>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 w-full bg-black/85 backdrop-blur-2xl border-t border-white/[0.05] pb-8 pt-4 px-2">
                <div className="flex justify-between max-w-md mx-auto">
                    {[
                        { id: 'appointments', icon: CalendarDays, label: 'Записи' },
                        { id: 'services', icon: Briefcase, label: 'Услуги' },
                        { id: 'employees', icon: UserSquare2, label: 'Команда' },
                        { id: 'clients', icon: Users, label: 'Клиенты' },
                        { id: 'profile', icon: UserCircle, label: 'Профиль' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 w-16 ${activeTab === tab.id ? 'text-[#0A84FF]' : 'text-white/30'}`}>
                            <tab.icon className="w-6 h-6" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Модальное окно записи */}
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setSelectedApp(null)}>
                    <div className="bg-[#1C1C1E] p-6 rounded-[32px] w-full max-w-sm border border-white/10 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedApp(null)} className="absolute top-5 right-5 text-white/40 bg-white/5 p-2 rounded-full active:scale-90"><X className="w-5 h-5" /></button>
                        
                        <h2 className="text-xl font-bold mb-6">Детали визита</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-widest">Клиент</p>
                                <p className="text-xl font-bold">{selectedApp.client_name}</p>
                                <p className="text-[#0A84FF] font-medium mt-1">{selectedApp.client_phone}</p>
                            </div>
                            
                            <div className="border-y border-white/5 py-5 space-y-4">
                                <div className="flex justify-between items-center"><span className="text-white/50 text-sm">Время</span><span className="font-bold text-lg bg-white/5 px-3 py-1 rounded-xl">{format(new Date(selectedApp.start_time), "HH:mm, d MMM", { locale: ru })}</span></div>
                                <div className="flex justify-between items-center"><span className="text-white/50 text-sm">Услуга</span><span className="font-bold text-right max-w-[180px]">{selectedApp.service?.name}</span></div>
                                <div className="flex justify-between items-center"><span className="text-white/50 text-sm">Стоимость</span><span className="font-bold text-[#32D74B]">{selectedApp.service?.price} ₽</span></div>
                            </div>
                            
                            <div className="space-y-3 pt-2">
                                <button onClick={() => handleCompleteRecord(selectedApp)} className="w-full bg-[#32D74B] text-black font-bold py-4 rounded-2xl active:scale-95 shadow-[0_4px_14px_0_rgba(50,215,75,0.2)] flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Завершить визит</button>
                                <button onClick={async () => { if(confirm("Отменить запись?")) { await supabase.from('appointments').delete().eq('id', selectedApp.id); loadData(user.id); setSelectedApp(null); } }} className="w-full text-[#FF453A] font-bold py-4 rounded-2xl bg-[#FF453A]/10 active:scale-95 border border-[#FF453A]/20">Отменить запись</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}