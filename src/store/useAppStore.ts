import { create } from 'zustand';

interface AppState {
    loading: boolean;
    isSyncing: boolean;
    setLoading: (loading: boolean) => void;
    setIsSyncing: (isSyncing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    loading: true,
    isSyncing: false,
    setLoading: (loading) => set({ loading }),
    setIsSyncing: (isSyncing) => set({ isSyncing })
}));
