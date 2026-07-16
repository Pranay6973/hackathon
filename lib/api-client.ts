import { get } from "http";
import type { Project, ProjectFile, VersionMeta } from "../types/project";
import { ChatMessage } from "@/types/chat";


export const WORKER_URL = 
    process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";


    export interface ApiError {
        error: string;
        code: string;
    }

    type GetTokenFunction = () => Promise<string | null>;


    async function authenticatedFetch<T>(
        getToken: GetTokenFunction, 
        path: string, 
        options: RequestInit = {}, 
    ): Promise<T> {
        const token = await getToken();
        if (!token) {
            throw new Error("Not authenticated - no session token available");
        }
        const response = await fetch(`${WORKER_URL}${path}`, {
            ...options,
            headers:{
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...options.headers,
        },
    });

 if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
        error: "Unknown error",
        code: "UNKNOWN_ERROR",
    }))) as {error: string; code: string; retryAfter?: number };

    if (response.status === 429) {
        const retryAfter = errorBody.retryAfter ?? 60; // default to 60 seconds if not provided
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("rate-limited", { detail: { retryAfter } }),

            );
        }
    

    }
    throw new Error(
    errorBody.error || `Request failed with status ${response.status}`,
   );
}  
    return response.json() as Promise<T>;


}
    
export function createApiClient(getToken: GetTokenFunction) {
  return {
    projects: {
      list: () =>
        authenticatedFetch<{ projects: Project[] }>(getToken, "/api/projects"),

      get: (id: string) =>
        authenticatedFetch<{ project: Project }>(
          getToken,
          `/api/projects/${id}`
        ),

      getFiles: (id: string) =>
        authenticatedFetch<{ files: ProjectFile[]; version: number }>(
          getToken,
          `/api/projects/${id}/files`
        ),

      create: (data: { name: string; model: string; description?: string }) =>
        authenticatedFetch<{ project: Project }>(getToken, "/api/projects", {
          method: "POST",
          body: JSON.stringify(data),
        }),

    update: (id: string, data: { name?: string; model?: string }) =>
  authenticatedFetch<{ project: Project }>(getToken, `/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),

delete: (id: string) =>
  authenticatedFetch<{ success: boolean }>(getToken, `/api/projects/${id}`, 
    {
    method: "DELETE",
  }
    ),



  },

  chats: {
  getHistory: (projectId: string) =>
    authenticatedFetch<{ messages: ChatMessage[] }>(
      getToken,
      `/api/chat/${projectId}`,
    ),
},

credits: {
  get: () =>
    authenticatedFetch<{
      remaining: number;
      total: number;
      plan: "free" | "pro";
      periodEnd: string;
      isUnlimited: boolean;
    }>(getToken, "/api/credits"),
},


versions: {
  list: (projectId: string) =>
    authenticatedFetch<{ versions: VersionMeta[] }>(
      getToken,
      `/api/projects/${projectId}/versions`,
    ),

get: (projectId: string, version: number) =>
  authenticatedFetch<{
    files: ProjectFile[];
    versionNumber: number;
    meta: VersionMeta;
  }>(getToken, `/api/projects/${projectId}/versions/${version}`),


  diff: (projectId: string, v1: number, v2: number) =>
  authenticatedFetch<{
    from: number;
    to: number;
    changes: Array<{
      path: string;
      type: "added" | "removed" | "modified";
      oldContent: string | null;
      newContent: string | null;
    }>;
  }>(getToken, `/api/projects/${projectId}/versions/${v1}/diff/${v2}`),



restore: (projectId: string, version: number) =>
  authenticatedFetch<{ version: VersionMeta; files: ProjectFile[] }>(
    getToken,
    `/api/projects/${projectId}/versions/${version}/restore`,
    {
      method: "POST",
    },
  ),


  saveManual: (projectId: string, files: ProjectFile[]) =>
  authenticatedFetch<{
    version: VersionMeta | null;
    message?: string;
  }>(getToken, `/api/projects/${projectId}/versions`, {
    method: "POST",
    body: JSON.stringify({ files }),
  }),

},

};
}