import React, { useState } from "react";
import { DeviceMode, DeviceToggle } from "./device-toggle";
import { EditorTabs, EditorTabValue } from "./editor-tabs";
import Link from "next/link";
import { ProjectMenu } from "./project-menu";
import { cn } from "@/lib/utils";
import { ExternalLink, Eye, Loader2, MessageSquare } from "lucide-react";
import { Button } from "../ui/button";
import { UserButton } from "@clerk/nextjs";

export interface EditorHeaderProps {
  projectName: string;
  files: Record<string, string>;
  activeTab: EditorTabValue;
  onTabChange: (tab: EditorTabValue) => void;
  mobilePanel: "chat" | "content";
  onMobilePanelChange: (panel: "chat" | "content") => void;
  projectId: string;
  userPlan: "free" | "pro";
  creditsRemaining?: number;
  creditsTotal?: number;
  onRename: (newName: string) => void;
  onDelete: () => void;
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
}

export function EditorHeader({
  projectName,
  files,
  activeTab,
  onTabChange,
  mobilePanel,
  onMobilePanelChange,
  projectId,
  userPlan,
  creditsRemaining,
  creditsTotal,
  onRename,
  onDelete,
  deviceMode,
  onDeviceModeChange,
}: EditorHeaderProps) {
  const [isOpening, setIsOpening] = useState(false);

  async function handleOpenPreview() {
    alert("preview open is pending");
  }

  return (
  <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-1.5 sm:px-3">
    <div className="flex items-center gap-1.5 sm:gap-3">
      <Link
        href="/dashboard"
        className="shrink-0 transition-opacity duration-150 hover:opacity-80"
        aria-label="Go to dashboard"
      >
        <img
          src="/logo.svg"
          alt="Lovable Clone"
          className="size-6 sm:size-7"
        />
      </Link>
<div className="flex flex-col">
    
 <ProjectMenu
  projectName={projectName}
  projectId={projectId}
  creditsRemaining={creditsRemaining}
  creditsTotal={creditsTotal}
  userPlan={userPlan}
  onRename={onRename}
  onDelete={onDelete}
/>
  <span className="hidden px-1.5 text-xs text-muted-foreground sm:block">
    Previewing last saved version
  </span>
</div>


    </div>

<div className="hidden md:block absolute left-1/2 -translate-x-1/2">
  <EditorTabs activeTab={activeTab} onTabChange={onTabChange} />
   
   <div className="mx-auto md:hidden">
  <div className="flex items-center gap-0.5 rounded-full bg-secondary/60 p-1">
    {/* Chat tab */}
    <button
      onClick={() => onMobilePanelChange("chat")}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
        mobilePanel === "chat"
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <MessageSquare className="size-3" />
      Chat
    </button>

{/* Preview tab */}
<button
  onClick={() => {
    onTabChange("preview");
    onMobilePanelChange("content");
  }}
  className={cn(
    "flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
    mobilePanel === "content"
      ? "bg-foreground text-background shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  <Eye className="size-3" />
  Preview
</button>
</div>
</div>



</div>

<div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
  {activeTab === "preview" && (
    <div className="hidden md:flex items-center gap-1.5">
      <DeviceToggle deviceMode={deviceMode} onDeviceModeChange={onDeviceModeChange} />
    </div>
  )}


<Button
  variant="outline"
  size="sm"
  onClick={handleOpenPreview}
  disabled={isOpening}
  className="gap-1.5 text-xs"
  title="Open live preview in new tab"
>
  {isOpening ? (
    <Loader2 className="size-3.5 animate-spin" />
  ) : (
    <ExternalLink className="size-3.5" />
  )}
  <span className="hidden sm:inline">Preview</span>
</Button>


<Button 
variant="outline" 
size="sm" 
onClick={() => alert("Export is pending")}
>Export
</Button>




<UserButton
  afterSignOutUrl="/"
  appearance={{
    elements: {
      avatarBox: "size-6 sm:size-7",
    },
  }}
/>









</div>

  </header>
);
}

