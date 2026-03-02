import { create } from 'zustand';

interface ServicesState {
    services: any[];
    setServices: (services: any[]) => void;
    addService: (service: any) => void;
    removeService: (id: string) => void;
    updateServiceImage: (id: string, urls: string[]) => void;
    updateServiceMaterials: (id: string, materials: any[]) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
    services: [],
    setServices: (services) => set({ services }),
    addService: (service) => set((state) => ({ services: [...state.services, service] })),
    removeService: (id) => set((state) => ({ services: state.services.filter(s => s.id !== id) })),
    updateServiceImage: (id, urls) => set((state) => ({
        services: state.services.map((s) => s.id === id ? { ...s, image_urls: urls } : s)
    })),
    updateServiceMaterials: (id, materials) => set((state) => ({
        services: state.services.map((s) => s.id === id ? { ...s, materials } : s)
    }))
}));
