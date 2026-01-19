import { Home, Zap, Save } from "lucide-react";
import { Environment } from "../../api";
import EnvironmentManager from "../EnvironmentManager";

interface RequestHeaderProps {
    requestName: string;
    onRequestNameChange: (name: string) => void;
    environments: Environment[];
    selectedEnvId: string | null;
    onSelectEnv: (id: string | null) => void;
    onCreateEnv: (data: { name: string; variables: { key: string; value: string; enabled: boolean }[] }) => void;
    onUpdateEnv: (data: { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] }) => void;
    onDeleteEnv: (id: string) => void;
    onSave: () => void;
    onBack: () => void;
}

function RequestHeader({
    requestName,
    onRequestNameChange,
    environments,
    selectedEnvId,
    onSelectEnv,
    onCreateEnv,
    onUpdateEnv,
    onDeleteEnv,
    onSave,
    onBack,
}: RequestHeaderProps) {
    return (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Back to Home"
                    >
                        <Home size={18} className="text-slate-500" />
                    </button>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <Zap size={18} className="text-emerald-500" />
                        <input
                            type="text"
                            value={requestName}
                            onChange={(e) => onRequestNameChange(e.target.value)}
                            className="text-lg font-semibold text-slate-800 bg-transparent focus:outline-none"
                            placeholder="Request name"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Environment Manager */}
                    <EnvironmentManager
                        environments={environments}
                        selectedEnvId={selectedEnvId}
                        onSelectEnv={onSelectEnv}
                        onCreateEnv={onCreateEnv}
                        onUpdateEnv={onUpdateEnv}
                        onDeleteEnv={onDeleteEnv}
                    />

                    {/* Save Button */}
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <Save size={14} />
                        Save to Collection
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RequestHeader;
