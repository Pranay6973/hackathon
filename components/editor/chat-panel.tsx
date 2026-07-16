import { getModelById } from "@/lib/models";
import { ChatMessage, ImageAttachment } from "@/types/chat";
import React, { useEffect, useRef } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Code, MessageSquare, Sparkles } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { UpgradeCTA } from "./upgrade-cta";
import { ModelSelector } from "./model-selector";

export interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (message: string, images?: ImageAttachment[]) => void;
  creditsRemaining?: number;
  isCreditsExhausted?: boolean;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  userPlan: "free" | "pro";
}

export function ChatPanel({
  messages = [],
  isStreaming,
  onSendMessage,
  creditsRemaining,
  isCreditsExhausted,
  selectedModelId,
  onModelChange,
  userPlan,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedModel = getModelById(selectedModelId);
  const supportsVision = selectedModel?.supportsVision ?? false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

return (
  <div className="flex h-full flex-col bg-background">
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col gap-5 p-4">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            {/* Glow icon */}
            <div className="relative mb-5">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <Sparkles className="size-7 text-primary" />
              </div>
            </div>

            <h3 className="text-base font-semibold text-foreground">
              What do you want to build?
            </h3>

            <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
              Describe your app and the AI will generate working code with a live preview.
            </p>

{/* Suggestion chips */}
<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
  {[
    { icon: Code, label: "A landing page" },
    { icon: MessageSquare, label: "A chat app" },
  ].map((suggestion) => (
    <button
      key={suggestion.label}
      onClick={() => onSendMessage(suggestion.label)}
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
    >
      <suggestion.icon className="size-3" />
      {suggestion.label}
    </button>
  ))}
</div>

  </div>
)}

{messages.map((message, index) => (
  <MessageBubble
    key={message.id}
    message={message}
    isStreaming={
      isStreaming &&
      message.role === "assistant" &&
      index === messages.length - 1
    }
    isAutoHealInProgress={
      isStreaming &&
      message.role === "user" &&
      index === messages.length - 2
    }
  />
))}



</div>


</ScrollArea>




{isCreditsExhausted && (
  <div className="border-t border-border p-3">
    <UpgradeCTA reason="You've used all 50 free messages this month." />
  </div>
)}


{
  !isCreditsExhausted && (
  <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
    <div className="px-3 pt-2">
      <ModelSelector
        selectedModelId={selectedModelId}
        onModelChange={onModelChange}
        userPlan={userPlan}
        disabled={isStreaming}
      />
    </div>
  <ChatInput
  onSend={onSendMessage}
  isStreaming={isStreaming}
  creditsRemaining={creditsRemaining}
  isCreditsExhausted={isCreditsExhausted}
  supportsVision={supportsVision}
/>
</div>
)}


</div>
);
}


        