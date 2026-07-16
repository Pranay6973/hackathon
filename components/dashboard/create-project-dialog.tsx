"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";


const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-2-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2-pro", label: "Gemini 2.0 Pro" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-3.5", label: "Claude Haiku 3.5" },
  { value: "deepseek-v3", label: "DeepSeek V3" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
] as const;

export interface CreateProjectData {
  name: string;
  description: string;
  model: string;
}

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectData) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState<string>(AI_MODELS[0].value);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSubmit({ name: trimmedName, description: description.trim(), model });

    setName("");
    setDescription("");
    setModel(AI_MODELS[0].value);
  }

  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogDescription>
          Give you project a name and describe what you want to build. Your description will be sent as the first AI prompt.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name" className="text-sm font-medium">
            Project Name
          </Label>
          <Input
            id="project-name"
            placeholder="My awesome app"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
  <Label htmlFor="ai-model" className="text-sm font-medium">
    AI Model
  </Label>
  <Select value={model} onValueChange={setModel}>
    <SelectTrigger id="ai-model">
      <SelectValue placeholder="Select a model" />
    </SelectTrigger>
    <SelectContent>
      {AI_MODELS.map((aiModel) => (
        <SelectItem key={aiModel.value} value={aiModel.value}>
          {aiModel.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>


<div className="space-y-2">
  <Label
    htmlFor="project-description"
    className="text-sm font-medium"
  >
    Description
  </Label>
  <Textarea
    id="project-description"
    placeholder="Describe the app you want to build, e.g. 'A todo app with categories and dark mode.'"
    value={description}
    onChange={(event) => setDescription(event.target.value)}
    rows={3}
  />
</div>

<DialogFooter>
  <Button
    type="button"
    variant="outline"
    onClick={() => onOpenChange(false)}
  >
    Cancel
  </Button>
  <Button
    type="submit"
    disabled={!name.trim() || !description.trim()}
  >
    Create
  </Button>
</DialogFooter>


      </form>
    </DialogContent>
  </Dialog>
);
}