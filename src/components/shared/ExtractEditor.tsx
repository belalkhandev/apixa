import { X } from "lucide-react";

export interface ExtractRule {
    variable: string;
    path: string;
    enabled: boolean;
}

interface ExtractEditorProps {
    rules: ExtractRule[];
    onChange: (rules: ExtractRule[]) => void;
}

function ExtractEditor({ rules, onChange }: ExtractEditorProps) {
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
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">Extract Variables from Response</h4>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
                <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Variable Name</span>
                    <span className="text-xs font-medium text-slate-600">Response Path</span>
                    <span></span>
                </div>
                {displayRules.map((rule, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0 items-center"
                        style={{ minHeight: "36px" }}
                    >
                        <input
                            type="text"
                            value={rule.variable}
                            onChange={(e) => updateRule(index, "variable", e.target.value)}
                            placeholder="e.g., token"
                            className="w-full h-[28px] px-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-blue-400 placeholder:text-slate-400"
                        />
                        <input
                            type="text"
                            value={rule.path}
                            onChange={(e) => updateRule(index, "path", e.target.value)}
                            placeholder="e.g., data.access_token"
                            className="w-full h-[28px] px-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-blue-400 placeholder:text-slate-400 font-mono text-xs"
                        />
                        <button
                            onClick={() => removeRule(index)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
                Path examples: <code className="bg-slate-100 px-1 rounded">data.token</code>, <code className="bg-slate-100 px-1 rounded">user.id</code>, <code className="bg-slate-100 px-1 rounded">items.0.name</code>
            </p>
        </div>
    );
}

export default ExtractEditor;
