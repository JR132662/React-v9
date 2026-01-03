import { create } from "zustand";

type AiAssistantModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useAiAssistantModal = create<AiAssistantModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));