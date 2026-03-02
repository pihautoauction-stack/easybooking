"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    LogOut,
    Loader2, CalendarDays, UserCircle,
    RefreshCw, Users, BarChart3, ChevronRight, Package, ListTree
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import AppointmentsTab from "@/components/dashboard/AppointmentsTab";
import ServicesTab from "@/components/dashboard/ServicesTab";
import ClientsTab from "@/components/dashboard/ClientsTab";
import InventoryTab from "@/components/dashboard/InventoryTab";
import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import ProfileTab from "@/components/dashboard/ProfileTab";
import { useProfileStore } from "@/store/useProfileStore";
import { useAppStore } from "@/store/useAppStore";
import { useAppActions } from "@/store/actions";

const supabase = createClient();

type Tab = 'appointments' | 'services' | 'clients' | 'inventory' | 'analytics' | 'profile';

const NAV_ITEMS = [
    { id: 'appointments', icon: CalendarDays, label: 'Записи' },
    { id: 'services', icon: ListTree, label: 'Прайс' },
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'inventory', icon: Package, label: 'Склад' },
    { id: 'analytics', icon: BarChart3, label: 'Финансы' }
];
export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<Tab>('appointments');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Профиль
    const { username, businessName, modulesConfig } = useProfileStore();

    // Данные
    const { isSyncing } = useAppStore();
    const { fetchAllData } = useAppActions();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace("/login");
                return;
            }
            setUser(session.user);
            useProfileStore.getState().setUser(session.user);
            await fetchAllData(session.user.id);
            setLoading(false);
        };
        init();
    }, [router]);

    // Detect mobile keyboard open/close to avoid bottom nav bug
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            // If viewport height significantly smaller than window height, keyboard is open
            const isKeyboard = vv.height < window.innerHeight * 0.75;
            setKeyboardVisible(isKeyboard);
        };

        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    if (loading) return (
        <div className="h-screen w-full bg-[#FAF9F6] flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
        </div>
    );

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
                    <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => setActiveTab('profile')}>
                        <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                            {isSyncing ? <RefreshCw className="w-3 h-3 text-stone-400 animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span>}
                        </div>
                        <span className="text-xs font-bold text-stone-600 truncate flex-1">{businessName || "Настройки профиля"}</span>
                        <UserCircle className="w-4 h-4 text-stone-400" />
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
                        <img src="/logo.svg" alt="Nexio Logo" className="w-10 h-10 shrink-0 object-contain drop-shadow-sm ml-2" />
                        <div className="flex flex-col justify-center cursor-pointer" onClick={() => setActiveTab('profile')}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-sm font-black tracking-tight text-stone-900">Управление</h1>
                                <div className="relative flex h-2 w-2 items-center justify-center">{isSyncing ? <RefreshCw className="w-2.5 h-2.5 text-stone-400 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}</div>
                            </div>
                            <span className="text-[10px] text-stone-400 truncate max-w-[140px] font-bold leading-none flex items-center gap-1">{businessName || "Профиль"} <ChevronRight className="w-3 h-3" /></span>
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
                            <AppointmentsTab />
                        )}

                        {activeTab === 'services' && modulesConfig.services && (
                            <ServicesTab />
                        )}

                        {activeTab === 'inventory' && modulesConfig.inventory && (
                            <InventoryTab />
                        )}

                        {activeTab === 'clients' && modulesConfig.clients && (
                            <ClientsTab />
                        )}

                        {activeTab === 'analytics' && modulesConfig.analytics && (
                            <AnalyticsTab />
                        )}

                        {activeTab === 'profile' && (
                            <ProfileTab />
                        )}

                    </div>
                </main>

                {/* НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ (ДЛЯ МОБИЛОК) */}
                <nav
                    className={`md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-200 z-40 px-2 pt-2 flex justify-around items-center shadow-[0_-4px_24px_rgba(0,0,0,0.02)] transition-transform duration-200 ${keyboardVisible ? 'translate-y-full' : 'translate-y-0'}`}
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

        </div>
    );
}