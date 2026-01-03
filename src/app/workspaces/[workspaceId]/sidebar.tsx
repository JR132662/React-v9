"use client";
import { UserButton } from "@/features/auth/components/user-button";
import { Bell, Camera, Film, Home, MessagesSquare, MoreHorizontal} from "lucide-react";
import WorkspaceSwitcher from "./workspace-switcher";
import SideBarButton from "./sidebar-button";
import { usePathname } from "next/navigation";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";




const Sidebar = () => {
    const pathname = usePathname();
    const workspaceId = useWorkspaceId();

    const unreadAlerts = useQuery(api.notifications.countUnreadByWorkspace, { workspaceId });

    const base = `/workspaces/${workspaceId}`;

    return (
        <aside className="w-17.5 h-full bg-sidebar flex flex-col items-center gap-y-4 pt-2.25 pb-4">
            <WorkspaceSwitcher />
            <SideBarButton
                icon={Home}
                label="home"
                href={base}
                isActive={pathname.startsWith(base)}
            />
            <SideBarButton
                icon={MessagesSquare}
                label="DM's"
                href={`${base}/dms`}
                isActive={pathname.startsWith(`${base}/dms`)}
            />
            <SideBarButton
                icon={Bell}
                label="alerts"
                href={`${base}/activity`}
                isActive={pathname.startsWith(`${base}/activity`)}
                badgeCount={unreadAlerts ?? 0}
            />
            <SideBarButton icon={Film} label="Courses" disabled />
            <SideBarButton
                icon={MoreHorizontal}
                label="more"
                href={`${base}/more`}
                isActive={pathname.startsWith(`${base}/more`)}
            />
            <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
                <UserButton />
            </div>
        </aside>
    );
}

export default Sidebar;