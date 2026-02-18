"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { LogOut, Calendar as CalendarIcon, Copy, Loader2, Link as LinkIcon, Briefcase, CalendarDays, UserCircle, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Tab = 'appointments' | 'services' | 'profile';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('appointments');
    
    const [services, setServices] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    
    // Формы
    const [newServiceName, setNewServiceName] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [businessName, setBusinessName] = useState("");

    useEffect(() => {
        if (!pb.authStore.isValid) {
            router.replace("/login");
            return;
        }
        setUser(pb.authStore.model);
        setBusinessName(pb.authStore.model?.business_name || "");
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const userId = pb.authStore.model?.id;
            
            // Загрузка услуг
            const s = await pb.collection('services').getFullList({ filter: `user = "${userId}"` });
            setServices(s);
            
            // Загрузка записей (с раскрытием связи service)
            const a = await pb.collection('appointments').getFullList({ 
                filter: `master = "${userId}"`,
                sort: 'start_time',
                expand: 'service'
            });
            setAppointments(a);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = async () => {
        if (!newServiceName || !newServicePrice) return;
        await pb.collection('services').create({
            name: newServiceName,
            price: Number(newServicePrice),
            user: user.id
        });
        setNewServiceName(""); setNewServicePrice("");
        loadData();
    };

    const handleDeleteService = async (id: string) => {
        if(confirm("Удалить услугу?")) {
            await pb.collection('services').delete(id);
            loadData();
        }
    };

    const handleSaveProfile = async () => {
        await pb.collection('users').update(user.id, { business_name: businessName });
        alert("Профиль сохранен");
    };

    const logout = () => {
        pb.authStore.clear();
        router.replace("/login");
    };

    // ССЫЛКА ДЛЯ КЛИЕНТОВ (Открывается в любом браузере)
    const clientLink = user ? `${window.location.origin}/book/${user.id}` : "";

    if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><Loader2 className="animate-spin text-[#0A84FF]" /></div>;

    return (
        <div className="min-h-screen bg-[#000000] text-white flex flex-col antialiased">
            <header className="sticky top-0 z-30 bg-[#000000]/70 backdrop-blur-xl border-b border-white/[0.08] px-5 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#1C1C1E] border border-white/5"><img src="/logo.svg" alt="L" className="w-full h-full object-cover" /></div>
                    <div>
                        <h1 className="text-sm font-bold">EasyBooking Admin</h1>
                        <p className="text-[10px] text-white/40">{businessName || "Настройка профиля"}</p>
                    </div>
                </div>
                <button onClick={logout} className="p-2 bg-white/[0.05] rounded-full active:scale-90"><LogOut className="w-4 h-4 text-white/40" /></button>
            </header>

            <main className="flex-1 p-4 pb-32">
                {activeTab === 'appointments' && (
                    <div className="space-y-3">
                        {appointments.length === 0 ? (
                            <div className="py-20 text-center text-white/20"><CalendarIcon className="mx-auto mb-4 w-10 h-10 opacity-10" /><p>Записей пока нет</p></div>
                        ) : appointments.map(app => (
                            <div key={app.id} className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-2xl font-bold">{format(new Date(app.start_time), "HH:mm")}</div>
                                    <div className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase">{format(new Date(app.start_time), "d MMM", { locale: ru })}</div>
                                </div>
                                <div className="font-semibold">{app.client_name} <span className="text-white/40 text-sm ml-2">{app.client_phone}</span></div>
                                <div className="text-xs text-[#0A84FF] mt-1 font-medium">{app.expand?.service?.name || "Услуга удалена"}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="space-y-4">
                        <div className="bg-[#1C1C1E] p-5 rounded-[24px] border border-white/10 flex gap-2">
                            <div className="flex-1 space-y-2">
                                <input placeholder="Название услуги" value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl text-sm outline-none" />
                                <input type="number" placeholder="Цена (₽)" value={newServicePrice} onChange={e=>setNewServicePrice(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl text-sm outline-none" />
                            </div>
                            <button onClick={handleAddService} className="bg-[#32D74B] text-black p-4 rounded-xl font-bold"><Plus className="w-6 h-6" /></button>
                        </div>
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-[#1C1C1E] p-4 rounded-2xl border border-white/5">
                                <div><div className="font-semibold">{s.name}</div><div className="text-sm text-white/40">{s.price} ₽</div></div>
                                <button onClick={() => handleDeleteService(s.id)} className="text-[#FF453A] p-2 bg-[#FF453A]/10 rounded-full"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-[#0A84FF]/10 p-5 rounded-[28px] border border-[#0A84FF]/20">
                            <h2 className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-widest mb-3">Ваша веб-ссылка для записи</h2>
                            <div className="flex gap-2">
                                <input readOnly value={clientLink} className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white/60 outline-none font-mono" />
                                <button onClick={() => { navigator.clipboard.writeText(clientLink); alert("Скопировано!"); }} className="bg-[#0A84FF] px-5 rounded-2xl active:scale-95"><Copy className="w-5 h-5 text-white" /></button>
                            </div>
                            <p className="text-[9px] text-white/30 mt-3 text-center">Вставьте эту ссылку в Instagram, VK, WhatsApp</p>
                        </div>
                        
                        <div className="bg-[#1C1C1E] p-6 rounded-[28px] border border-white/10">
                            <label className="text-[11px] text-white/50 uppercase mb-2 block">Название бизнеса или Имя</label>
                            <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-white/[0.06] border border-white/5 rounded-2xl p-4 text-sm text-white outline-none mb-4" />
                            <button onClick={handleSaveProfile} className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-bold active:scale-95 transition-all">Сохранить</button>
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-2xl border-t border-white/[0.08] pb-8 pt-3">
                <div className="flex justify-around max-w-md mx-auto">
                    {[
                        { id: 'appointments', icon: CalendarDays, label: 'Записи' },
                        { id: 'services', icon: Briefcase, label: 'Услуги' },
                        { id: 'profile', icon: UserCircle, label: 'Профиль' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === tab.id ? 'text-[#0A84FF]' : 'text-white/30'}`}>
                            <tab.icon className="w-6 h-6" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}