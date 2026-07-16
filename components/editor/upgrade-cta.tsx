"use client";

import { Check, Link, Zap } from "lucide-react";
import { Button } from "../ui/button";

export interface UpgradeCTAProps {
  reason: string;
  resetDays?: number;
}

const PRO_FEATURES = [
  "Unlimited AI messages",
  "All AI models (Claude Sonnet, GPT-4o)",
  "Unlimited projects",
  "ZIP export",
] as const;

export function UpgradeCTA({ reason, resetDays }: UpgradeCTAProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header with lightning icon */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <Zap className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Upgrade to Pro</h3>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </div>
      </div>

      {/* Feature list */}
      <ul className="mb-4 space-y-1.5">
        {PRO_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs">
            <Check className="size-3 text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
<Button size="sm" className="w-full gap-1.5 text-xs" asChild>
  <Link href="/pricing">
    <Zap className="size-3" />
    Upgrade for $25/mo
  </Link>
</Button>

{/* Reset note */}
{resetDays !== undefined && resetDays > 0 && (
  <p className="mt-2 text-center text-xs text-muted-foreground">
    Credits reset in {resetDays} day{resetDays !== 1 ? "s" : ""}
  </p>
)}
</div>
);
}