import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SideBarButtonProps {
    icon: LucideIcon | IconType;
    label: string;
    isActive?: boolean;
    href?: string;
    disabled?: boolean;
    badgeCount?: number;
}


export const SideBarButton = ({ 
    icon: Icon, 
    label, 
    isActive,
    href,
    disabled,
    badgeCount,
 }: SideBarButtonProps) => {
    const showBadge = typeof badgeCount === "number" && badgeCount > 0;
    const badgeText = showBadge ? (badgeCount > 99 ? "99+" : String(badgeCount)) : "";

    const content = (
        <span className="relative inline-flex">
            <Icon
                className={cn(
                    "size-5 text-sidebar-foreground transition-all",
                    disabled ? "opacity-50" : "group-hover:scale-110"
                )}
            />
            {showBadge ? (
                <span
                    className={cn(
                        "absolute -right-1.5 -top-1.5",
                        "min-w-4 h-4 px-1",
                        "rounded-full",
                        "bg-destructive text-destructive-foreground",
                        "text-[10px] leading-4 font-medium",
                        "text-center"
                    )}
                    aria-label={`${badgeText} unread alerts`}
                >
                    {badgeText}
                </span>
            ) : null}
        </span>
    );

    return (
        <div className={cn("flex flex-col items-center justify-center gap-y-0.5 group", disabled ? "cursor-default" : "cursor-pointer")}>
            <Button
                asChild={Boolean(href) && !disabled}
                variant="transparent"
                disabled={disabled}
                className={cn(
                    "size-10 p-2 rounded-md flex items-center justify-center transition-colors",
                    disabled ? "cursor-default" : "cursor-pointer hover:bg-accent/25",
                    isActive && "bg-accent/25"
                )}
            >
                {href && !disabled ? (
                    <Link href={href} aria-label={label}>
                        {content}
                    </Link>
                ) : (
                    <span aria-label={label}>{content}</span>
                )}
            </Button>
            <span
                className={cn(
                    "text-xs text-sidebar-foreground capitalize",
                    disabled ? "opacity-50" : "group-hover:text-sidebar-foreground"
                )}
            >
                {label}
            </span>
        </div>
    );
}

export default SideBarButton;