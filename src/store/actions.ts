import { create } from 'zustand';
import { createClient } from "@/lib/supabase/client";
import { useAppointmentsStore } from './useAppointmentsStore';
import { useClientsStore } from './useClientsStore';
import { useServicesStore } from './useServicesStore';
import { useInventoryStore } from './useInventoryStore';
import { useProfileStore } from './useProfileStore';
import { useAppStore } from './useAppStore';

const supabase = createClient();

interface FetchActions {
    fetchAllData: (userId: string, isSilent?: boolean) => Promise<void>;
}

export const useAppActions = create<FetchActions>((set) => ({
    fetchAllData: async (userId: string, isSilent = false) => {
        const { setIsSyncing } = useAppStore.getState();
        if (!isSilent) setIsSyncing(true);

        try {
            // Profile data
            const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
            if (p) {
                const profileStore = useProfileStore.getState();
                profileStore.setProfileData({ role: p.role || "solo" });
                profileStore.setBusinessName(p.business_name || "");
                profileStore.setUsername(p.username || "");
                profileStore.setScheduleStep(p.schedule_step || 30);
                if (p.disabled_days) profileStore.setProfileData({ disabledDays: p.disabled_days.split(',').map(Number) });
                if (p.work_start_time) profileStore.setProfileData({ workStartTime: p.work_start_time });
                if (p.work_end_time) profileStore.setProfileData({ workEndTime: p.work_end_time });
                if (p.breaks) profileStore.setBreaks(typeof p.breaks === 'string' ? JSON.parse(p.breaks) : p.breaks || []);
                if (p.portfolio_urls) profileStore.setProfileData({ portfolioUrls: typeof p.portfolio_urls === 'string' ? JSON.parse(p.portfolio_urls) : p.portfolio_urls });
                if (p.weekly_settings) profileStore.setWeeklySettings(typeof p.weekly_settings === 'string' ? JSON.parse(p.weekly_settings) : p.weekly_settings);
                if (p.social_links) profileStore.setSocialLinks(typeof p.social_links === 'string' ? JSON.parse(p.social_links) : p.social_links);
                if (p.modules_config) profileStore.setModulesConfig(typeof p.modules_config === 'string' ? JSON.parse(p.modules_config) : p.modules_config);
                if (p.telegram_chat_id) profileStore.setTelegramChatId(p.telegram_chat_id);
            }

            // Services and Employees
            const { data: s } = await supabase.from("services").select("*, employee:employees(name), materials:service_materials(inventory_id, default_quantity)").eq("user_id", userId).order('created_at');
            useServicesStore.getState().setServices(s || []);
            const { data: e } = await supabase.from("employees").select("*").eq("salon_id", userId).order('created_at');
            useProfileStore.getState().setEmployees(e || []);

            // Inventory
            const inventoryStore = useInventoryStore.getState();
            const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", userId).order('name');
            inventoryStore.setInventory(inv || []);
            const { data: tx } = await supabase.from("inventory_transactions").select("*, inventory(name, unit)").eq("user_id", userId).order('created_at', { ascending: false }).limit(50);
            inventoryStore.setTransactions(tx || []);

            // Appointments & waitlist
            const appointmentsStore = useAppointmentsStore.getState();
            const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const { data: a } = await supabase.from("appointments")
                .select("id, client_name, client_phone, start_time, service_id, client_id, status, employee_id, materials_cost, materials_retail, service:services(name, category, price, duration, materials:service_materials(inventory_id, default_quantity)), employee:employees(name)")
                .eq("master_id", userId).gte('start_time', ninetyDaysAgo.toISOString()).order('start_time', { ascending: true });
            appointmentsStore.setAppointments(a || []);

            const { data: wl } = await supabase.from("waitlist").select("*").eq("master_id", userId).order('created_at');
            appointmentsStore.setWaitlist(wl || []);

            // Clients
            const { data: c } = await supabase.from("clients").select("*").eq("master_id", userId).order('created_at', { ascending: false });
            useClientsStore.getState().setClients(c || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            if (!isSilent) setTimeout(() => setIsSyncing(false), 500);
        }
    }
}));
