import { Env } from "../types";

export interface UserCredits {
  remaining: number;
  total: number;
  plan: "free" | "pro";
  periodStart: string;
  periodEnd: string;
}

const DEFAULT_FREE_CREDITS = 50;

const UNLIMITED_CREDITS = -1;

export const FREE_PROJECT_LIMIT = 3;

function createBillingPeriod(): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    periodStart: now.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

async function checkAndResetPeriod(
  credits: UserCredits,
  userId: string,
  env: Env,
): Promise<UserCredits> {
  const now = new Date();
  const periodEnd = new Date(credits.periodEnd);

  if (now < periodEnd) {
    return credits;
  }

  const newPeriod = createBillingPeriod();

  const resetCredits: UserCredits = {
    ...credits,
    remaining:
      credits.plan === "free" ? DEFAULT_FREE_CREDITS : UNLIMITED_CREDITS,
    periodStart: newPeriod.periodStart,
    periodEnd: newPeriod.periodEnd,
  };

  await env.METADATA.put(
    `credits:${userId}`,
    JSON.stringify(resetCredits)
  );

  return resetCredits;
}

export async function getCredits(
  userId: string,
  env: Env,
): Promise<UserCredits> {
  const credits = await env.METADATA.get<UserCredits>(
    `credits:${userId}`,
    "json",
  );

  if (credits) {
    return checkAndResetPeriod(credits, userId, env);
  }

  return initializeCredits(userId, env,"free");
}

export async function initializeCredits(
  userId: string,
  env: Env,
  plan: "free" | "pro",
): Promise<UserCredits> {
  const period = createBillingPeriod();

  const newCredits: UserCredits = {
    remaining: plan === "free" ? DEFAULT_FREE_CREDITS : UNLIMITED_CREDITS,
    total: DEFAULT_FREE_CREDITS,
    plan,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  };

  await env.METADATA.put(
    `credits:${userId}`,
    JSON.stringify(newCredits)
  );

  return newCredits;
}


export async function checkCredits(
  userId: string,
  
  creditCost: number,
  env: Env,
): Promise<{ allowed: boolean; credits: UserCredits }> {
  const credits = await getCredits(userId, env);

  if (credits.remaining === UNLIMITED_CREDITS) {
    return { allowed: true, credits };
  }

  return {
    allowed: credits.remaining >= creditCost,
    credits,
  };
}

// export async function deductCredits(
//   userId: string,
//   creditCost: number,
//   env: Env,
// ): Promise<UserCredits> {
//   const credits = await getCredits(userId, env);

//   // Don't deduct from unlimited (Pro) users
//   if (credits.remaining === UNLIMITED_CREDITS) {
//     return credits;
//   }

//   credits.remaining = Math.max(0, credits.remaining - creditCost);
//   await env.METADATA.put(`credits:${userId}`, JSON.stringify(credits));

//   return credits;
// }

export async function upgradePlan(
  userId: string,
  env: Env,
): Promise<UserCredits> {
  const credits = await getCredits(userId, env);

  const upgraded: UserCredits = {
    ...credits,
    remaining: UNLIMITED_CREDITS,
    plan: "pro",
  };

  await env.METADATA.put(`credits:${userId}`, JSON.stringify(upgraded));

  return upgraded;
}


export async function downgradePlan(
  userId: string,
  env: Env,
): Promise<UserCredits> {
  const period = createBillingPeriod();
  const downgraded: UserCredits = {
    remaining: DEFAULT_FREE_CREDITS,
    total: DEFAULT_FREE_CREDITS,
    plan: "free",
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  };

  await env.METADATA.put(`credits:${userId}`, JSON.stringify(downgraded));

  return downgraded;
}

