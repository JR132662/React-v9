import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SideBarButtonProps {
    icon: LucideIcon | IconType;
    label: string;
    isActive?: boolean;
}


export const SideBarButton = ({ 
    icon: Icon, 
    label, 
    isActive,
 }: SideBarButtonProps) => {
    return (
        <div className="flex flex-col items-center justify-center gap-y-0.5 cursor-pointer group">
            <Button
             variant="transparent"
             className={cn(
                "size-10 p-2 rounded-md flex items-center justify-center hover:bg-accent/25 transition-colors cursor-pointer",
                isActive && "bg-accent/25"
             )}
             >
             <Icon className="size-5 text-sidebar-foreground group-hover:scale-110 transition-all" />
            </Button>
            <span className="text-xs text-sidebar-foreground capitalize group-hover:text-sidebar-foreground">{label}</span>
        </div>
    );
}

export default SideBarButton;