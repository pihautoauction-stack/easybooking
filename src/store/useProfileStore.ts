import { create } from 'zustand';

interface ProfileState {
    user: any | null;
    role: string;
    businessName: string;
    username: string;
    scheduleStep: number;
    breaks: any[];
    disabledDays: number[];
    workStartTime: string;
    workEndTime: string;
    portfolioUrls: string[];
    weeklySettings: any;
    socialLinks: any;
    modulesConfig: { services: boolean, clients: boolean, inventory: boolean, analytics: boolean };
    telegramChatId: string;
    employees: any[];
    newBreakStart: string;
    newBreakEnd: string;
    clientLink: string;

    setBusinessName: (name: string) => void;
    setUsername: (username: string) => void;
    setSocialLinks: (links: any) => void;
    setTelegramChatId: (id: string) => void;
    setScheduleStep: (step: number) => void;
    setBreaks: (breaks: any[]) => void;
    setWeeklySettings: (settings: any) => void;
    setModulesConfig: (config: any) => void;
    setNewBreakStart: (time: string) => void;
    setNewBreakEnd: (time: string) => void;
    setClientLink: (link: string) => void;

    setProfileData: (data: Partial<ProfileState>) => void;
    setUser: (user: any) => void;
    setEmployees: (employees: any[]) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    user: null,
    role: 'solo',
    businessName: '',
    username: '',
    scheduleStep: 30,
    breaks: [],
    disabledDays: [],
    workStartTime: '09:00',
    workEndTime: '20:00',
    portfolioUrls: [],
    weeklySettings: {},
    socialLinks: { telegram: '', whatsapp: '', instagram: '', vk: '' },
    modulesConfig: { services: true, clients: true, inventory: true, analytics: true },
    telegramChatId: '',
    employees: [],
    newBreakStart: '',
    newBreakEnd: '',
    clientLink: '',

    setBusinessName: (businessName) => set({ businessName }),
    setUsername: (username) => set({ username }),
    setSocialLinks: (socialLinks) => set({ socialLinks }),
    setTelegramChatId: (telegramChatId) => set({ telegramChatId }),
    setScheduleStep: (scheduleStep) => set({ scheduleStep }),
    setBreaks: (breaks) => set({ breaks }),
    setWeeklySettings: (weeklySettings) => set({ weeklySettings }),
    setModulesConfig: (modulesConfig) => set({ modulesConfig }),
    setNewBreakStart: (newBreakStart) => set({ newBreakStart }),
    setNewBreakEnd: (newBreakEnd) => set({ newBreakEnd }),
    setClientLink: (clientLink) => set({ clientLink }),

    setProfileData: (data) => set((state) => ({ ...state, ...data })),
    setUser: (user) => set({ user }),
    setEmployees: (employees) => set({ employees }),
}));
