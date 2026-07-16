import { Hono } from "hono";
import { AppVariables, Env } from "../types";
import {Webhook} from "svix";
import { downgradePlan, upgradePlan } from "../services/credits";

const webhooksRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();




interface ClerkBillingWebhookPayload {
  data: {
    id?: string;
    plan?: {
      id?: string;
      name?: string;
      slug?: string;
    };
    payer?: {
      user_id?: string;
      email?: string;
    };
    status?: string;
    payer_id?: string;
  };
  type: string;
  timestamp?: number;
}

webhooksRoutes.post("/", async (c) => {
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: "Missing Svix headers" }, 400);
  }

  const body = await c.req.text();
  const wh = new Webhook(c.env.CLERK_WEBHOOK_SECRET);

let event: ClerkBillingWebhookPayload;

try {
  event = wh.verify(body, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ClerkBillingWebhookPayload;
} catch (err) {
  console.error("Webhook verification failed:", err);
  return c.json({ error: "Invalid webhook signature" }, 400);
}


const eventType = event.type;
console.log("Webhook received:", `${eventType}`);

switch (eventType) {
  case "subscriptionItem.active": {
    const userId = event.data.payer?.user_id;
    const planSlug = event.data.plan?.slug;

    if (!userId) {
      console.error("Missing user ID in webhook payload");
      break;
    }

    if (planSlug === "pro") {
      console.log(`Upgrading user ${userId} to Pro Plan`);
      await upgradePlan(userId, c.env);
    }
    break;
  }

  case "subscriptionItem.canceled": {
    const userId = event.data.payer?.user_id;
    const planSlug = event.data.plan?.slug;
    console.log(`Downgrading user ${userId} to Free Plan`);
    break;
  }

  case "subscriptionItem.ended": {
    const userId = event.data.payer?.user_id;
    const planSlug = event.data.plan?.slug;
    if (!userId) {
      console.error("Missing user ID in webhook payload");
      break;
    }

    if (planSlug === "pro") {
      console.log(`Downgrading user ${userId} to Free Plan`);
      await downgradePlan(userId, c.env);
    }

    break;
  }

  case "subscriptionItem.pastDue":
  case "subscription.pastDue": {
    const userId = event.data.payer?.user_id || event.data.payer_id;
    console.warn(`Payment past due for user ${userId} — Clerk will retry`);
    break;
  }

  default:
    console.warn(`Unhandled webhook type: ${eventType}`);
}

return c.json({ received: true, type: eventType });
});

export { webhooksRoutes };