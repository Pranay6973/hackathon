import { Hono } from "hono";
import { AppVariables, Env } from "../types";
import { Project } from "../types/project";
import { ChatSession } from "../types/chat";
import { getCredits, UserCredits } from "../services/credits";

const creditsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/credits — Get the user's current credit balance

/*
 * Returns the authenticated user's credit balance, plan, and period info.
 * Triggers lazy period reset if the billing period has expired.
 *
 * Response shape:
 * {
 *   remaining: number,   // -1 means unlimited (Pro)
 *   total: number,       // 50 for free tier
 *   plan: "free" | "pro",
 *   periodEnd: string,   // ISO 8601 — when credits reset
 *   isUnlimited: boolean // convenience flag for the frontend
 * }
 */

  const UNLIMITED_CREDITS = -1;

creditsRoutes.get("/", async (c) => {
    const userId = c.var.userId;
    const credits = await getCredits(userId, c.env);

    return c.json({
        remaining: credits.remaining,
        total: credits.total,
        plan: credits.plan,
        periodStart: credits.periodStart,
        periodEnd: credits.periodEnd,
        isUnlimited: credits.remaining === -1,
    });


});


export async function deductCredits(
  userId: string,
  creditCost: number,
  env: Env,
): Promise<UserCredits> {
  const credits = await getCredits(userId, env);

  // Don't deduct from unlimited (Pro) users
  if (credits.remaining === UNLIMITED_CREDITS) {
    return credits;
  }

  credits.remaining = Math.max(0, credits.remaining - creditCost);
  await env.METADATA.put(
    `credits:${userId}`,
    JSON.stringify(credits),
  );

  return credits;
}



export { creditsRoutes };