"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
 } from "@/components/ui/dropdown-menu";

import { useCurrentUser } from "../api/use-current-user";
import { LoaderPinwheel, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export const UserButton = () => {
    const signOut = useAuthActions().signOut;
    const { data, isLoading} = useCurrentUser();

    if (isLoading) {
        return (
        <div>
            <LoaderPinwheel className="animate-spin" />
        </div>
        );
    }

    if (!data) {
        return null;
    }

    const { image, name } = data;

    const avatarFallback = name!.charAt(0).toUpperCase();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="outline-none relative">
                <Avatar className="size-10 cursor-pointer hover:opacity-75 transition">
                    <AvatarImage alt={name} src={image ?? undefined} />
                    <AvatarFallback className="bg-yellow-500  text-white">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="right" className="w-60">
                <DropdownMenuItem onClick={() => signOut()} className="h-10">
                    <LogOut className="size-4 mr-2" />
                        Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}