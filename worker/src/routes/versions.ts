import { Hono } from "hono";
import { AppVariables, Env } from "../types";
import { Project, ProjectFile, Version, VersionMeta } from "../types/project";
import { ChatMessage, ChatSession } from "../types/chat";

const versionsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();


// Helper: Verify project ownership

/** 
 * Fetches a project from KV and verifies the requesting user owns it.
 * Returns the project if valid, or null with an error response.
 *
 * @param projectId - The project ID to look up
 * @param userId - The authenticated user's ID
 * @param env - Worker environment bindings
 * @returns The project if owned by the user, null otherwise
 */


async function getOwnedProject(
  projectId: string,
  userId: string,
  env: Env
): Promise<Project | null> {
  const project = await env.METADATA.get<Project>(
    `project:${projectId}`,
    "json"
  );

  if (!project || project.userId !== userId) {
    return null;
  }

  return project;
}

/**
 * Extracts version metadata from a full Version object.
 * Strips the files array to create a lightweight VersionMeta
 * suitable for the timeline listing.
 *
 * @param version - Full version object from R2
 * @returns VersionMeta without files array
 */
function toVersionMeta(version: Version): VersionMeta {
  return {
    versionNumber: version.versionNumber,
    type: version.type,
    prompt: version.prompt,
    model: version.model,
    createdAt: version.createdAt,
    fileCount: version.fileCount ?? version.files?.length ?? 0,
    changedFiles: version.changedFiles,
    restoredFrom: version.restoredFrom,
  };
}


// GET /api/projects/:id/versions — List all versions with metadata

/*
 * Returns metadata for all versions of a project, sorted newest first.
 * Scans R2 for all version objects under the project prefix,
 * fetches each one, and strips the files array to keep the response lean.
 *
 * Response: { versions: VersionMeta[], currentVersion: number }
 */







versionsRoutes.get("/", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");

  if (!projectId) {
    return c.json({ error: "Project ID is required", code: "BAD_REQUEST" }, 400);
  }

  const project = await getOwnedProject(projectId, userId, c.env);
  if (!project) {
    return c.json(
      { error: "Project not found or access denied", code: "NOT_FOUND" },
      404
    );
  }


  const versionPromises: Promise<Version | null>[] = [];

for (let v = 0; v <= project.currentVersion; v++) {
  versionPromises.push(
    c.env.FILES.get(`${projectId}/v${v}/files.json`)
      .then((obj) => (obj ? obj.json() as Promise<Version> : null))
      .catch(() => null),
  
    );
}

const versions = await Promise.all(versionPromises);

const versionMetas: VersionMeta[] = versions
  .filter((v): v is Version => v !== null)
  .map(toVersionMeta)
  .sort((a, b) => b.versionNumber - a.versionNumber);

return c.json({
  versions: versionMetas,
  currentVersion: project.currentVersion,
});

});

// GET /api/projects/:id/versions/:v - Get files for a specific version
//
// Returns the full file contents for a specific version.
// Used when the user clicks a version in the timeline to preview it.
//
// Response: { files: ProjectFile[], versionNumber: number, meta: VersionMeta }


versionsRoutes.get("/:v", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id")!;
  const versionNumber = parseInt(c.req.param("v"), 10);

  if (isNaN(versionNumber) || versionNumber < 0) {
    return c.json(
      { error: "Invalid version number", code: "BAD_REQUEST" },
      400,
    );
  }

  const project = await getOwnedProject(projectId, userId, c.env);
if (!project) {
  return c.json(
    { error: "Project not found or access denied", code: "NOT_FOUND" },
    404,
  );
}

if (versionNumber > project.currentVersion) {
  return c.json(
    { error: "Version number exceeds current version", code: "BAD_REQUEST" },
    400,
  );
}


const versionObj = await c.env.FILES.get(
  `${projectId}/v${versionNumber}/files.json`
);

if (!versionObj) {
  return c.json(
    { error: "Version not found", code: "NOT_FOUND" },
    404,
  );
}


const version = (await versionObj.json()) as Version;

return c.json({
  files: version.files,
  versionNumber: version.versionNumber,
  meta: toVersionMeta(version),
});
});


