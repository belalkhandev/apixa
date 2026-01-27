import { X, Pin } from "lucide-react";
import VariableInput from "./VariableInput";
import { Environment } from "../../api";
import { useTheme } from "../../contexts/ThemeContext";

export interface Param {
    key: string;
    value: string;
    param_type: string;
    description: string | null;
    enabled: boolean;
    carry_forward: boolean;
}

interface ParamsEditorProps {
    params: Param[];
    onChange: (params: Param[]) => void;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function ParamsEditor({ params, onChange, environments, selectedEnvId, onUpdateVariable }: ParamsEditorProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const updateParam = (index: number, field: keyof Param, value: string | boolean) => {
        const newParams = [...params];
        newParams[index] = { ...newParams[index], [field]: value };

        // Auto-expand: if typing in the last row and it's not empty, add a new blank row
        const isLastRow = index === params.length - 1;
        const isTypingText = typeof value === "string" && value.length > 0;
        const lastRowHasContent = newParams[index].key || newParams[index].value;

        if (isLastRow && isTypingText && lastRowHasContent) {
            newParams.push({
                key: "",
                value: "",
                param_type: "query",
                description: "",
                enabled: true,
                carry_forward: false,
            });
        }

        onChange(newParams);
    };

    const removeParam = (index: number) => {
        // Always keep at least one row
        if (params.length > 1) {
            onChange(params.filter((_, i) => i !== index));
        } else {
            // If it's the only row, just clear it instead of removing
            onChange([{ key: "", value: "", param_type: "query", description: "", enabled: true, carry_forward: false }]);
        }
    };

    // Ensure there's always at least one row
    const displayParams = params.length > 0
        ? params
        : [{ key: "", value: "", param_type: "query", description: "", enabled: true, carry_forward: false }];

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Query Params</h4>
            </div>
            <div className={`border rounded-lg overflow-hidden shrink-0 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200"}`}>
                <div className={`grid grid-cols-[1fr_1fr_40px_40px] gap-2 px-3 py-2 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Key</span>
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Value</span>
                    <span className={`text-[10px] font-bold text-center flex items-center justify-center ${isDark ? "text-slate-500" : "text-slate-400"}`} title="Carry forward to environment">VAR</span>
                    <span></span>
                </div>
                {displayParams.map((param, index) => (
                    <div
                        key={index}
                        className={`grid grid-cols-[1fr_1fr_40px_40px] gap-2 px-3 py-1.5 border-b last:border-b-0 items-center ${isDark ? "border-slate-800" : "border-slate-100"}`}
                        style={{ minHeight: "36px" }}
                    >
                        <VariableInput
                            value={param.key}
                            onChange={(val) => updateParam(index, "key", val)}
                            placeholder="key"
                            className="h-[28px]"
                            environments={environments}
                            selectedEnvId={selectedEnvId}
                            onUpdateVariable={onUpdateVariable}
                        />
                        <VariableInput
                            value={param.value}
                            onChange={(val) => updateParam(index, "value", val)}
                            placeholder="value"
                            className="h-[28px]"
                            environments={environments}
                            selectedEnvId={selectedEnvId}
                            onUpdateVariable={onUpdateVariable}
                        />
                        <button
                            onClick={() => updateParam(index, "carry_forward", !param.carry_forward)}
                            className={`p-1.5 rounded transition-all active:scale-90 flex items-center justify-center ${param.carry_forward
                                ? isDark ? "text-blue-400 bg-blue-900/30 border-blue-800" : "text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                : isDark ? "text-slate-600 hover:text-slate-400 hover:bg-slate-800 border border-transparent" : "text-slate-300 hover:text-slate-500 hover:bg-slate-50 border border-transparent"
                                }`}
                            title={param.carry_forward ? "Carry forward enabled" : "Carry forward disabled"}
                        >
                            <Pin size={14} className={param.carry_forward ? "fill-blue-600 rotate-45" : ""} />
                        </button>
                        <button
                            onClick={() => removeParam(index)}
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

export default ParamsEditor;
