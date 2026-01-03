"use client";
import { UserButton } from "@/features/auth/components/user-button";
import { Bell, Camera, Film, Home, MessagesSquare, MoreHorizontal} from "lucide-react";
import WorkspaceSwitcher from "./workspace-switcher";
import SideBarButton from "./sidebar-button";
import { usePathname } from "next/navigation";




const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className="w-17.5 h-full bg-sidebar flex flex-col items-center gap-y-4 pt-2.25 pb-4">
            <WorkspaceSwitcher />
            <SideBarButton icon={Home} label="home" isActive={pathname.includes("/workspaces")} />
            <SideBarButton icon={MessagesSquare} label="DM's" />
            <SideBarButton icon={Bell} label="activity" />
            <SideBarButton icon={Film} label="Courses" />
            <SideBarButton icon={MoreHorizontal} label="more" />
            <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
                <UserButton />
            </div>
        </aside>
    );
}

export default Sidebar;