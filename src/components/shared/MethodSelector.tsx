import { ChevronDown } from "lucide-react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface MethodSelectorProps {
    value: HttpMethod;
    onChange: (method: HttpMethod) => void;
    className?: string;
}

const methodColors: Record<HttpMethod, string> = {
    GET: "text-emerald-600",
    POST: "text-amber-600",
    PUT: "text-blue-600",
    PATCH: "text-purple-600",
    DELETE: "text-red-600",
};

function MethodSelector({ value, onChange, className = "" }: MethodSelectorProps) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as HttpMethod)}
                className={`appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-400 ${methodColors[value]} ${className}`}
            >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
}

export default MethodSelector;
