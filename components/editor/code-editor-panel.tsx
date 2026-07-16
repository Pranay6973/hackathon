import React, { useCallback, useRef } from "react";
import Editor, { type OnMount, type BeforeMount} from "@monaco-editor/react"
import { FileExplorer } from "./file-explorer";
import { FileText } from "lucide-react";

export interface CodeEditorPanelProps {
  files: Record<string, string>;
  activeFile: string;
  onActiveFileChange: (filePath: string) => void;
  onFileContentChange: (filePath: string, content: string) => void;
}


function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "tsx":
      return "typescript";
    case "ts":
      return "typescript";
    case "jsx":
      return "javascript";
    case "js":
      return "javascript";
    case "css":
      return "css";
    case "json":
      return "json";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

export function CodeEditorPanel({
  files,
  activeFile,
  onActiveFileChange,
  onFileContentChange,
}: CodeEditorPanelProps) {

   const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

const handleEditorWillMount: BeforeMount = useCallback((monaco) => {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    moduleResolution:
      monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  });

  // Disable semantic and syntax validation to avoid red squiggly lines
  // on generated code that lacks full type definitions
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });
}, []);


const handleEditorDidMount: OnMount = useCallback((editor) => {
  editorRef.current = editor;
}, []);

const handleEditorChange = useCallback(
  (value: string | undefined) => {
    if (value !== undefined) {
      onFileContentChange(activeFile, value);
    }
  },
  [activeFile, onFileContentChange]
);

const activeContent = files[activeFile] ?? "";
const language = getLanguageFromPath(activeFile);




  return (
  <div className="flex h-full">
  <div className="hidden w-52 shrink-0 md:block">
    <FileExplorer
      files={files}
      activeFile={activeFile}
      onFileSelect={onActiveFileChange}
    />
  </div>

  <div className="flex flex-1 flex-col">
  <div className="flex h-10 items-center gap-2 border-b border-border px-3">
    <div className="flex items-center gap-1.5 rounded-md bg-accent/50 px-2.5 py-1">
      <FileText className="size-3 text-muted-foreground" />
      <span className="text-xs font-medium">
        {getFileName(activeFile)}
      </span>
    </div>
  </div>


  <div className="flex-1">
  <Editor
    height="100%"
    language={language}
    value={activeContent}
    theme="vs-dark"
    onChange={handleEditorChange}
    beforeMount={handleEditorWillMount}
    onMount={handleEditorDidMount}
    options={{
      minimap: { enabled: true },
      wordWrap: "on",
      formatOnPaste: true,
      tabSize: 2,
      fontSize: 13,
      lineHeight: 20,
      padding: { top: 12 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    }}
  />
</div>



</div>
</div>
);
}