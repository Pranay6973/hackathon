console.log("🔥 CHAT ROUTES LOADED");

import { Hono } from "hono";
import { AppVariables, Env } from "../types";
import type { Project, ProjectFile, Version } from "../types/project";
import type { ChatMessage, ChatSession, ImageAttachment } from "../types/chat";
import { sanitizeChatMessage } from "../services/sanitize";
import { DEFAULT_MODEL, getModel, MODEL_REGISTRY } from "../ai/providers";
import { checkCredits } from "../services/credits";
import { buildSystemPrompt, prepareChatHistory } from "../ai/system-prompt";
import { ModelMessage, streamText } from "ai";
import { streamSSE } from "hono/streaming";
import { extractExplanation, mergeFiles, parseFilesFromResponse } from "../ai/file-parser";
import { deductCredits } from "./credits";


export const chatRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();


// GET /api/chat/:projectId — Get chat history

/*
 * Returns the chat history for a project.
 * Used by the editor page to restore chat messages on mount.
 */

chatRoutes.get("/:projectId", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("projectId");

  const project = await c.env.METADATA.get<Project>(
    `projects:${projectId}`,
    "json"
  );

  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }

  if (project.userId !== userId) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 403);
  }

  const chatHistory = await c.env.METADATA.get<ChatSession>(
    `chat:${projectId}`,
    "json"
  );

  return c.json({ messages: chatHistory?.messages || [] });
});





