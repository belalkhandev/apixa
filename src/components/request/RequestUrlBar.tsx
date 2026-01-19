import { Send, Loader2 } from "lucide-react";
import MethodSelector from "../shared/MethodSelector";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestUrlBarProps {
    method: HttpMethod;
    url: string;
    onMethodChange: (method: HttpMethod) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    isSending: boolean;
}

function RequestUrlBar({
    method,
    url,
    onMethodChange,
    onUrlChange,
    onSend,
    isSending,
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

                <input
                    type="text"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter request URL (e.g., https://api.example.com/users)"
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                />

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
