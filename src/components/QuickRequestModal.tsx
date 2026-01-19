import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  ChevronDown,
  Copy,
  Check,
  WrapText,
  Loader2,
  Plus,
  Save,
  Folder,
  FolderPlus,
} from "lucide-react";
import { api, Collection } from "../api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ResponseData {
  status: number;
  statusText: string;
  time: number;
  size: string;
  headers: Record<string, string>;
  body: string;
}

interface QuickRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToCollection: (collectionId: string) => void;
  collections: Collection[];
  onCreateCollection: (name: string, description: string) => void;
}

const methodColors: Record<HttpMethod, string> = {
  GET: "text-emerald-600",
  POST: "text-amber-600",
  PUT: "text-blue-600",
  PATCH: "text-purple-600",
  DELETE: "text-red-600",
};

const statusColors: Record<string, string> = {
  "2": "text-emerald-600 bg-emerald-50",
  "3": "text-blue-600 bg-blue-50",
  "4": "text-amber-600 bg-amber-50",
  "5": "text-red-600 bg-red-50",
};

function QuickRequestModal({
  isOpen,
  onClose,
  onSaveToCollection,
  collections,
}: QuickRequestModalProps) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [requestName, setRequestName] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBeautified, setIsBeautified] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSendRequest = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    setIsSending(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const requestHeaders: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) {
          requestHeaders[h.key] = h.value;
        }
      });

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (method !== "GET" && method !== "DELETE" && requestBody) {
        fetchOptions.body = requestBody;
        if (!requestHeaders["Content-Type"]) {
          requestHeaders["Content-Type"] = "application/json";
        }
      }

      const res = await fetch(url, fetchOptions);
      const endTime = performance.now();

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const bodyText = await res.text();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: Math.round(endTime - startTime),
        size: formatBytes(new Blob([bodyText]).size),
        headers: responseHeaders,
        body: bodyText,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  };

  const formatJson = (text: string): string => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number): string => {
    const firstDigit = String(status)[0];
    return statusColors[firstDigit] || "text-slate-600 bg-slate-100";
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    if (headers.length > 1) {
      setHeaders(headers.filter((_, i) => i !== index));
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    try {
      const name = requestName || url.split("/").pop() || "New Request";
      const newRequest = await api.createRequest(collectionId, name, method, url);

      const filteredHeaders = headers.filter((h) => h.key.trim() !== "");
      if (requestBody || filteredHeaders.length > 0) {
        await api.updateRequest(
          newRequest.id,
          name,
          method,
          url,
          requestBody || null,
          filteredHeaders.map((h) => ({ key: h.key, value: h.value, enabled: true })),
          []
        );
      }

      onSaveToCollection(collectionId);
      handleClose();
    } catch (err) {
      console.error("Failed to save request:", err);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const newCollection = await api.createCollection(newCollectionName.trim());
      await handleSaveToCollection(newCollection.id);
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  const handleClose = () => {
    setMethod("GET");
    setUrl("");
    setRequestName("");
    setRequestBody("");
    setHeaders([{ key: "", value: "" }]);
    setResponse(null);
    setError(null);
    setShowSaveOptions(false);
    setIsCreatingCollection(false);
    setNewCollectionName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-900/30 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Request name (optional)"
                  className="text-lg font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowSaveOptions(!showSaveOptions)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Save size={14} />
                    Save
                    <ChevronDown size={14} />
                  </button>

                  <AnimatePresence>
                    {showSaveOptions && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10"
                      >
                        {!isCreatingCollection ? (
                          <>
                            <div className="p-2 border-b border-slate-100">
                              <p className="text-xs font-medium text-slate-500 px-2 py-1">
                                Save to Collection
                              </p>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-2">
                              {collections.length > 0 ? (
                                collections.map((collection) => (
                                  <button
                                    key={collection.id}
                                    onClick={() => handleSaveToCollection(collection.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                  >
                                    <Folder size={14} className="text-amber-500" />
                                    {collection.name}
                                  </button>
                                ))
                              ) : (
                                <p className="px-3 py-2 text-sm text-slate-500">
                                  No collections yet
                                </p>
                              )}
                            </div>
                            <div className="p-2 border-t border-slate-100">
                              <button
                                onClick={() => setIsCreatingCollection(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <FolderPlus size={14} />
                                New Collection
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="p-3">
                            <input
                              type="text"
                              value={newCollectionName}
                              onChange={(e) => setNewCollectionName(e.target.value)}
                              placeholder="Collection name"
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 mb-2"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIsCreatingCollection(false)}
                                className="flex-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleCreateAndSave}
                                disabled={!newCollectionName.trim()}
                                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                              >
                                Create & Save
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* URL Bar */}
              <div className="flex gap-2 mb-4">
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as HttpMethod)}
                    className={`appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-400 ${methodColors[method]}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                  placeholder="https://api.example.com/users"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                />

                <button
                  onClick={handleSendRequest}
                  disabled={isSending}
                  className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send
                </button>
              </div>

              {/* Tabs */}
              <div className="border border-slate-200 rounded-xl mb-4">
                <div className="border-b border-slate-100 px-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveTab("body")}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "body"
                          ? "text-blue-600 border-blue-500"
                          : "text-slate-500 border-transparent hover:text-slate-700"
                        }`}
                    >
                      Body
                    </button>
                    <button
                      onClick={() => setActiveTab("headers")}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "headers"
                          ? "text-blue-600 border-blue-500"
                          : "text-slate-500 border-transparent hover:text-slate-700"
                        }`}
                    >
                      Headers
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {activeTab === "body" && (
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="w-full h-28 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none"
                    />
                  )}

                  {activeTab === "headers" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Request Headers</span>
                        <button
                          onClick={addHeader}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {headers.map((header, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={header.key}
                              onChange={(e) => updateHeader(index, "key", e.target.value)}
                              placeholder="Header"
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                            />
                            <input
                              type="text"
                              value={header.value}
                              onChange={(e) => updateHeader(index, "value", e.target.value)}
                              placeholder="Value"
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                            />
                            <button
                              onClick={() => removeHeader(index)}
                              className="px-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}

              {/* Response */}
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 rounded-xl"
                >
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">Response</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(
                          response.status
                        )}`}
                      >
                        {response.status} {response.statusText}
                      </span>
                      <span className="text-xs text-slate-500">{response.time}ms</span>
                      <span className="text-xs text-slate-500">{response.size}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsBeautified(!isBeautified)}
                        className={`p-1.5 rounded transition-colors ${isBeautified
                            ? "bg-blue-100 text-blue-600"
                            : "text-slate-400 hover:bg-slate-100"
                          }`}
                      >
                        <WrapText size={14} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(response.body)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="text-sm font-mono text-slate-700 bg-slate-50 p-3 rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                      {isBeautified ? formatJson(response.body) : response.body}
                    </pre>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QuickRequestModal;
