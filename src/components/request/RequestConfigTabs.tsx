import { useState } from "react";
import BodyEditor from "../shared/BodyEditor";
import HeadersEditor, { Header } from "../shared/HeadersEditor";

interface RequestConfigTabsProps {
    body: string;
    onBodyChange: (body: string) => void;
    headers: Header[];
    onHeadersChange: (headers: Header[]) => void;
}

function RequestConfigTabs({
    body,
    onBodyChange,
    headers,
    onHeadersChange,
}: RequestConfigTabsProps) {
    const [activeTab, setActiveTab] = useState("Body");
    const tabs = ["Body", "Headers"];

    return (
        <div className="bg-white rounded-xl border border-slate-200 mb-4">
            <div className="border-b border-slate-100 px-4">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
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
            </div>
        </div>
    );
}

export default RequestConfigTabs;
