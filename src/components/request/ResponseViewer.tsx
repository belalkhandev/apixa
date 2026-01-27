import { motion } from "framer-motion";
import { Copy, Check, WrapText, Code, FileText, Globe } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "../../contexts/ThemeContext";

interface ResponseData {
    status: number;
    statusText: string;
    time: number;
    size: string;
    headers: Record<string, string>;
    body: string;
}

interface ResponseViewerProps {
    response: ResponseData | null;
    error: string | null;
    isBeautified: boolean;
    onToggleBeautify: () => void;
}

type ViewFormat = "json" | "text" | "html";

const statusColors: Record<string, string> = {
    "2": "text-emerald-600 bg-emerald-50",
    "3": "text-blue-600 bg-blue-50",
    "4": "text-amber-600 bg-amber-50",
    "5": "text-red-600 bg-red-50",
};

const statusColorsDark: Record<string, string> = {
    "2": "text-emerald-400 bg-emerald-900/30",
    "3": "text-blue-400 bg-blue-900/30",
    "4": "text-amber-400 bg-amber-900/30",
    "5": "text-red-400 bg-red-900/30",
};

function ResponseViewer({ response, error, isBeautified, onToggleBeautify }: ResponseViewerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [activeTab, setActiveTab] = useState("Body");
    const [copied, setCopied] = useState(false);
    const [viewFormat, setViewFormat] = useState<ViewFormat>("json");

    // Detect content type from response headers
    const detectedFormat = useMemo((): ViewFormat => {
        if (!response) return "text";
        const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
        if (contentType.includes("application/json")) return "json";
        if (contentType.includes("text/html")) return "html";
        if (contentType.includes("text/xml") || contentType.includes("application/xml")) return "text";
        // Try to parse as JSON
        try {
            JSON.parse(response.body);
            return "json";
        } catch {
            // Check if it looks like HTML
            if (response.body.trim().startsWith("<!DOCTYPE") || response.body.trim().startsWith("<html")) {
                return "html";
            }
            return "text";
        }
    }, [response]);

    // Auto-select format on response change
    useEffect(() => {
        setViewFormat(detectedFormat);
    }, [detectedFormat]);

    const formatJson = (text: string): string => {
        try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed, null, 4);
        } catch {
            return text;
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusColor = (status: number): string => {
        const firstDigit = String(status)[0];
        if (isDark) {
            return statusColorsDark[firstDigit] || "text-slate-400 bg-slate-800";
        }
        return statusColors[firstDigit] || "text-slate-600 bg-slate-100";
    };

    const getEditorLanguage = (): string => {
        switch (viewFormat) {
            case "json": return "json";
            case "html": return "html";
            default: return "plaintext";
        }
    };

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 p-4 border rounded-xl ${isDark ? "bg-red-900/20 border-red-900/30" : "bg-red-50 border-red-200"}`}
            >
                <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
            </motion.div>
        );
    }

    // if (!response) {
    //     return null;
    // }

    const tabs = ["Body", "Headers"];
    const formattedBody = response ? (viewFormat === "json" && isBeautified ? formatJson(response.body) : response.body) : "";

    const formatButtons: { format: ViewFormat; icon: typeof Code; label: string }[] = [
        { format: "json", icon: Code, label: "JSON" },
        { format: "text", icon: FileText, label: "Text" },
        { format: "html", icon: Globe, label: "HTML" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl flex flex-col h-full overflow-hidden border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
        >
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Response</span>
                    {response ? (
                        <>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(response.status)}`}>
                                {response.status} {response.statusText}
                            </span>
                            <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{response.time} ms</span>
                            <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{response.size}</span>
                        </>
                    ) : (
                        <span className={`text-xs ${isDark ? "text-slate-600" : "text-slate-400"}`}>Ready to send</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Format selector */}
                    <div className={`flex items-center rounded-md p-0.5 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                        {formatButtons.map(({ format, icon: Icon, label }) => (
                            <button
                                key={format}
                                onClick={() => setViewFormat(format)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${viewFormat === format
                                    ? isDark
                                        ? "bg-slate-700 text-blue-400 shadow-sm"
                                        : "bg-white text-blue-600 shadow-sm"
                                    : isDark
                                        ? "text-slate-400 hover:text-slate-200"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                title={label}
                            >
                                <Icon size={12} />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>

                    {viewFormat === "json" && (
                        <button
                            onClick={onToggleBeautify}
                            className={`p-1.5 rounded transition-colors ${isBeautified
                                ? isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"
                                : isDark ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100"
                                }`}
                            title={isBeautified ? "Minify" : "Beautify"}
                        >
                            <WrapText size={14} />
                        </button>
                    )}
                    <button
                        onClick={() => response && copyToClipboard(response.body)}
                        disabled={!response}
                        className={`p-1.5 rounded transition-colors ${!response
                                ? isDark ? "text-slate-700 cursor-not-allowed" : "text-slate-300 cursor-not-allowed"
                                : isDark ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100"
                            }`}
                        title="Copy"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            <div className={`px-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${activeTab === tab
                                ? "text-blue-600 border-blue-500"
                                : isDark
                                    ? "text-slate-500 border-transparent hover:text-slate-300"
                                    : "text-slate-500 border-transparent hover:text-slate-700"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`flex-1 p-4 overflow-hidden min-h-0 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                {activeTab === "Body" && (
                    <>
                        {!response ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <div className={`p-4 rounded-full mb-4 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                                    <Globe size={32} className={isDark ? "text-slate-700" : "text-slate-300"} />
                                </div>
                                <p className={`text-sm font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Enter URL and click Send</p>
                            </div>
                        ) : viewFormat === "html" ? (
                            <div className={`h-full rounded-lg overflow-auto border scrollbar-thin ${isDark ? "bg-white border-slate-700" : "bg-white border-slate-200"}`}>
                                <iframe
                                    srcDoc={response.body}
                                    title="HTML Preview"
                                    className="w-full h-full border-0"
                                    sandbox="allow-same-origin"
                                />
                            </div>
                        ) : (
                            <div className={`h-full rounded-lg overflow-hidden ${isDark ? "bg-slate-900" : "bg-white"}`}>
                                <Editor
                                    height="100%"
                                    language={getEditorLanguage()}
                                    value={formattedBody}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                        scrollBeyondLastLine: false,
                                        wordWrap: "on",
                                        wrappingStrategy: "advanced",
                                        padding: { top: 10, bottom: 10 },
                                        readOnly: true,
                                        automaticLayout: true,
                                        tabSize: 4,
                                        lineNumbers: viewFormat === "json" ? "on" : "off",
                                        scrollbar: {
                                            vertical: "auto",
                                            horizontal: "auto",
                                            verticalScrollbarSize: 6,
                                            horizontalScrollbarSize: 6,
                                        },
                                    }}
                                    theme={isDark ? "vs-dark" : "light"}
                                />
                            </div>
                        )}
                    </>
                )}

                {activeTab === "Headers" && (
                    <div className={`h-full overflow-y-auto rounded-lg border p-4 scrollbar-thin ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                        }`}>
                        {response ? (
                            <div className="space-y-2">
                                {Object.entries(response.headers).map(([key, value]) => (
                                    <div key={key} className={`flex gap-2 text-sm py-1 border-b last:border-0 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                                        <span className={`font-medium min-w-[180px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>{key}:</span>
                                        <span className={`break-all ${isDark ? "text-slate-400" : "text-slate-600"}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <p className="text-sm">No headers available</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default ResponseViewer;
