import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import { cn } from "@/lib/utils";
import * as React from "react";
import Link from "next/link";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

interface SideBarItemProps {
    label: string;
    id: string
    icon: LucideIcon | IconType
    variant?: VariantProps<typeof sideBarItemVariants>["variant"];
    actions?: React.ReactNode;

}


const sideBarItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-10 px-[18px] text-lg overflow-hidden transition-colors",
    {
        variants: {
            variant: {
                default: "text-sidebar-foreground/80",
                active: "text-sidebar-foreground bg-accent/35 hover:bg-accent/45",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);


export const SideBarItem = ({
    label,
    id,
    icon: Icon,
    variant = "default",
    actions,
}: SideBarItemProps) => {
    const workspaceId = useWorkspaceId();

    return (
        <div className={cn(sideBarItemVariants({ variant }), "w-full group pr-2")}
        >
            <Link
                href={`/workspaces/${workspaceId}/channel/${id}`}
                className="flex min-w-0 flex-1 items-center overflow-hidden"
            >
                <Icon
                    className={cn(
                        "size-5 mr-1 shrink-0 mt-1",
                        variant === "active"
                            ? "text-sidebar-foreground"
                            : "text-sidebar-foreground/80"
                    )}
                />
                <span className="text-sm truncate">{label}</span>
            </Link>

            {actions ? (
                <div
                    className={cn(
                        "ml-auto shrink-0",
                        "opacity-0 transition-opacity group-hover:opacity-100",
                        variant === "active" ? "opacity-100" : null
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {actions}
                </div>
            ) : null}
        </div>
    );
}

export default SideBarItem;