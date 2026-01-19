import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export type AuthType = "none" | "bearer" | "basic" | "api-key";

interface AuthEditorProps {
    authType: AuthType;
    authData: Record<string, string>;
    onChange: (type: AuthType, data: Record<string, string>) => void;
}

function AuthEditor({ authType, authData, onChange }: AuthEditorProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleTypeChange = (type: AuthType) => {
        onChange(type, authData);
    };

    const handleDataChange = (key: string, value: string) => {
        onChange(authType, { ...authData, [key]: value });
    };

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Authentication</h4>
                <select
                    value={authType}
                    onChange={(e) => handleTypeChange(e.target.value as AuthType)}
                    className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="api-key">API Key</option>
                </select>
            </div>

            {authType === "bearer" && (
                <div className="max-w-md">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Token</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={authData.token || ""}
                            onChange={(e) => handleDataChange("token", e.target.value)}
                            placeholder="Enter bearer token"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                        />
                    </div>
                </div>
            )}

            {authType === "basic" && (
                <div className="max-w-md space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                        <input
                            type="text"
                            value={authData.username || ""}
                            onChange={(e) => handleDataChange("username", e.target.value)}
                            placeholder="Username"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={authData.password || ""}
                                onChange={(e) => handleDataChange("password", e.target.value)}
                                placeholder="Password"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400 pr-10"
                            />
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {authType === "api-key" && (
                <div className="max-w-md space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Key</label>
                        <input
                            type="text"
                            value={authData.key || ""}
                            onChange={(e) => handleDataChange("key", e.target.value)}
                            placeholder="Key"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
                        <input
                            type="text"
                            value={authData.value || ""}
                            onChange={(e) => handleDataChange("value", e.target.value)}
                            placeholder="Value"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Add to</label>
                        <select
                            value={authData.addTo || "header"}
                            onChange={(e) => handleDataChange("addTo", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400"
                        >
                            <option value="header">Header</option>
                            <option value="query">Query Params</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuthEditor;
