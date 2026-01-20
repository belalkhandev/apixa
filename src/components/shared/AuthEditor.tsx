import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Environment } from "../../api";
import VariableInput from "./VariableInput";

export type AuthType = "none" | "bearer" | "basic" | "api-key";

interface AuthEditorProps {
    authType: AuthType;
    authData: Record<string, string>;
    onChange: (type: AuthType, data: Record<string, string>) => void;
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

    const handleDataChange = (key: string, value: string) => {
        onChange(authType, { ...authData, [key]: value });
    };

    const inputClassName = "w-full border border-slate-200 rounded-lg focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 h-[38px]";

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
            )}

            {authType === "basic" && (
                <div className="max-w-md space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
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
                        <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
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
                <div className="max-w-md space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Key</label>
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
                        <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
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
