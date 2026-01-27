import { X, Pin } from "lucide-react";
import VariableInput from "./VariableInput";
import { Environment } from "../../api";
import { useTheme } from "../../contexts/ThemeContext";

export interface Header {
    key: string;
    value: string;
    enabled: boolean;
    carry_forward: boolean;
}

interface HeadersEditorProps {
    headers: Header[];
    onChange: (headers: Header[]) => void;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

const COMMON_HEADERS = [
    "Accept", "Accept-Charset", "Accept-Encoding", "Accept-Language", "Authorization",
    "Cache-Control", "Connection", "Content-Length", "Content-Type", "Cookie",
    "Date", "Host", "Origin", "Pragma", "Referer", "User-Agent", "X-Requested-With"
];

const COMMON_VALUES = {
    "Content-Type": ["application/json", "application/x-www-form-urlencoded", "multipart/form-data", "text/html", "text/plain"],
    "Accept": ["application/json", "text/html", "*/*"],
    "Cache-Control": ["no-cache", "no-store", "max-age=0"],
    "Connection": ["keep-alive", "close"],
};

function HeadersEditor({ headers, onChange, environments, selectedEnvId, onUpdateVariable }: HeadersEditorProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const updateHeader = (index: number, field: keyof Header, value: string | boolean) => {
        const newHeaders = [...headers];
        newHeaders[index] = { ...newHeaders[index], [field]: value };

        // Auto-expand: if typing in the last row and it's not empty, add a new blank row
        const isLastRow = index === headers.length - 1;
        const isTypingText = typeof value === "string" && value.length > 0;
        const lastRowHasContent = newHeaders[index].key || newHeaders[index].value;

        if (isLastRow && isTypingText && lastRowHasContent) {
            newHeaders.push({ key: "", value: "", enabled: true, carry_forward: false });
        }

        onChange(newHeaders);
    };

    const removeHeader = (index: number) => {
        // Always keep at least one row
        if (headers.length > 1) {
            onChange(headers.filter((_, i) => i !== index));
        } else {
            // If it's the only row, just clear it instead of removing
            onChange([{ key: "", value: "", enabled: true, carry_forward: false }]);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Headers</span>
            </div>
            <div className={`border rounded-lg overflow-hidden ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200"}`}>
                <div className={`grid grid-cols-[1fr_1fr_40px_40px] gap-2 px-3 py-2 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Key</span>
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Value</span>
                    <span className={`text-[10px] font-bold text-center flex items-center justify-center ${isDark ? "text-slate-500" : "text-slate-400"}`} title="Carry forward to environment">VAR</span>
                    <span></span>
                </div>
                {headers.map((header, index) => (
                    <div
                        key={index}
                        className={`grid grid-cols-[1fr_1fr_40px_40px] gap-2 px-3 py-1.5 border-b last:border-b-0 items-center ${isDark ? "border-slate-800" : "border-slate-100"}`}
                        style={{ minHeight: "36px" }}
                    >
                        <div className="relative">
                            <VariableInput
                                list={`header-keys-${index}`}
                                value={header.key}
                                onChange={(val) => updateHeader(index, "key", val)}
                                placeholder="Key"
                                className="w-full h-[28px]"
                                environments={environments}
                                selectedEnvId={selectedEnvId}
                                onUpdateVariable={onUpdateVariable}
                            />
                            <datalist id={`header-keys-${index}`}>
                                {COMMON_HEADERS.map(h => <option key={h} value={h} />)}
                            </datalist>
                        </div>
                        <div className="relative">
                            <VariableInput
                                list={`header-values-${index}`}
                                value={header.value}
                                onChange={(val) => updateHeader(index, "value", val)}
                                placeholder="Value"
                                className="w-full h-[28px]"
                                environments={environments}
                                selectedEnvId={selectedEnvId}
                                onUpdateVariable={onUpdateVariable}
                            />
                            <datalist id={`header-values-${index}`}>
                                {(COMMON_VALUES[header.key as keyof typeof COMMON_VALUES] || []).map(v => (
                                    <option key={v} value={v} />
                                ))}
                            </datalist>
                        </div>
                        <button
                            onClick={() => updateHeader(index, "carry_forward", !header.carry_forward)}
                            className={`p-1.5 rounded transition-all active:scale-90 flex items-center justify-center ${header.carry_forward
                                ? isDark ? "text-blue-400 bg-blue-900/30 border-blue-800" : "text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                : isDark ? "text-slate-600 hover:text-slate-400 hover:bg-slate-800 border border-transparent" : "text-slate-300 hover:text-slate-500 hover:bg-slate-50 border border-transparent"
                                }`}
                            title={header.carry_forward ? "Carry forward enabled" : "Carry forward disabled"}
                        >
                            <Pin size={14} className={header.carry_forward ? "fill-blue-600 rotate-45" : ""} />
                        </button>
                        <button
                            onClick={() => removeHeader(index)}
                            className={`p-1 rounded transition-colors ${isDark ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HeadersEditor;
