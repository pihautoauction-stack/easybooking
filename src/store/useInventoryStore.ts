import { create } from 'zustand';

interface InventoryState {
    inventory: any[];
    transactions: any[];
    documents: any[];
    setInventory: (inventory: any[]) => void;
    setTransactions: (transactions: any[]) => void;
    setInventoryDocuments: (docs: any[]) => void;
    addInventoryItem: (item: any) => void;
    removeInventoryItem: (id: string) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
    inventory: [],
    transactions: [],
    documents: [],
    setInventory: (inventory) => set({ inventory }),
    setTransactions: (transactions) => set({ transactions }),
    setInventoryDocuments: (documents) => set({ documents }),
    addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
    removeInventoryItem: (id) => set((state) => ({ inventory: state.inventory.filter(i => i.id !== id) }))
}));

