import { createApiClient } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { CreditCard, Link, Zap, Infinity } from "lucide-react";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { CheckoutButton } from "@clerk/nextjs/experimental";



const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ?? "";

interface CreditsData {
  remaining: number;
  total: number;
  plan: "free" | "pro";
  periodEnd: string;
  isUnlimited: boolean;
}

function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}


export function CreditsDisplay() {
  const { getToken } = useAuth();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const client = createApiClient(getToken);
        const data = await client.credits.get();
        setCredits(data);
      } catch {
        console.error("Failed to fetch credits");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredits();
}, []);

if (isLoading) {
  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-2 h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}


if (!credits) {
  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
        <CreditCard className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Credits unavailable</p>
      </div>
    </div>
  );
}

const isPro = credits.plan === "pro";
const isExhausted = !isPro && credits.remaining === 0;
const progressPercent = isPro
  ? 100
  : (credits.remaining / credits.total) * 100;
const resetDays = daysUntil(credits.periodEnd);


return (
  <div className="px-3 pb-3">
    <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
      {/* Header row: icon + plan label */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">Credits</span>
        </div>
        {isPro && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Infinity className="size-3" />
            Unlimited
          </span>
        )}
      </div>


{/* Progress bar (free users only) */}
{!isPro && (
  <>
    <Progress
      value={progressPercent}
      className={cn(
        "mb-1.5 h-1.5",
        isExhausted && "[&>div]:bg-destructive",
      )}
    />
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span className={cn(isExhausted && "font-medium text-destructive")}>
        {credits.remaining}/{credits.total}
      </span>
      <span>Resets in {resetDays}d</span>
    </div>
  </>
)}


{/* Plan label */}
<p className="mt-1.5 text-xs text-muted-foreground">
  {isPro ? "Pro Plan" : "Free Plan"}
</p>

{/* CTA button */}
{isPro ? (
  <Button
    variant="ghost"
    size="sm"
    className="mt-2 h-7 w-full text-xs text-muted-foreground"
    asChild
  >
    <Link href="/settings">Manage subscription</Link>
  </Button>
) : (
  <CheckoutButton planId={PRO_PLAN_ID} planPeriod="month">
    <Button size="sm" className="mt-2 h-7 w-full gap-1 text-xs">
      <Zap className="size-3" />
      Upgrade to Pro
    </Button>
  </CheckoutButton>
)}
</div>
</div>
);
}

