"use client";

import { SandpackLayout, SandpackPreview, SandpackProvider, useSandpack } from "@codesandbox/sandpack-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PreviewPanelProps {
  files: Record<string, string>;
  onError: (error: {message: string}) => void;
}

function extractDependencies(
  files: Record<string, string>
): Record<string, string> {
  const baseDeps: Record<string, string> = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  };

  const packageJsonContent = files["package.json"];
  if (!packageJsonContent) return baseDeps;

  try {
    const parsed = JSON.parse(packageJsonContent);
    return { ...baseDeps, ...(parsed.dependencies || {}) };
  } catch {
    return baseDeps;
  }
}


function toSandpackFiles(
  files: Record<string, string>
): Record<string, { code: string }> {
  const sandpackFiles: Record<string, { code: string }> = {};

  for (const [path, content] of Object.entries(files)) {
    const sandpackPath = path.startsWith("src/")
      ? `/src/${path.slice(4)}`
      : `/${path}`;
    sandpackFiles[sandpackPath] = { code: content };
  }

  return sandpackFiles;
}

function ErrorListener({ onError }: { onError: (error: { message: string }) => void }) {
  const { sandpack, listen } = useSandpack();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorRef = useRef<string>("");

  const handleError = useCallback(
    (message: string) => {
      // Dedup: skip if same error message as last reported
      if (message === lastErrorRef.current) return;

      // Clear existing debounce timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Wait 1.5s for Sandpack to settle before reporting
      debounceRef.current = setTimeout(() => {
        lastErrorRef.current = message;
        onError({ message });
      }, 1500);
    },
    [onError]
  );


useEffect(() => {
  if (sandpack.error?.message) {
    handleError(sandpack.error.message);
  }
}, [sandpack.error, handleError]);



useEffect(() => {
  const unsubscribe = listen((msg) => {
    // cast to unknown first to safely access additional properties
    const raw = msg as unknown as Record<string, unknown>;

    // Detect "show-error" action messages (build errors)
    if (msg.type === "action" && raw.action === "show-error") {
      const errorMessage =
        (raw.message as string) || (raw.title as string) || "Build error";
      handleError(errorMessage);
    }

    // Detect console.error messages (runtime errors)
if (msg.type === "console" && raw.log) {
  const logs = raw.log as Array<{ method?: string; data?: string[] }>;
  for (const log of Array.isArray(logs) ? logs : [logs]) {
    if (log.method === "error" && log.data && log.data.length > 0) {
      handleError(log.data.join(" "));
      break;
    }
  }
}
  });

 return () => {
  unsubscribe();
  if (debounceRef.current) clearTimeout(debounceRef.current);
};
}, [listen, handleError]);

return null;

}

function LovableBadge() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 12,
        cursor: "pointer",
        textDecoration: "none",
        transition: "all 150ms ease",
        color: hovered ? "#ffffff" : "#888888",
        backgroundColor: hovered ? "rgba(255,255,255,0.08)" : "transparent",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "transparent"}`,
      }}
      >
  <img src="/logo.svg" alt="" style={{ width: 14, height: 14 }} />
  Built with Lovable
</a>
);
}

export function PreviewPanel({ files, onError }: PreviewPanelProps) {
  const sandpackFiles = toSandpackFiles(files);
  const dependencies = extractDependencies(files);
  return (
    <div className="sandpack-stretch h-full w-full">
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        options={{ externalResources: ["https://cdn.tailwindcss.com"] }}
        customSetup={{ dependencies }}
>
  {onError && <ErrorListener onError={onError} />}
  <SandpackLayout
    style={{ height: "100%", border: "none", borderRadius: 0 }}
  >
    <SandpackPreview
      showNavigator
      showRefreshButton
      showOpenInCodeSandbox={false}
      actionsChildren={<LovableBadge />}
      style={{ height: "100%" }}
    />
  </SandpackLayout>
</SandpackProvider>
</div>
);
}