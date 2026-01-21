import { useState, useEffect, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Environment } from "../../api";
import prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import VariableInput from "./VariableInput";

export type BodyType = "json" | "text" | "formdata";

interface FormDataItem {
    key: string;
    value: string;
    enabled: boolean;
}

interface BodyEditorProps {
    value: string;
    onChange: (value: string) => void;
    initialType?: BodyType;
    environments: Environment[];
    selectedEnvId: string | null;
    onBodyTypeChange?: (type: BodyType) => void;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function BodyEditor({
    value,
    onChange,
    initialType = "json",
    environments,
    selectedEnvId,
    onBodyTypeChange,
    onUpdateVariable,
}: BodyEditorProps) {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationIdsRef = useRef<string[]>([]);
    const [bodyType, setBodyType] = useState<BodyType>(initialType);

    // Sync bodyType with initialType prop
    useEffect(() => {
        if (initialType) {
            setBodyType(initialType);
        }
    }, [initialType]);
    const [formData, setFormData] = useState<FormDataItem[]>([
        { key: "", value: "", enabled: true },
    ]);
    const [isValidJson, setIsValidJson] = useState(true);

    // Initialize form data from value if starting in valid JSON
    useEffect(() => {
        if (value && bodyType === "json") {
            try {
                JSON.parse(value);
                setIsValidJson(true);
            } catch {
                setIsValidJson(false);
            }
        }
    }, [value, bodyType]);

    // Notify parent of initial body type
    useEffect(() => {
        onBodyTypeChange?.(bodyType);
    }, []);

    // Convert JSON to Form Data
    const jsonToFormData = (jsonStr: string): FormDataItem[] => {
        try {
            const parsed = JSON.parse(jsonStr);
            const items: FormDataItem[] = [];

            // Helper to flatten object or handle nested
            const processValue = (val: any) => {
                if (typeof val === "object" && val !== null) {
                    return JSON.stringify(val);
                }
                return String(val);
            };

            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                Object.entries(parsed).forEach(([key, val]) => {
                    items.push({ key, value: processValue(val), enabled: true });
                });
            }

            // Add empty row at the end
            items.push({ key: "", value: "", enabled: true });
            return items.length > 0 ? items : [{ key: "", value: "", enabled: true }];
        } catch {
            return [{ key: "", value: "", enabled: true }];
        }
    };

