import {atom, useAtom} from "jotai";

export const modalState = atom(false);

export const useCreateWorkspaceModal = () => {
    return useAtom(modalState);
}