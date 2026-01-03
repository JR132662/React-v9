import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Id } from "../../../../convex/_generated/dataModel";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

interface UserItemProps {
    id: Id<"members">;
    label?: string;
    image?: string;
    variant?: VariantProps<typeof UserItemVariants>["variant"];
}

const UserItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-10 px-4 text-lg overflow-hidden",
    {
        variants: {
            variant: {
                default: "text-sidebar-foreground/80",
                active: "text-primary bg-accent hover:bg-accent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);


export const UserItem = ({ 
    id,  
    image, 
    label="member", 
    variant = "default" 
    }: UserItemProps) => {
        
    const workspaceId = useWorkspaceId();

    return (
        <Button
            variant="transparent"
            size="sm"
            className={cn(UserItemVariants({ variant }))}
            asChild
        >
            <Link href={`/workspaces/${workspaceId}/members/${id}`}>
                <Avatar className="size-6 mr-2 shrink-0">
                    {image ? (
                        <AvatarImage src={image} className="" />
                    ) : (
                        <AvatarFallback className="bg-sky-500 text-white rounded-md! text-xs">
                            {label.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    )}
                </Avatar>
                <span className="text-sm truncate">{label}</span>
            </Link>
        </Button>
    );
}

export default UserItem;