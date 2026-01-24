import { useState } from "react";
import { Eye, EyeOff, Pin } from "lucide-react";
import { Environment } from "../../api";
import VariableInput from "./VariableInput";

export type AuthType = "none" | "bearer" | "basic" | "api-key";

interface AuthEditorProps {
    authType: AuthType;
    authData: Record<string, any>;
    onChange: (type: AuthType, data: Record<string, any>) => void;
    environments?: Environment[];
    selectedEnvId?: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

function AuthEditor({
    authType,
    authData,
    onChange,
    environments = [],
    selectedEnvId = null,
    onUpdateVariable,
}: AuthEditorProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleTypeChange = (type: AuthType) => {
        onChange(type, authData);
    };

    const handleDataChange = (key: string, value: any) => {
        onChange(authType, { ...authData, [key]: value });
    };

    const togglePinned = (key: string) => {
        const pinKey = `${key}_pinned`;
        handleDataChange(pinKey, !authData[pinKey]);
    };

    const inputClassName = "w-full border border-slate-200 rounded-lg focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 h-[38px]";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Auth Type</label>
                    <select
                        value={authType}
                        onChange={(e) => handleTypeChange(e.target.value as AuthType)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all font-medium"
                    >
                        <option value="none">No Authentication</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="api-key">API Key</option>
                    </select>
                </div>
            </div>

            <div className="h-px bg-slate-100" />

            {authType === "none" && (
                <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                    <p className="text-sm text-slate-500 font-medium italic">No authentication required for this request.</p>
                </div>
            )}

            {authType === "bearer" && (
                <div className="space-y-4 max-w-lg">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Token</label>
                            <div className={inputClassName}>
                                <VariableInput
                                    value={authData.token || ""}
                                    onChange={(value) => handleDataChange("token", value)}
                                    placeholder="Enter bearer token or {{variable}}"
                                    className="px-3 h-full"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => togglePinned("token")}
                            className={`flex items-center justify-center w-10 h-[38px] rounded-lg border transition-all active:scale-95 ${authData.token_pinned
                                ? "bg-blue-50 border-blue-200 text-blue-600"
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                }`}
                            title={authData.token_pinned ? "Pin active (Auto-sync to variable enabled)" : "Pin to environment variable"}
                        >
                            {authData.token_pinned ? <Pin size={18} fill="currentColor" /> : <Pin size={18} />}
                        </button>
                    </div>

                    {authData.token_pinned && (
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                            <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 pl-1">Extract Path from Response</label>
                            <input
                                type="text"
                                value={authData.token_path || ""}
                                onChange={(e) => handleDataChange("token_path", e.target.value)}
                                placeholder="e.g., token, data.access_token"
                                className="w-full h-[34px] px-3 bg-white border border-blue-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 placeholder:text-blue-200 font-mono"
                            />
                            <p className="mt-2 text-[10px] text-blue-500 font-medium">
                                When you run this request, Apixa will extract the value from the response and update the variable in the input above.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {authType === "basic" && (
                <div className="max-w-md space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Username</label>
                        <div className={inputClassName}>
                            <VariableInput
                                value={authData.username || ""}
                                onChange={(value) => handleDataChange("username", value)}
                                placeholder="Username or {{variable}}"
                                className="px-3 h-full"
                                environments={environments}
                                selectedEnvId={selectedEnvId}
                                onUpdateVariable={onUpdateVariable}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Password</label>
                        <div className="relative">
                            <div className={`${inputClassName} pr-10`}>
                                <VariableInput
                                    value={authData.password || ""}
                                    onChange={(value) => handleDataChange("password", value)}
                                    placeholder="Password or {{variable}}"
                                    className="px-3 h-full"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                            </div>
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-20"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {authType === "api-key" && (
                <div className="max-w-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Key</label>
                            <div className={inputClassName}>
                                <VariableInput
                                    value={authData.key || ""}
                                    onChange={(value) => handleDataChange("key", value)}
                                    placeholder="Key or {{variable}}"
                                    className="px-3 h-full"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Add to</label>
                            <select
                                value={authData.addTo || "header"}
                                onChange={(e) => handleDataChange("addTo", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg h-[38px] text-sm text-slate-600 focus:outline-none focus:border-blue-400 transition-all font-medium"
                            >
                                <option value="header">Header</option>
                                <option value="query">Query Params</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Value</label>
                            <div className={inputClassName}>
                                <VariableInput
                                    value={authData.value || ""}
                                    onChange={(value) => handleDataChange("value", value)}
                                    placeholder="Value or {{variable}}"
                                    className="px-3 h-full"
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    onUpdateVariable={onUpdateVariable}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => togglePinned("value")}
                            className={`flex items-center justify-center w-10 h-[38px] rounded-lg border transition-all active:scale-95 ${authData.value_pinned
                                ? "bg-blue-50 border-blue-200 text-blue-600"
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                }`}
                            title={authData.value_pinned ? "Pin active (Auto-sync enabled)" : "Pin to environment variable"}
                        >
                            {authData.value_pinned ? <Pin size={18} fill="currentColor" /> : <Pin size={18} />}
                        </button>
                    </div>

                    {authData.value_pinned && (
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                            <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 pl-1">Extract Path from Response</label>
                            <input
                                type="text"
                                value={authData.value_path || ""}
                                onChange={(e) => handleDataChange("value_path", e.target.value)}
                                placeholder="e.g., token, data.access_token"
                                className="w-full h-[34px] px-3 bg-white border border-blue-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 placeholder:text-blue-200 font-mono"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AuthEditor;