// GET /api/projects/:id/versions/v1/diff/v2 - Diff between two versions
//
// Computes the diff between two versions of a project.
// Compares file-by-file and categorizes each as added, removed, or modified.
// Unchanged files are excluded from the response.
//
// Response: { from: number, to: number, changes: DiffChange[] }

versionsRoutes.get("/v1/diff/:v2", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");
  const v1 = parseInt(c.req.param("v1")!, 10);
  const v2 = parseInt(c.req.param("v2")!, 10);

  if (
    [v1, v2].some((v) => isNaN(v) || v < 0) ||
    v1 === v2
  ) {
    return c.json(
      { error: "Invalid version numbers", code: "BAD_REQUEST" },
      400,
    );
  }

  if (!projectId) {
    return c.json({ error: "Project ID is required", code: "BAD_REQUEST" }, 400);
  }

  const project = await getOwnedProject(projectId, userId, c.env);
if (!project) {
  return c.json(
    { error: "Project not found or access denied", code: "NOT_FOUND" },
    404,
  );
}

const [obj1, obj2] = await Promise.all([
  c.env.FILES.get(`${projectId}/v${v1}/files.json`),
  c.env.FILES.get(`${projectId}/v${v2}/files.json`),
]);


if (!obj1 || !obj2) {
  return c.json({ error: "One or both versions not found", code: "NOT_FOUND" }, 404);
}

const [version1, version2] = await Promise.all([
  obj1.json() as Promise<Version>,
  obj2.json() as Promise<Version>,
]);


const fileMap1 = new Map<string, string>(version1.files.map((f) => [f.path, f.content]));
const fileMap2 = new Map<string, string>(version2.files.map((f) => [f.path, f.content]));


const changes: Array<{
  path: string;
  type: "added" | "removed" | "modified";
  oldContent?: string | null;
  newContent?: string | null;
}> = [];


for (const [path, content] of fileMap2) {
  const oldContent = fileMap1.get(path);

  if (oldContent === undefined) {
    changes.push({
      path,
      type: "added",
      newContent: content,
      oldContent: null,
    });
  } else if (oldContent !== content) {
  changes.push({
    path,
    type: "modified",
    newContent: content,
    oldContent,
  });
}
}
for (const [path, content] of fileMap1) {
  if (!fileMap2.has(path)) {
    changes.push({
      path,
      type: "removed",
      oldContent: content,
      newContent: null,
    });
  }
}

changes.sort((a, b) => {
  const order = { modified: 0, added: 1, removed: 2 };
  return order[a.type] - order[b.type];
});

return c.json({
  from: v1,
  to: v2,
  changes,
});
});

// POST /api/projects/:id/versions/:v/restore - Restore a previous version
//
// Restores a previous version by creating a new version with its files.
// Non-destructive — the old versions remain intact and the restore
// is recorded as a new entry in the timeline.
//
// Response: { version: VersionMeta, files: ProjectFile[] }

