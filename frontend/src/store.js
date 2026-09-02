import { create } from "zustand";

//zustand
export const useFilter = create((set) => ({
  filter: {
    startDate: "",
    endDate: "",
    limit: 100,
    skip: 0,
    asc: true,
    searchKey: "",
    brandIds: [],
    requiredQuantity: false,
    requiredRpHargaDasar: false,
    requiredBarcodeItem: false,
  },
  setFilter: (filter) => set((state) => ({ filter })),
  resetFilter: () =>
    set(() => ({
      filter: {
        startDate: "",
        endDate: "",
        limit: 100,
        skip: 0,
        asc: true,
        searchKey: "",
        brandIds: [],
        requiredQuantity: false,
        requiredRpHargaDasar: false,
        requiredBarcodeItem: false,
      },
    })),
}));

export const useUserInfo = create((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set((state) => ({ userInfo })),
  clearUserInfo: () => set(() => ({ userInfo: null })),
}));
