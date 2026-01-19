import { Send, Loader2 } from "lucide-react";
import MethodSelector from "../shared/MethodSelector";
import VariableInput from "../shared/VariableInput";
import { Environment } from "../../api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestUrlBarProps {
    method: HttpMethod;
    url: string;
    onMethodChange: (method: HttpMethod) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    isSending: boolean;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function RequestUrlBar({
    method,
    url,
    onMethodChange,
    onUrlChange,
    onSend,
    isSending,
    environments,
    selectedEnvId,
    onUpdateVariable,
}: RequestUrlBarProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onSend();
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="flex gap-2">
                <MethodSelector value={method} onChange={onMethodChange} />

                <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-all h-[42px]">
                    <VariableInput
                        value={url}
                        onChange={onUrlChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter request URL (e.g., https://api.example.com/users)"
                        className="px-4 h-full"
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                        onUpdateVariable={onUpdateVariable}
                    />
                </div>

                <button
                    onClick={onSend}
                    disabled={isSending}
                    className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send
                </button>
            </div>
        </div>
    );
}

export default RequestUrlBar;
