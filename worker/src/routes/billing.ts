import { Hono } from "hono";
import { AppVariables, Env } from "../types";
import { downgradePlan, upgradePlan } from "../services/credits";

const billingRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

billingRoutes.get("/plan-change", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{ action: "upgrade" | "downgrade" }>();
  if (!body.action) {
    return c.json({ error: "Missing action" }, 400);
  }

  let credits;

  if (body.action === "upgrade") {
    credits = await upgradePlan(userId, c.env);
  } else {
    credits = await downgradePlan(userId, c.env);
  }


 return c.json({
  success: true,
  credits: {
    remaining: credits.remaining,
    total: credits.total,
    plan: credits.plan,
    periodEnd: credits.periodEnd,
    isUnlimited: credits.remaining === -1,
  },
});
});

export { billingRoutes };