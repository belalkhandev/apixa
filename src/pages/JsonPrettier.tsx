import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
    Copy,
    Trash2,
    AlertTriangle,
    AlignLeft,
    Minimize2,
    Columns,
    Rows,
    GripVertical,
    GripHorizontal,
    Indent
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";

type Layout = "horizontal" | "vertical";
type EditorTheme = "light" | "vs-dark";

export default function JsonPrettier() {
    const { theme } = useTheme();
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [layout, setLayout] = useState<Layout>("horizontal");
    const [splitPos, setSplitPos] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [tabSize, setTabSize] = useState<number>(2);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

    const editorTheme: EditorTheme = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "vs-dark"
        : "light";

    // Auto-validation effect
    useEffect(() => {
        if (!input.trim()) {
            setError(null);
            return;
        }

        try {
            JSON.parse(input);
            setError(null);
        } catch (err: any) {
            const message = err.message;
            let line = 0;
            let column = 0;

            const match = message.match(/at position (\d+)/);
            if (match) {
                const pos = parseInt(match[1], 10);
                const lines = input.substring(0, pos).split("\n");
                line = lines.length;
                column = lines[lines.length - 1].length + 1;
            }

            setError({ message, line, column });
        }
    }, [input]);

    // Re-format when tab size changes
    useEffect(() => {
        if (output && !error && input.trim()) {
            handleFormat();
        }
    }, [tabSize]);

    // Resize logic
    useEffect(() => {
        const handleResizeMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            let newSplitPos = 50;

            if (layout === "horizontal") {
                newSplitPos = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            } else {
                newSplitPos = ((e.clientY - containerRect.top) / containerRect.height) * 100;
            }

            setSplitPos(Math.min(80, Math.max(20, newSplitPos)));
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResizeMove);
            document.addEventListener("mouseup", handleResizeEnd);
            document.body.style.userSelect = "none";
        }

        return () => {
            document.removeEventListener("mousemove", handleResizeMove);
            document.removeEventListener("mouseup", handleResizeEnd);
            document.body.style.userSelect = "";
        };
    }, [isResizing, layout]);

    const handleFormat = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setOutput(JSON.stringify(parsed, null, tabSize));
        } catch (err) {
            // Error already shown by useEffect
        }
    };

    const handleMinify = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setOutput(JSON.stringify(parsed));
        } catch (err) {
            // Error handled
        }
    };

    const copyToClipboard = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        toast.success("Copied to clipboard");
    };

    const clearAll = () => {
        setInput("");
        setOutput("");
        setError(null);
        toast.info("Cleared");
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* Toolbar */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="font-bold text-slate-700 dark:text-slate-200">JSON Prettier</h1>
                </div>

                <div className="flex items-center gap-3">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium mr-4 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-md">
                            <AlertTriangle size={16} />
                            <span>Error: {error.message} {error.line && error.line > 0 && `(Line ${error.line}, Col ${error.column})`}</span>
                        </div>
                    )}

                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600 h-9">
                        <button
                            onClick={() => setTabSize(2)}
                            className={`px-3 flex items-center gap-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${tabSize === 2 ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                        >
                            <Indent size={14} /> 2
                        </button>
                        <button
                            onClick={() => setTabSize(4)}
                            className={`px-3 flex items-center gap-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${tabSize === 4 ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                        >
                            <Indent size={14} /> 4
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    <button onClick={handleFormat} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer h-9">
                        <AlignLeft size={16} /> Format
                    </button>

                    <button onClick={handleMinify} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium transition-colors cursor-pointer h-9">
                        <Minimize2 size={16} /> Minify
                    </button>

                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600 h-9">
                        <button
                            onClick={() => setLayout("vertical")}
                            className={`p-1.5 w-8 flex items-center justify-center rounded transition-colors cursor-pointer ${layout === "vertical" ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                            title="Vertical Split"
                        >
                            <Rows size={14} />
                        </button>
                        <button
                            onClick={() => setLayout("horizontal")}
                            className={`p-1.5 w-8 flex items-center justify-center rounded transition-colors cursor-pointer ${layout === "horizontal" ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                            title="Horizontal Split"
                        >
                            <Columns size={14} />
                        </button>
                    </div>

                    <button
                        onClick={clearAll}
                        className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors h-9 w-9 flex items-center justify-center"
                        title="Clear All"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={containerRef}
                className={`flex-1 flex ${layout === "vertical" ? "flex-col" : "flex-row"} overflow-hidden relative`}
            >

                {/* Input Panel */}
                <div
                    style={{ flexBasis: `${splitPos}%` }}
                    className={`flex flex-col min-w-0 min-h-0 relative ${layout === "vertical" ? "border-b" : "border-r"} border-slate-200 dark:border-slate-800`}
                >
                    <div className="h-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 shrink-0">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">INPUT JSON</span>
                    </div>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language="json"
                            value={input}
                            theme={editorTheme}
                            onChange={(value) => setInput(value || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                            }}
                        />
                    </div>
                </div>

                {/* Resize Handle */}
                <div
                    className={`z-20 flex items-center justify-center shrink-0 hover:bg-blue-400 bg-slate-200 dark:bg-slate-700 transition-colors
            ${layout === "vertical" ? "h-1.5 w-full cursor-row-resize" : "w-1.5 h-full cursor-col-resize"}
          `}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                >
                    {layout === "vertical"
                        ? <GripHorizontal size={12} className="text-slate-400 dark:text-slate-500" />
                        : <GripVertical size={12} className="text-slate-400 dark:text-slate-500" />
                    }
                </div>

                {/* Output Panel */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    <div className="h-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 shrink-0">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">FORMATTED OUTPUT</span>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                    <div className="flex-1 relative bg-white dark:bg-[#1e1e1e]">
                        <Editor
                            height="100%"
                            language="json"
                            value={output}
                            theme={editorTheme}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: tabSize,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
