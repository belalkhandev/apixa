import { useState } from "react";
import BodyEditor from "../shared/BodyEditor";
import HeadersEditor, { Header } from "../shared/HeadersEditor";

interface RequestConfigTabsProps {
    body: string;
    onBodyChange: (body: string) => void;
    headers: Header[];
    onHeadersChange: (headers: Header[]) => void;
    method: string;
}

function RequestConfigTabs({
    body,
    onBodyChange,
    headers,
    onHeadersChange,
    method,
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
        <div className="bg-white rounded-xl border border-slate-200 mb-4">
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

            <div className="p-4">
                {activeTab === "Body" && (
                    <BodyEditor value={body} onChange={onBodyChange} />
                )}

                {activeTab === "Headers" && (
                    <HeadersEditor headers={headers} onChange={onHeadersChange} />
                )}

                {activeTab === "Params" && (
                    <div className="p-4 text-slate-500 text-center">
                        Query Params Editor (Coming Soon)
                    </div>
                )}
            </div>
        </div>
    );
}

export default RequestConfigTabs;
