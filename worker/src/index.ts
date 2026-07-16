import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env, AppVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import { projectRoutes } from "./routes/project";
import { chatRoutes } from "./routes/chat";
import { versionsRoutes } from "./routes/versions";
import { creditsRoutes } from "./routes/credits";
import { webhooksRoutes } from "./routes/webhooks";
import { billingRoutes } from "./routes/billing";


const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", async (c, next) => {
  const allowedOrigins = c.env.FRONTEND_URL || "http://localhost:3000";

  const middleware = cors({
    origin: [allowedOrigins],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
    credentials: true,
  });

  return middleware(c, next);
});



app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.route("/webhooks/clerk-billing", webhooksRoutes)

app.use("/api/*",authMiddleware);

app.route("/api/projects", projectRoutes);

app.route("/api/chat", chatRoutes);

app.route("/api/credits", creditsRoutes);

app.route("/api/projects/:id/versions", versionsRoutes);

app.route("/api/billing", billingRoutes)



export default app;


