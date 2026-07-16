import { FolderOpen } from "lucide-react";
import { Button } from "../ui/button";

export interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <FolderOpen className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No Projects yet</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Create your first project to start building with AI. Describe your idea and watch it come to life.
      </p>
      <Button className="mt-6" onClick={onCreateProject}>
        Create Project
      </Button>
    </div>
  );
}