import { create } from 'zustand'

export const useDataStore = create((set) => ({
  // Dropdown options cache
  dropdowns: {
    status: [],
    source: [],
    action: [],
  },
  setDropdowns: (type, options) => set((state) => ({
    dropdowns: { ...state.dropdowns, [type]: options }
  })),
  clearCache: () => set({ dropdowns: { status: [], source: [], action: [] } }),
}))