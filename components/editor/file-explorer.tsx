"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useState } from "react";

interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
}

export interface FileExplorerProps {
  files: Record<string, string>;
  activeFile: string;
  onFileSelect: (filePath: string) => void;
}

function buildFileTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of files) {
    const parts = filePath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
  const part = parts[i];
  const isFile = i === parts.length - 1;

  let existingNode = currentLevel.find(node => node.name === part);

  if (!existingNode) {
    existingNode = isFile ? { name: part, path: filePath } : { name: part, children: [] };
    currentLevel.push(existingNode);
  }

  if (!isFile && existingNode.children) {
    currentLevel = existingNode.children;
  }
}
}


function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    const aIsFolder = !!a.children;
    const bIsFolder = !!b.children;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });
}


function sortRecursively(nodes: TreeNode[]): TreeNode[] {
  const sorted = sortTree(nodes);
  for (const node of sorted) {
    if (node.children) {
      node.children = sortRecursively(node.children);
    }
  }
  return sorted;
}

return sortRecursively(root);
}


interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string;
  onFileSelect: (filePath: string) => void;
}


function TreeNodeItem({
  node,
  depth,
  activeFile,
  onFileSelect,
}: TreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = !!node.children;
  const isActive = node.path === activeFile;

  if (isFolder) {
  return (
    <div>
      {/* Folder row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted-foreground"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        <Folder className="size-3.5 shrink-0 text-blue-400" />
        <span className="truncate">{node.name}</span>
      </button>
      

      {/* Folder children (collapsible) */}
{isOpen &&
  node.children?.map((child) => (
    <TreeNodeItem
      key={child.path ?? child.name}
      node={child}
      depth={depth + 1}
      activeFile={activeFile}
      onFileSelect={onFileSelect}
    />
  ))}
</div>
);
}



// File row
return (
  <button
    onClick={() => node.path && onFileSelect(node.path)}
    className={cn(
      "flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors duration-150",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    )}
    style={{ paddingLeft: `${depth * 12 + 6}px` }}
  >
    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
    <span className="truncate">{node.name}</span>
  </button>
);
}



export function FileExplorer({
  files,
  activeFile,
  onFileSelect,
}: FileExplorerProps) {
  const filePaths = Object.keys(files);
  const tree = buildFileTree(filePaths);


  return (
  <div className="flex h-full flex-col border-r border-border bg-background">
    {/* Header */}
    <div className="flex h-10 items-center px-3 border-b border-border">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Files
      </span>
    </div>

    
    {/* Tree view */}
<div className="flex-1 overflow-y-auto p-2">
  {tree.map((node) => (
    <TreeNodeItem
      key={node.path ?? node.name}
      node={node}
      depth={0}
      activeFile={activeFile}
      onFileSelect={onFileSelect}
    />
  ))}
</div>
</div>
);
}