chatRoutes.post("/:projectId", async (c) => { 
  console.log("CHAT POST HIT")
  const userId = c.var.userId;
  const projectId = c.req.param("projectId");
  const body = await c.req.json<{
    message: string;
    model?: string;
    images?: ImageAttachment[];
  }>();

  const userMessage = sanitizeChatMessage(body.message || "");
if (!userMessage) {
  return c.json(
    { error: "Message cannot be empty", code: "VALIDATION_ERROR" },
    400,
  );
}

const modelId = body.model || DEFAULT_MODEL;

const images = body.images || [];
if (images.length > 5) {
  return c.json(
    { error: "Maximum 5 images allowed", code: "VALIDATION_ERROR" },
    400,
  );
}

for (const img of images) {
  const sizeInBytes = (img.base64.length * 3) / 4;
  if (sizeInBytes > 4 * 1024 * 1024) {
    return c.json(
      { error: "Each image must be under 4MB", code: "VALIDATION_ERROR" },
      400,
    );
  }
}

const modelConfig = MODEL_REGISTRY[modelId];
if (!modelConfig) {
  return c.json({ error: "Invalid model selected", code: "INVALID_MODEL" }, 400);
}

// Ownership check
const project = await c.env.METADATA.get<Project>(
  `projects:${projectId}`,
  "json",
);

if (!project) {
  return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
}

if (project.userId !== userId) {
  return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 403);
}

const creditCheck = await checkCredits(userId, modelConfig.creditCost, c.env);
if (modelConfig.tier === "premium" && creditCheck.credits.plan === "free") {
  return c.json(
    {
      error: "This model is only available for Pro users",
      code: "PREMIUM_MODEL_LOCKED",
      plan: creditCheck.credits.plan,
    },
    403,
  );
}

if (!creditCheck.allowed) {
  return c.json(
    {
      error: "You have exhausted your credits",
      code: "CREDITS_EXHAUSTED",
      remaining: creditCheck.credits.remaining,
      required: modelConfig.creditCost,
    },
    402,
  );
}


const versionKey = `${projectId}/v${project.currentVersion}/files.json`;
const versionObject = await c.env.FILES.get(versionKey);

let existingFiles: ProjectFile[] = [];

if (versionObject) {
  const versionData = (await versionObject.json()) as Version;
  existingFiles = versionData.files || [];
}



const chatSession = await c.env.METADATA.get<ChatSession>(
  `chat:${projectId}`,
  "json",
);

const chatHistory = chatSession?.messages || [];

const systemPrompt = buildSystemPrompt(existingFiles);

const rawMessages: Array<{ role: "user" | "assistant"; content: string }> =
  [];

for (const msg of chatHistory) {
  if (msg.role === "system") continue;
  rawMessages.push({ role: msg.role, content: msg.content });
}


const trimmedHistory = prepareChatHistory(rawMessages);

const sdkMessages: ModelMessage[] = trimmedHistory.map((msg) =>
  msg.role === "user"
    ? { role: "user", content: msg.content }
    : { role: "assistant", content: msg.content },
);


// Append current user message - multimodal if images + vision model
if (images.length > 0 && modelConfig.supportsVision) {
  sdkMessages.push({
    role: "user" as const,
    content: [
      { type: "text" as const, text: userMessage },
      ...images.map((img) => ({
        type: "image" as const,
        image: img.base64, // AI SDK field name (was: base64)
        mimeType: img.mediaType, // AI SDK field name (was: mediaType)
      })),
    ],
  });
} else {
  sdkMessages.push({ role: "user" as const, content: userMessage });
}

// --- 7. Stream the AI response ---
return streamSSE(c, async (stream) => {
  let fullResponse = "";
  let eventId = 0;
  let isSuccess = false;

  try {
    // Get the AI SDK model instance for the selected model
    const model = getModel(modelId, c.env);

    // streamText returns immediately - streaming happens when we iterate textStream
    const result = streamText({
      model,
      system: systemPrompt,
      messages: sdkMessages,
      maxOutputTokens: modelConfig.maxOutputTokens,
    });

   // Iterate the text stream - each chunk is forwarded as our custom SSE event
// This replaces the onChunk callback pattern from our custom providers
for await (const chunk of result.textStream) {
  fullResponse += chunk;

  if (chunk && chunk.trim().length > 0) {
    isSuccess = true; // ✅ ADD THIS
  }
  await stream.writeSSE({
    event: "chunk",
    data: JSON.stringify({ text: chunk }),
    id: String(eventId++),
  });
}

// --- 8. Parse files from the complete response ---
const parsedFiles = parseFilesFromResponse(fullResponse);
const changedFilePaths = parsedFiles.map((f) => f.path);
console.log(`[Chat] Parsed ${parsedFiles.length} files from AI response`);

// If the AI returned no files, just send the text as explanation
// This handles cases where the AI only provides advice without code
const mergedFiles =
  parsedFiles.length > 0
    ? mergeFiles(existingFiles, parsedFiles)
    : existingFiles;

// --- 9. Store new version in R2 (only if files changed) ---
let newVersionNumber = project.currentVersion;

if (parsedFiles.length > 0) {
  newVersionNumber = project.currentVersion + 1;
  console.log(
    `[Chat] Creating version v${newVersionNumber} with ${mergedFiles.length} files`,
  );


  const newVersion: Version = {
  versionNumber: newVersionNumber,
  prompt: userMessage,
  model: modelId,
  files: mergedFiles,
  changedFiles: changedFilePaths,
  type: "ai",
  createdAt: new Date().toISOString(),
  fileCount: mergedFiles.length,
};

try {
  await c.env.FILES.put(
    `${projectId}/v${newVersionNumber}/files.json`,
    JSON.stringify(newVersion),
  );

  console.log(
    `[Chat] R2 put SUCCESS: ${projectId}/v${newVersionNumber}/files.json`,
  );
} catch (r2Error) {
  console.error("[Chat] R2 put FAILED:", r2Error);
  throw r2Error;
}

// Update project metadata
project.currentVersion = newVersionNumber;
project.updatedAt = new Date().toISOString();

try {
  await c.env.METADATA.put(
    `project:${projectId}`,
    JSON.stringify(project),
  );

  console.log(
    `[Chat] KV put SUCCESS: project:${projectId} (v${newVersionNumber})`,
  );
} catch (kvError) {
  console.error("[Chat] KV put FAILED (project metadata):", kvError);
  throw kvError;
}
}

// --- 10. Deduct credits after successful generation ---
let updatedCredits: { remaining: number } | null = null;

if (isSuccess && fullResponse.trim().length > 0) {
  updatedCredits = await deductCredits(
    userId,
    modelConfig.creditCost,
    c.env,
  );

  console.log(
    `[Chat] Credits deducted. Remaining: ${updatedCredits.remaining}`,
  );
} else {
  console.log("[Chat] No credits deducted (AI failed)");
}
// --- 11. Save chat messages to KV ---
const explanationText = extractExplanation(fullResponse);

const newUserMessage: ChatMessage = {
  id: `msg_${Date.now()}_user`,
  role: "user",
  content: userMessage,
  timestamp: new Date().toISOString(),
  images: images.length > 0 ? images : undefined,
};

const newAssistantMessage: ChatMessage = {
  id: `msg_${Date.now()}_assistant`,
  role: "assistant",
  content: explanationText,
  timestamp: new Date().toISOString(),
  versionNumber: parsedFiles.length > 0 ? newVersionNumber : undefined,
  model: modelId,
  changedFiles: parsedFiles.length > 0 ? changedFilePaths : undefined,
};

const updatedChatSession: ChatSession = {
  projectId,
  messages: [...chatHistory, newUserMessage, newAssistantMessage],
  createdAt: chatSession?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

try {
  await c.env.METADATA.put(
    `chat:${projectId}`,
    JSON.stringify(updatedChatSession),
  );

  console.log(
    `[Chat] KV put SUCCESS: chat:${projectId} (${updatedChatSession.messages.length} messages)`,
  );
} catch (kvError) {
  console.error("[Chat] KV put FAILED (chat history):", kvError);
  throw kvError;
}

// Send parsed files so the client can update Sandpack + Monaco
if (parsedFiles.length > 0) {
  await stream.writeSSE({
    event: "files",
    data: JSON.stringify({ files: mergedFiles }),
    id: String(eventId++),
  });
}

// Send done event with metadata
await stream.writeSSE({
  event: "done",
  data: JSON.stringify({
    versionId: `v${newVersionNumber}`,
    model: modelId,
    changedFiles: changedFilePaths,
    creditsRemaining: updatedCredits?.remaining,
  }),
  id: String(eventId++),
});
} catch (error) {
  // Error handling with categorized messages
  const rawError =
    error instanceof Error ? error.message : "Unknown error occurred";

  console.error("Chat generation error:", rawError);


  // Categorize the error for a user-friendly message
let userMessage: string;
let errorCode: string;

if (rawError.includes("429") || rawError.includes("rate limit")) {
  userMessage = "Too many requests. Please wait a moment and try again.";
  errorCode = "RATE_LIMITED";
} else if (rawError.includes("401") || rawError.includes("api key")) {
  userMessage = "AI service configuration error. Please contact support.";
  errorCode = "AUTH_FAILED";
} else if (
  rawError.includes("500") ||
  rawError.includes("503") ||
  rawError.includes("unavailable")
) {
  userMessage =
    "The AI service is temporarily unavailable. Please try again.";
  errorCode = "SERVICE_UNAVAILABLE";
} else if (rawError.includes("timeout") || rawError.includes("TIMEOUT")) {
  userMessage = "Generation timed out. Please try a simpler request.";
  errorCode = "TIMEOUT";
} else {
  userMessage = "Failed to generate code. Please try again.";
  errorCode = "GENERATION_FAILED";
}


await stream.writeSSE({
  event: "error",
  data: JSON.stringify({
    message: userMessage,
    code: errorCode,
  }),
  id: String(eventId++),
});
}
});
});



