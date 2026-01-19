import { Plus, X } from "lucide-react";

export interface Param {
    key: string;
    value: string;
    param_type: string;
    description: string;
    enabled: boolean;
}

interface ParamsEditorProps {
    params: Param[];
    onChange: (params: Param[]) => void;
}

function ParamsEditor({ params, onChange }: ParamsEditorProps) {
    const addParam = () => {
        onChange([...params, { key: "", value: "", param_type: "query", description: "", enabled: true }]);
    };

    const updateParam = (index: number, field: keyof Param, value: string | boolean) => {
        const newParams = [...params];
        newParams[index] = { ...newParams[index], [field]: value };

        // Auto-expand: if typing in the last row and it's not empty, add a new blank row
        const isLastRow = index === params.length - 1;
        const isTypingText = typeof value === "string" && value.length > 0;
        const lastRowHasContent = newParams[index].key || newParams[index].value;

        if (isLastRow && isTypingText && lastRowHasContent) {
            newParams.push({ key: "", value: "", param_type: "query", description: "", enabled: true });
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

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Parameters</span>
                <button
                    onClick={addParam}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    <Plus size={12} />
                    Add Parameter
                </button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Key</span>
                    <span className="text-xs font-medium text-slate-600">Value</span>
                    <span className="text-xs font-medium text-slate-600">Type</span>
                    <span></span>
                </div>
                {(params.length > 0 ? params : [{ key: "", value: "", param_type: "query", description: "", enabled: true }]).map((param, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                        <input
                            type="text"
                            value={param.key}
                            onChange={(e) => updateParam(index, "key", e.target.value)}
                            placeholder="param"
                            className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                        />
                        <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateParam(index, "value", e.target.value)}
                            placeholder="value"
                            className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                        />
                        <select
                            value={param.param_type}
                            onChange={(e) => updateParam(index, "param_type", e.target.value)}
                            className="text-xs text-slate-600 focus:outline-none"
                        >
                            <option value="query">Query</option>
                            <option value="path">Path</option>
                        </select>
                        <button
                            onClick={() => removeParam(index)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
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
