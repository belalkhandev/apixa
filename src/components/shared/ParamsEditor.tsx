import { X } from "lucide-react";
import VariableInput from "./VariableInput";
import { Environment } from "../../api";

export interface Param {
    key: string;
    value: string;
    param_type: string;
    description: string | null;
    enabled: boolean;
}

interface ParamsEditorProps {
    params: Param[];
    onChange: (params: Param[]) => void;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function ParamsEditor({ params, onChange, environments, selectedEnvId, onUpdateVariable }: ParamsEditorProps) {
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
            onChange([{ key: "", value: "", param_type: "query", description: "", enabled: true }]);
        }
    };

    // Ensure there's always at least one row
    const displayParams = params.length > 0
        ? params
        : [{ key: "", value: "", param_type: "query", description: "", enabled: true }];

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">Query Params</h4>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
                <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Key</span>
                    <span className="text-xs font-medium text-slate-600">Value</span>
                    <span className="text-xs font-medium text-slate-600">Description</span>
                    <span></span>
                </div>
                {displayParams.map((param, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 items-center"
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
                        <input
                            type="text"
                            value={param.description || ""}
                            onChange={(e) => updateParam(index, "description", e.target.value)}
                            placeholder="description"
                            className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none bg-transparent px-2 h-[28px]"
                        />
                        <button
                            onClick={() => removeParam(index)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
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