    // Convert Form Data to JSON
    const formDataToJson = (items: FormDataItem[]): string => {
        const obj: Record<string, any> = {};
        items.forEach((item) => {
            if (item.key.trim() && item.enabled) {
                // Try to parse number/boolean/json if possible for "smart" feeling
                let val: any = item.value;
                if (val === "true") val = true;
                else if (val === "false") val = false;
                else if (!isNaN(Number(val)) && val.trim() !== "") val = Number(val);

                try {
                    // If value looks like JSON object/array, parse it
                    if ((val.startsWith("{") || val.startsWith("[")) && (val.endsWith("}") || val.endsWith("]"))) {
                        val = JSON.parse(val);
                    }
                } catch { }

                obj[item.key] = val;
            }
        });
        return Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 4) : "";
    };

    const handleTypeChange = (newType: BodyType) => {
        if (newType === bodyType) return;

        // Convert between formats
        if (bodyType === "json" && newType === "formdata") {
            const items = jsonToFormData(value);
            setFormData(items);
        } else if (bodyType === "formdata" && newType === "json") {
            const jsonStr = formDataToJson(formData);
            onChange(jsonStr);
            // Try to format it immediately
            formatJson(jsonStr).then(formatted => {
                if (formatted) onChange(formatted);
            });
        }

        setBodyType(newType);
        onBodyTypeChange?.(newType);
    };

    const updateDecorations = () => {
        if (!editorRef.current || !monacoRef.current || bodyType !== "json") return;

        const model = editorRef.current.getModel();
        if (!model) return;

        const text = model.getValue();
        const newDecorations: any[] = [];
        const regex = /\{\{([^\}]+)\}\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + match[0].length);
            const varName = match[1];

            // Resolve value
            let varValue: string | null = null;
            if (selectedEnvId) {
                const env = environments.find(e => e.id === selectedEnvId);
                const variable = env?.variables.find(v => v.key === varName && v.enabled);
                varValue = variable ? variable.value : null;
            }

            const range = new monacoRef.current.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
            );

            newDecorations.push({
                range: range,
                options: {
                    inlineClassName: varValue !== null ? "monaco-var-valid" : "monaco-var-invalid",
                    hoverMessage: {
                        value: varValue !== null ? `**Resolved Value:**\n\n${varValue}` : "Unresolved Variable"
                    }
                }
            });
        }

        decorationIdsRef.current = editorRef.current.deltaDecorations(
            decorationIdsRef.current,
            newDecorations
        );
    };

    useEffect(() => {
        updateDecorations();
    }, [value, environments, selectedEnvId, bodyType]);

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Add custom styles for variables
        const style = document.createElement("style");
        style.innerHTML = `
            .monaco-var-valid {
                color: #059669 !important;
                background: rgba(16, 185, 129, 0.1);
                border-bottom: 1px dashed #10b981;
                font-weight: bold;
            }
            .monaco-var-invalid {
                color: #dc2626 !important;
                background: rgba(239, 68, 68, 0.1);
                border-bottom: 1px dashed #ef4444;
            }
        `;
        document.head.appendChild(style);

        updateDecorations();
    };

    const updateFormDataItem = (
        index: number,
        field: "key" | "value",
        newValue: string
    ) => {
        const newFormData = [...formData];
        newFormData[index][field] = newValue;

        // Auto-expand
        const isLastRow = index === formData.length - 1;
        const lastRowHasContent =
            newFormData[index].key || newFormData[index].value;

        if (isLastRow && newValue.length > 0 && lastRowHasContent) {
            newFormData.push({ key: "", value: "", enabled: true });
        }

        setFormData(newFormData);

        // Update parent with JSON representation
        const jsonStr = formDataToJson(newFormData);
        onChange(jsonStr);
    };

    const removeFormDataItem = (index: number) => {
        if (formData.length > 1) {
            const newFormData = formData.filter((_, i) => i !== index);
            setFormData(newFormData);
            onChange(formDataToJson(newFormData));
        } else {
            const cleared = [{ key: "", value: "", enabled: true }];
            setFormData(cleared);
            onChange("");
        }
    };

    const formatJson = async (text: string) => {
        try {
            const formatted = await prettier.format(text, {
                parser: "json",
                plugins: [parserBabel, parserEstree],
                tabWidth: 4,
            });
            return formatted;
        } catch (e) {
            return text; // Return original if invalid
        }
    };

    const handleFormat = async () => {
        const formatted = await formatJson(value);
        onChange(formatted);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Request Body</span>
                    {!isValidJson && bodyType === "json" && value.trim() !== "" && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} />
                            Invalid JSON
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {bodyType === "json" && (
                        <button
                            onClick={handleFormat}
                            className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            title="Prettify JSON"
                        >
                            Prettify
                        </button>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => handleTypeChange("json")}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${bodyType === "json"
                                ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            JSON
                        </button>
                        <button
                            onClick={() => handleTypeChange("formdata")}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${bodyType === "formdata"
                                ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            Form Data
                        </button>
                        <button
                            onClick={() => handleTypeChange("text")}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${bodyType === "text"
                                ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                }`}
                        >
                            Text
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-lg overflow-hidden bg-white min-h-[200px]">
                {bodyType === "formdata" ? (
                    <div>
                        <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                            <span className="text-xs font-medium text-slate-600">Key</span>
                            <span className="text-xs font-medium text-slate-600">Value</span>
                            <span></span>
                        </div>
                        {formData.map((item, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0"
                            >
                                <VariableInput
                                    value={item.key}
                                    onChange={(newValue) =>
                                        updateFormDataItem(index, "key", newValue)
                                    }
                                    placeholder="key"
                                    className="text-sm font-mono"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                                <VariableInput
                                    value={item.value}
                                    onChange={(newValue) =>
                                        updateFormDataItem(index, "value", newValue)
                                    }
                                    placeholder="value"
                                    className="text-sm font-mono"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                                <button
                                    onClick={() => removeFormDataItem(index)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Editor
                        height="100%"
                        defaultLanguage={bodyType === "json" ? "json" : "plaintext"}
                        language={bodyType === "json" ? "json" : "plaintext"}
                        value={value}
                        onChange={(val) => onChange(val || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            scrollBeyondLastLine: false,
                            wordWrap: "on",
                            padding: { top: 10, bottom: 10 },
                            automaticLayout: true,
                            tabSize: 4,
                            readOnly: false,
                        }}
                        onMount={handleEditorMount}
                        theme="light"
                    />
                )}
            </div>
        </div>
    );
}

export default BodyEditor;
