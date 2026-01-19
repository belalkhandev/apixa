import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Settings,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  Globe,
} from "lucide-react";
import { Environment } from "../api";

interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

interface EnvironmentManagerProps {
  environments: Environment[];
  selectedEnvId: string | null;
  onSelectEnv: (envId: string | null) => void;
  onCreateEnv: (envData: { name: string; variables: { key: string; value: string; enabled: boolean }[] }) => void;
  onUpdateEnv: (envData: { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] }) => void;
  onDeleteEnv: (envId: string) => void;
}

function EnvironmentManager({
  environments,
  selectedEnvId,
  onSelectEnv,
  onCreateEnv,
  onUpdateEnv,
  onDeleteEnv,
}: EnvironmentManagerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [envName, setEnvName] = useState("");
  const [variables, setVariables] = useState<EnvironmentVariable[]>([
    { key: "", value: "", enabled: true },
  ]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const handleOpenCreate = () => {
    setEditingEnv(null);
    setEnvName("");
    setVariables([{ key: "", value: "", enabled: true }]);
    setShowModal(true);
    setShowDropdown(false);
  };

  const handleOpenEdit = (env: Environment) => {
    setEditingEnv(env);
    setEnvName(env.name);
    setVariables(env.variables.length > 0
      ? env.variables.map(v => ({ key: v.key, value: v.value, enabled: v.enabled }))
      : [{ key: "", value: "", enabled: true }]);
    setShowModal(true);
    setShowDropdown(false);
  };

  const handleSave = () => {
    if (!envName.trim()) return;

    const filteredVars = variables.filter((v) => v.key.trim() !== "");

    if (editingEnv) {
      onUpdateEnv({
        id: editingEnv.id,
        name: envName.trim(),
        variables: filteredVars,
      });
    } else {
      onCreateEnv({
        name: envName.trim(),
        variables: filteredVars,
      });
    }

    setShowModal(false);
  };

  const addVariable = () => {
    setVariables([...variables, { key: "", value: "", enabled: true }]);
  };

  const updateVariable = (index: number, field: keyof EnvironmentVariable, value: string | boolean) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: value };
    setVariables(newVars);
  };

  const removeVariable = (index: number) => {
    if (variables.length > 1) {
      setVariables(variables.filter((_, i) => i !== index));
    }
  };

  const handleDelete = (envId: string) => {
    onDeleteEnv(envId);
    if (selectedEnvId === envId) {
      onSelectEnv(null);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Globe size={14} className="text-slate-400" />
          {selectedEnv ? selectedEnv.name : "No Environment"}
          <ChevronDown size={14} className="text-slate-400" />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg overflow-hidden z-20"
            >
              <div className="p-2 border-b border-slate-200">
                <span className="text-xs font-medium text-slate-500 uppercase">Environments</span>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onSelectEnv(null);
                    setShowDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    !selectedEnvId ? "text-blue-600 bg-blue-50" : "text-slate-600"
                  }`}
                >
                  <span>No Environment</span>
                  {!selectedEnvId && <Check size={14} />}
                </button>

                {environments.map((env) => (
                  <div
                    key={env.id}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors ${
                      selectedEnvId === env.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectEnv(env.id);
                        setShowDropdown(false);
                      }}
                      className={`flex-1 text-left text-sm ${
                        selectedEnvId === env.id ? "text-blue-600" : "text-slate-600"
                      }`}
                    >
                      {env.name}
                      <span className="text-xs text-slate-400 ml-2">
                        ({env.variables.length} vars)
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(env);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(env.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-200">
                <button
                  onClick={handleOpenCreate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={14} />
                  New Environment
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg w-full max-w-lg mx-4 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Settings size={18} className="text-slate-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {editingEnv ? "Edit Environment" : "New Environment"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={envName}
                    onChange={(e) => setEnvName(e.target.value)}
                    placeholder="e.g., Development, Staging, Production"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Variables
                    </label>
                    <button
                      onClick={addVariable}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add Variable
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-medium text-slate-600">Variable</span>
                      <span className="text-xs font-medium text-slate-600">Value</span>
                      <span></span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {variables.map((variable, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0"
                        >
                          <input
                            type="text"
                            value={variable.key}
                            onChange={(e) => updateVariable(index, "key", e.target.value)}
                            placeholder="BASE_URL"
                            className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={variable.value}
                            onChange={(e) => updateVariable(index, "value", e.target.value)}
                            placeholder="https://api.example.com"
                            className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                          />
                          <button
                            onClick={() => removeVariable(index)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Use variables in URLs like: {"{{BASE_URL}}"}/users
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!envName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingEnv ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EnvironmentManager;
