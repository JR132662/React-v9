import { atom, useAtom } from "jotai";

export const createDmModalState = atom(false);

export const useCreateDmModal = () => {
  return useAtom(createDmModalState);
};
