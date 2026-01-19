import { useState } from "react";
import BodyEditor from "../shared/BodyEditor";
import HeadersEditor, { Header } from "../shared/HeadersEditor";
import ParamsEditor, { Param } from "../shared/ParamsEditor";
import { Environment } from "../../api";

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
}: RequestConfigTabsProps) {
    const [activeTab, setActiveTab] = useState("Body");
    const tabs = ["Body", "Headers", "Params"];

    // Hide Params for POST, PUT, PATCH if needed, or inversely hide Body for GET?
    // User asked: "for post and pust request no need to appear params tabs in request body"
    // Usually POST/PUT *have* body, and Params (query) are less emphasized but possible.
    // If user means "don't show Params tab when Body is relevant", we can filter `tabs`.

    // Let's interpret "no need to appear params tabs" literally for POST/PUT.
    const visibleTabs = tabs.filter(tab => {
        if (tab === "Params" && ["POST", "PUT", "PATCH"].includes(method)) {
            return false;
        }
        return true;
    });

    // Ensure active tab is valid
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0]);
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 mb-4 h-full flex flex-col">
            <div className="border-b border-slate-100 px-4">
                <div className="flex gap-1">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab
                                ? "text-blue-600 border-blue-500"
                                : "text-slate-500 border-transparent hover:text-slate-700"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 flex-1 overflow-auto">
                {activeTab === "Body" && (
                    <BodyEditor
                        value={body}
                        onChange={onBodyChange}
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                    />
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
                    <ParamsEditor
                        params={params}
                        onChange={onParamsChange}
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