versionsRoutes.post("/:v/restore", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id")!;
  const restoreFrom = parseInt(c.req.param("v"), 10);

  if (isNaN(restoreFrom) || restoreFrom < 0) {
    return c.json(
      { error: "Invalid version number", code: "BAD_REQUEST" },
      400,
    );
  }

  const project = await getOwnedProject(projectId, userId, c.env);
  if (!project) {
    return c.json(
      { error: "Project not found or access denied", code: "NOT_FOUND" },
      404,
    );
  }

if (restoreFrom > project.currentVersion) {
  return c.json(
    { error: "Version number exceeds current version", code: "BAD_REQUEST" },
    400,
  );
}

const sourceObj = await c.env.FILES.get(
  `${projectId}/v${restoreFrom}/files.json`
);

if (!sourceObj) {
  return c.json({ error: "Version not found", code: "NOT_FOUND" }, 404);
}

const sourceVersion = (await sourceObj.json()) as Version;

const newVersionNumber = project.currentVersion + 1;
const newVersion: Version = {
  versionNumber: newVersionNumber,
  type: "restore",
  prompt: `Restored from version ${restoreFrom}`,
  model: sourceVersion.model,
  createdAt: new Date().toISOString(),
  files: sourceVersion.files,
  fileCount: sourceVersion.files.length,
  changedFiles: sourceVersion.files.map((f) => f.path),
  restoredFrom: restoreFrom,
};

project.currentVersion = newVersionNumber;
project.updatedAt = newVersion.createdAt;

await Promise.all([
  c.env.FILES.put(
    `${projectId}/v${newVersionNumber}/files.json`,
    JSON.stringify(newVersion),
  ),
  c.env.METADATA.put(`project:${projectId}`, JSON.stringify(project)),
]);


try {
  const chatKey = `chat:${projectId}`;
  const chatSession = await c.env.METADATA.get<ChatSession>(chatKey, "json");

  const systemMessage: ChatMessage = {
    id: `msg-${Date.now()}-system`,
    role: "system",
    content: `Restored to version ${restoreFrom}`,
    timestamp: new Date().toISOString(),
  };


  
if (chatSession) {
  chatSession.messages.push(systemMessage);
  chatSession.updatedAt = new Date().toISOString();
  await c.env.METADATA.put(chatKey, JSON.stringify(chatSession));
} else {
  // No existing chat session — create one with just the system message
  const newSession: ChatSession = {
    projectId,
    messages: [systemMessage],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await c.env.METADATA.put(chatKey, JSON.stringify(newSession));
}


} catch {
  // Non-critical — the frontend already shows the message locally
  console.error("Failed to persist restore system message to chat");
}

return c.json({
  version: toVersionMeta(newVersion),
  files: newVersion.files,
});
});


// POST /api/projects/:id/versions - Save a manual edit as a new version
//
// Creates a new version from manually edited files.
// Used by the auto-save feature when the user edits code in Monaco.
//
// Request body: { files: ProjectFile[] }
// Response: { version: VersionMeta }

versionsRoutes.post("/", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id")!;

  const project = await getOwnedProject(projectId, userId, c.env);
  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }


  const body = await c.req.json<{ files: ProjectFile[] }>();
if (!body.files || !Array.isArray(body.files)) {
  return c.json(
    { error: "Files array is required", code: "VALIDATION_ERROR" },
    400,
  );
}

// Load the current version to compute changedFiles
const currentObject = await c.env.FILES.get(
  `${projectId}/v${project.currentVersion}/files.json`,
);

let changedFiles: string[] = [];

if (currentObject) {
  const currentVersion = (await currentObject.json()) as Version;
  const currentFileMap = new Map<string, string>();
  for (const file of currentVersion.files) {
    currentFileMap.set(file.path, file.content);
  }

  // Find files that changed
for (const file of body.files) {
  const oldContent = currentFileMap.get(file.path);
  if (oldContent === undefined || oldContent !== file.content) {
    changedFiles.push(file.path);
  }
}

// Find files that were removed
for (const [path] of currentFileMap) {
  if (!body.files.some((f) => f.path === path)) {
    changedFiles.push(path);
  }
}

// If nothing changed, don't create a new version
if (changedFiles.length === 0) {
  return c.json({ version: null, message: "No changes detected" });
}

// Create new version
const newVersionNumber = project.currentVersion + 1;

const newVersion: Version = {
  versionNumber: newVersionNumber,
  prompt: "Manual code edit",
  model: project.model,
  files: body.files,
  changedFiles,
  type: "manual",
  createdAt: new Date().toISOString(),
  fileCount: body.files.length,
};

// Store new version and update project metadata
project.currentVersion = newVersionNumber;
project.updatedAt = new Date().toISOString();

await Promise.all([
  c.env.FILES.put(
    `${projectId}/v${newVersionNumber}/files.json`,
    JSON.stringify(newVersion),
  ),
  c.env.METADATA.put(`project:${projectId}`, JSON.stringify(project)),
]);

return c.json({ version: toVersionMeta(newVersion) });
}
});



export { versionsRoutes };