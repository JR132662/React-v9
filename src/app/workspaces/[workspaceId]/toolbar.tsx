import { Button } from "@/components/ui/button";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import {
    Check,
    Monitor,
    Moon,
    Search,
    Sun,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as React from "react";

type Theme = "dark" | "light";

const getStoredTheme = (): Theme => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("theme") === "light" ? "light" : "dark";
};

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
};


const Toolbar = () => {
    const workspaceId = useWorkspaceId();
    const { data } = useGetWorkspace({ id: workspaceId });

    const [theme, setTheme] = React.useState<Theme>("dark");

    React.useEffect(() => {
        setTheme(getStoredTheme());
    }, []);

    const onSelectTheme = React.useCallback((nextTheme: Theme) => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
    }, []);


    return (
        <nav className="bg-sidebar flex items-center justify-between h-12 p-1.5">
            <div className="flex-1" />
            <div className="min-w-70 max-160.5 grow-2 shrink">
                <Button
                    size="sm"
                    className="group relative bg-accent/25 hover:bg-white w-full justify-start h-7 px-2 border border-purple-500/50 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-purple-500/80 before:opacity-100 before:animate-pulse before:animation-duration-[1.6s]"
                >
                    <Search className="size-4 text-sidebar-foreground mr-2 group-hover:text-black" />
                    <span className="text-sidebar-foreground text-xs group-hover:text-black">
                        Search {data?.name}
                    </span>
                </Button>
            </div>
            <div className="ml-auto flex-1 flex items-center justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="sm"
                            variant="transparent"
                            className="bg-accent/25 hover:bg-accent/40 h-7 px-3 text-sidebar-foreground text-xs items-center"
                        >
                            {theme === "dark" ? (
                                <Moon className="size-4 text-sidebar-foreground mr-2" />
                            ) : (
                                <Sun className="size-4 text-sidebar-foreground mr-2" />
                            )}
                            Theme
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => onSelectTheme("dark")}
                        >
                            <Moon className="size-4 mr-2" />
                            Dark
                            {theme === "dark" ? <Check className="size-4 ml-auto" /> : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => onSelectTheme("light")}
                        >
                            <Sun className="size-4 mr-2" />
                            Light
                            {theme === "light" ? <Check className="size-4 ml-auto" /> : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled
                            className="opacity-60"
                        >
                            <Monitor className="size-4 mr-2" />
                            System
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
export default Toolbar;