"use client";

import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { CreateDmModal } from "@/features/direct-messages/components/create-dm-modal";
import { AiAssistantModal } from "@/features/ai-assistant/components/ai-assistant-modal";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Modals() {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isWorkspaceRoute = pathname.startsWith("/workspaces/");

    return (
        <>
        <CreateWorkspaceModal />
        {isWorkspaceRoute ? <CreateDmModal /> : null}
        <AiAssistantModal />
        </>
    )
}