import { X } from "lucide-react";
import VariableInput from "./VariableInput";
import { Environment } from "../../api";

export interface ExtractRule {
    variable: string;
    path: string;
    enabled: boolean;
}

interface ExtractEditorProps {
    rules: ExtractRule[];
    onChange: (rules: ExtractRule[]) => void;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function ExtractEditor({ rules, onChange, environments, selectedEnvId, onUpdateVariable }: ExtractEditorProps) {
    const updateRule = (index: number, field: keyof ExtractRule, value: string | boolean) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };

        const isLastRow = index === rules.length - 1;
        const isTypingText = typeof value === "string" && value.length > 0;
        const lastRowHasContent = newRules[index].variable || newRules[index].path;

        if (isLastRow && isTypingText && lastRowHasContent) {
            newRules.push({ variable: "", path: "", enabled: true });
        }

        onChange(newRules);
    };

    const removeRule = (index: number) => {
        if (rules.length > 1) {
            onChange(rules.filter((_, i) => i !== index));
        } else {
            onChange([{ variable: "", path: "", enabled: true }]);
        }
    };

    const displayRules = rules.length > 0
        ? rules
        : [{ variable: "", path: "", enabled: true }];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-slate-800">Extract Variables</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Extract values from JSON response into environment variables.</p>
                </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <div className="grid grid-cols-[1fr_1.5fr_40px] gap-3 px-4 py-2 bg-slate-50/50 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variable Name</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JSON Path</span>
                    <span></span>
                </div>
                {displayRules.map((rule, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[1fr_1.5fr_40px] gap-3 px-4 py-2 border-b border-slate-100 last:border-b-0 items-center group transition-colors hover:bg-slate-50/30"
                        style={{ minHeight: "44px" }}
                    >
                        <VariableInput
                            value={rule.variable}
                            onChange={(val) => updateRule(index, "variable", val)}
                            placeholder="e.g. token"
                            className="h-[32px]"
                            environments={environments}
                            selectedEnvId={selectedEnvId}
                            onUpdateVariable={onUpdateVariable}
                        />
                        <div className="relative">
                            <input
                                type="text"
                                value={rule.path}
                                onChange={(e) => updateRule(index, "path", e.target.value)}
                                placeholder="e.g. data.access_token"
                                className="w-full h-[32px] px-3 text-[13px] border-b border-transparent focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-300 font-mono text-slate-600 bg-transparent"
                            />
                        </div>
                        <button
                            onClick={() => removeRule(index)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ExtractEditor;
