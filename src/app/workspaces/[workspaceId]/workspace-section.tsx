import { Button } from "@/components/ui/button";
import { FaCaretDown } from "react-icons/fa";
import { Hint } from "@/components/hint";
import { Plus } from "lucide-react";
import { useToggle } from "react-use"
import { cn } from "@/lib/utils";

interface WorkSpaceSectionProps {
  children: React.ReactNode;
  label?: string;
  hint: string;
  onNew?: () => void;
}

export const WorkSpaceSection = ({ children, label, hint, onNew }: WorkSpaceSectionProps) => {
  const [on, toggle] = useToggle(true);
  return (
    <div className="flex flex-col mt-3 px-2">
      <div className="flex items-center px-3 group gap-1">
        <Button
          variant="transparent"
          size="sm"
          className="p-0.5 text-sm text-sidebar-foreground/80 shrink-0 size-6"
          onClick={toggle}
        >
          <FaCaretDown className={cn("size-4", !on && "-rotate-90")} />
        </Button>

        <Button
          variant="transparent"
          size="sm"
          className="px-1.5 text-sm text-sidebar-foreground/80 h-7 justify-start overflow-hidden flex-1 cursor-pointer"
        >
          <span className="truncate">{label}</span>
        </Button>

        {onNew && (
          <Hint label={hint} side="top" align="center">
            <Button
              variant="transparent"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 shrink-0 size-6 cursor-pointer"
              onClick={onNew}
            >
              <Plus className="size-4 text-white" />
            </Button>
          </Hint>
        )}
      </div>

      {on && children}
    </div>
  );
};

export default WorkSpaceSection;