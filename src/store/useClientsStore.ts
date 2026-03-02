import { create } from 'zustand';

interface ClientsState {
    clients: any[];
    setClients: (clients: any[]) => void;
    updateClientTags: (clientId: string, tags: string[]) => void;
    toggleBlacklist: (clientId: string, status: boolean) => void;
    updateClientNotes: (clientId: string, notes: string) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
    clients: [],
    setClients: (clients) => set({ clients }),
    updateClientTags: (clientId, tags) => set((state) => ({
        clients: state.clients.map((c) => c.id === clientId ? { ...c, tags } : c)
    })),
    toggleBlacklist: (clientId, status) => set((state) => ({
        clients: state.clients.map((c) => c.id === clientId ? { ...c, is_blacklisted: !status } : c)
    })),
    updateClientNotes: (clientId, notes) => set((state) => ({
        clients: state.clients.map((c) => c.id === clientId ? { ...c, notes } : c)
    }))
}));
