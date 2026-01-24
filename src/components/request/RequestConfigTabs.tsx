import { useState, useEffect } from "react";
import BodyEditor, { BodyType } from "../shared/BodyEditor";
import HeadersEditor, { Header } from "../shared/HeadersEditor";
import ParamsEditor, { Param } from "../shared/ParamsEditor";
import AuthEditor, { AuthType } from "../shared/AuthEditor";
import ExtractEditor, { ExtractRule } from "../shared/ExtractEditor";
import { Environment } from "../../api";

export type { BodyType };
export type { ExtractRule };

interface RequestConfigTabsProps {
    body: string;
    onBodyChange: (body: string) => void;
    headers: Header[];
    onHeadersChange: (headers: Header[]) => void;
    params: Param[];
    onParamsChange: (params: Param[]) => void;
    method: string;
    environments: Environment[];
    selectedEnvId: string | null;
    onUpdateVariable?: (name: string, newValue: string) => void;
    onBodyTypeChange?: (type: BodyType) => void;
    authType?: AuthType;
    authData?: Record<string, string>;
    onAuthChange?: (type: AuthType, data: Record<string, string>) => void;
    extractRules?: ExtractRule[];
    onExtractRulesChange?: (rules: ExtractRule[]) => void;
    variant?: "default" | "compact";
    className?: string;
}

function RequestConfigTabs({
    body,
    onBodyChange,
    headers,
    onHeadersChange,
    params,
    onParamsChange,
    method,
    environments,
    selectedEnvId,
    onUpdateVariable,
    onBodyTypeChange,
    authType,
    authData,
    onAuthChange,
    extractRules,
    onExtractRulesChange,
    variant = "default",
    className = "",
}: RequestConfigTabsProps) {
    const [activeTab, setActiveTab] = useState("Body");

    const getVisibleTabs = () => {
        const hasAuth = onAuthChange !== undefined;
        const hasExtract = onExtractRulesChange !== undefined;

        let tabs: string[];
        if (method === "GET") {
            tabs = hasAuth ? ["Params", "Headers", "Auth"] : ["Params", "Headers"];
        } else {
            tabs = hasAuth ? ["Body", "Headers", "Auth"] : ["Body", "Headers"];
        }

        if (hasExtract) {
            tabs.push("Extract");
        }

        return tabs;
    };

    const visibleTabs = getVisibleTabs();

    // Ensure active tab is valid when method changes
    useEffect(() => {
        if (!visibleTabs.includes(activeTab)) {
            setActiveTab(visibleTabs[0]);
        }
    }, [method, visibleTabs, activeTab]);

    const containerClass = variant === "compact"
        ? "bg-white border border-slate-200 rounded-lg flex flex-col flex-1 min-h-0"
        : "bg-white rounded-xl border border-slate-200 mb-4 h-full flex flex-col";

    return (
        <div className={`${containerClass} ${className}`}>
            <div className={`border-b border-slate-${variant === "compact" ? "200" : "100"} px-4 shrink-0`}>
                <div className="flex gap-1">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab
                                ? "text-blue-600 border-blue-500"
                                : "text-slate-500 border-transparent hover:text-slate-700"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex flex-col min-h-0">
                {activeTab === "Body" && (
                    <div className="flex-1 flex flex-col min-h-0 h-full">
                        <BodyEditor
                            value={body}
                            onChange={onBodyChange}
                            environments={environments}
                            selectedEnvId={selectedEnvId}
                            onBodyTypeChange={onBodyTypeChange}
                            onUpdateVariable={onUpdateVariable}
                        />
                    </div>
                )}

                {activeTab === "Headers" && (
                    <HeadersEditor
                        headers={headers}
                        onChange={onHeadersChange}
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                        onUpdateVariable={onUpdateVariable}
                    />
                )}

                {activeTab === "Params" && (
                    <div className="flex-1 flex flex-col min-h-0 h-full">
                        <ParamsEditor
                            params={params}
                            onChange={onParamsChange}
                            environments={environments}
                            selectedEnvId={selectedEnvId}
                            onUpdateVariable={onUpdateVariable}
                        />
                    </div>
                )}

                {activeTab === "Auth" && onAuthChange && (
                    <AuthEditor
                        authType={authType || "none"}
                        authData={authData || {}}
                        onChange={onAuthChange}
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                        onUpdateVariable={onUpdateVariable}
                    />
                )}

                {activeTab === "Extract" && onExtractRulesChange && (
                    <ExtractEditor
                        rules={extractRules || [{ variable: "", path: "", enabled: true }]}
                        onChange={onExtractRulesChange}
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                        onUpdateVariable={onUpdateVariable}
                    />
                )}
            </div>
        </div>
    );
}

export default RequestConfigTabs;
