import { create } from 'zustand';

interface AppointmentsState {
    appointments: any[];
    waitlist: any[];
    setAppointments: (appointments: any[]) => void;
    setWaitlist: (waitlist: any[]) => void;
}

export const useAppointmentsStore = create<AppointmentsState>((set) => ({
    appointments: [],
    waitlist: [],
    setAppointments: (appointments) => set({ appointments }),
    setWaitlist: (waitlist) => set({ waitlist }),
}));
