import { motion } from "framer-motion";
import { Copy, Check, WrapText } from "lucide-react";
import { useState } from "react";
import Editor from "@monaco-editor/react";

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

const statusColors: Record<string, string> = {
    "2": "text-emerald-600 bg-emerald-50",
    "3": "text-blue-600 bg-blue-50",
    "4": "text-amber-600 bg-amber-50",
    "5": "text-red-600 bg-red-50",
};

function ResponseViewer({ response, error, isBeautified, onToggleBeautify }: ResponseViewerProps) {
    const [activeTab, setActiveTab] = useState("Body");
    const [copied, setCopied] = useState(false);

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
        return statusColors[firstDigit] || "text-slate-600 bg-slate-100";
    };

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
                <p className="text-sm text-red-600">{error}</p>
            </motion.div>
        );
    }

    if (!response) {
        return null;
    }

    const tabs = ["Body", "Headers"];
    const formattedBody = isBeautified ? formatJson(response.body) : response.body;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl flex flex-col h-full overflow-hidden"
        >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700">Response</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(response.status)}`}>
                        {response.status} {response.statusText}
                    </span>
                    <span className="text-xs text-slate-500">{response.time} ms</span>
                    <span className="text-xs text-slate-500">{response.size}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleBeautify}
                        className={`p-1.5 rounded transition-colors ${isBeautified ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100"}`}
                        title={isBeautified ? "Minify" : "Beautify"}
                    >
                        <WrapText size={14} />
                    </button>
                    <button
                        onClick={() => copyToClipboard(response.body)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                        title="Copy"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            <div className="px-4 border-b border-slate-100">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${activeTab === tab
                                ? "text-blue-600 border-blue-500"
                                : "text-slate-500 border-transparent hover:text-slate-700"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-4 bg-slate-50 overflow-hidden min-h-0">
                {activeTab === "Body" && (
                    <div className="h-full rounded-lg overflow-hidden bg-white">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            language="json"
                            value={formattedBody}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                scrollBeyondLastLine: false,
                                wordWrap: "on",
                                padding: { top: 10, bottom: 10 },
                                readOnly: true,
                                automaticLayout: true,
                                tabSize: 4,
                            }}
                            theme="light"
                        />
                    </div>
                )}

                {activeTab === "Headers" && (
                    <div className="h-full overflow-y-auto space-y-1">
                        {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-sm">
                                <span className="font-medium text-slate-700">{key}:</span>
                                <span className="text-slate-600">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default ResponseViewer;
