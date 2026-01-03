"use client";


import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from "@/components/ui/resizable";
import Sidebar from "./sidebar";
import Toolbar from "./toolbar";
import WorkSpaceSidebar from "./workspace-sidebar";

interface WorkspaceIdLayoutProps {
    children: React.ReactNode;
}


const WorkspaceLayout = ({ children }: WorkspaceIdLayoutProps) => {
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <Toolbar />
            <div className="flex flex-1 min-h-0">
                <Sidebar />
                <ResizablePanelGroup
                    direction="horizontal"
                    autoSaveId="workspace-layout"
                    className="flex-1 min-h-0"
                >
                    <ResizablePanel
                        defaultSize={20}
                        minSize={11}
                        className="bg-sidebar min-h-0"
                    >
                        <WorkSpaceSidebar />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                        minSize={20}
                        className="min-h-0"
                    >
                        {children}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}

export default WorkspaceLayout;