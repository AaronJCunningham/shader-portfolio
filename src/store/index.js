import { create }from "zustand";

const useStore = create(() => {
  return {
    router: null,
    dom: null,
  };
});

export default useStore;

export const useLoadingProgress = create((set) => ({
  loadingProgress: null,
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
}));

export const useScroll = create((set) => ({
  scroll: null,
  setScroll: (scroll) => set({ scroll }),
}));