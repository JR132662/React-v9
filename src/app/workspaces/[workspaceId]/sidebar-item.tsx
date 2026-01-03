
import { Button } from "@/components/ui/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import Link from "next/link";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { cn } from "@/lib/utils";

interface SideBarItemProps {
    label: string;
    id: string
    icon: LucideIcon | IconType
    variant?: VariantProps<typeof sideBarItemVariants>["variant"];

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
    variant = "default"
}: SideBarItemProps) => {
    const workspaceId = useWorkspaceId();

    return (
        <Button 
        asChild
        variant="transparent"
        className={cn(sideBarItemVariants({ variant }))}
        size='lg'
        >
            <Link href={`/workspaces/${workspaceId}/channel/${id}`} className="flex items-center overflow-hidden w-full">
                <Icon
                    className={cn(
                        "size-5 mr-1 shrink-0 mt-1",
                        variant === "active" ? "text-sidebar-foreground" : "text-sidebar-foreground/80"
                    )}
                />
               <span className="text-sm truncate">{label}</span>
            </Link>
        </Button>
    );
}

export default SideBarItem;